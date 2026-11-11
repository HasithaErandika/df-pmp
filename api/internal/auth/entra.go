package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/dialog-finance/df-pmp/api/internal/session"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
)

const (
	SessionCookie = "dfpmp_session"
	loginCookie   = "dfpmp_login"
	loginPurpose  = "oidc-login"
)

// Entra signs users in with Microsoft Entra ID (authorization code + PKCE) and keeps tokens server-side.
type Entra struct {
	Pool        *pgxpool.Pool
	Sessions    session.Store
	OAuth       *oauth2.Config
	Issuer      string // https://login.microsoftonline.com/{tenant}/v2.0
	TenantID    string
	WebOrigin   string
	Secure      bool
	Provisioner Provisioner

	once     sync.Mutex
	verifier *oidc.IDTokenVerifier
}

type loginState struct{ State, Nonce, Verifier, ReturnTo string }

func (e *Entra) idVerifier(ctx context.Context) (*oidc.IDTokenVerifier, error) {
	e.once.Lock()
	defer e.once.Unlock()
	if e.verifier == nil {
		provider, err := oidc.NewProvider(ctx, e.Issuer)
		if err != nil {
			return nil, fmt.Errorf("discover Entra ID: %w", err)
		}
		e.verifier = provider.Verifier(&oidc.Config{ClientID: e.OAuth.ClientID})
	}
	return e.verifier, nil
}

// Login redirects the browser to Microsoft. ?returnTo=/path is restored after sign-in.
func (e *Entra) Login(w http.ResponseWriter, r *http.Request) {
	returnTo := r.URL.Query().Get("returnTo")
	if !strings.HasPrefix(returnTo, "/") || strings.HasPrefix(returnTo, "//") {
		returnTo = "/"
	}
	st := loginState{State: session.RandomToken(24), Nonce: session.RandomToken(24), Verifier: oauth2.GenerateVerifier(), ReturnTo: returnTo}
	raw, _ := json.Marshal(st)
	sealed, err := e.Sessions.Sealer.SealString(string(raw), loginPurpose)
	if err != nil {
		e.fail(w, r, "signin_failed", err)
		return
	}
	http.SetCookie(w, e.cookie(loginCookie, sealed, 10*time.Minute))
	http.Redirect(w, r, e.OAuth.AuthCodeURL(st.State, oauth2.S256ChallengeOption(st.Verifier),
		oidc.Nonce(st.Nonce), oauth2.SetAuthURLParam("prompt", "select_account")), http.StatusFound)
}

// Callback completes sign-in: validates state, PKCE, nonce, tenant and ID token, then starts a session.
func (e *Entra) Callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	http.SetCookie(w, e.cookie(loginCookie, "", -1))
	if code := q.Get("error"); code != "" {
		e.fail(w, r, "access_denied", errors.New(code+": "+q.Get("error_description")))
		return
	}
	var st loginState
	c, err := r.Cookie(loginCookie)
	if err == nil {
		var raw string
		if raw, err = e.Sessions.Sealer.OpenString(c.Value, loginPurpose); err == nil {
			err = json.Unmarshal([]byte(raw), &st)
		}
	}
	if err != nil || st.State == "" || q.Get("state") != st.State {
		e.fail(w, r, "signin_expired", errors.New("missing or mismatched login state"))
		return
	}
	ctx := r.Context()
	token, err := e.OAuth.Exchange(ctx, q.Get("code"), oauth2.VerifierOption(st.Verifier))
	if err != nil {
		e.fail(w, r, "signin_failed", err)
		return
	}
	identity, err := e.verify(ctx, token, st.Nonce)
	if err != nil {
		e.fail(w, r, "signin_failed", err)
		return
	}
	userID, err := e.Provisioner.Provision(ctx, identity)
	if errors.Is(err, ErrInactive) {
		e.fail(w, r, "account_disabled", err)
		return
	}
	if err != nil {
		e.fail(w, r, "signin_failed", err)
		return
	}
	id, err := e.Sessions.Create(ctx, userID, token)
	if err != nil {
		e.fail(w, r, "signin_failed", err)
		return
	}
	http.SetCookie(w, e.cookie(SessionCookie, id, e.Sessions.TTL))
	http.Redirect(w, r, e.WebOrigin+st.ReturnTo, http.StatusFound)
}

func (e *Entra) verify(ctx context.Context, token *oauth2.Token, nonce string) (Identity, error) {
	rawID, _ := token.Extra("id_token").(string)
	verifier, err := e.idVerifier(ctx)
	if err != nil {
		return Identity{}, err
	}
	idToken, err := verifier.Verify(ctx, rawID)
	if err != nil {
		return Identity{}, err
	}
	if idToken.Nonce != nonce {
		return Identity{}, errors.New("nonce mismatch")
	}
	var claims struct {
		OID, TID, Name, Email string
		PreferredUsername     string `json:"preferred_username"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return Identity{}, err
	}
	if claims.TID != e.TenantID || claims.OID == "" {
		return Identity{}, errors.New("token is not from the configured tenant")
	}
	email := claims.Email
	if email == "" {
		email = claims.PreferredUsername
	}
	return Identity{ObjectID: claims.OID, DisplayName: claims.Name, Email: email}, nil
}

// Logout ends the df-pmp session.
func (e *Entra) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(SessionCookie); err == nil {
		_ = e.Sessions.Delete(r.Context(), c.Value)
	}
	http.SetCookie(w, e.cookie(SessionCookie, "", -1))
	w.WriteHeader(http.StatusNoContent)
}

// Resolve implements Resolver using the session cookie.
func (e *Entra) Resolve(r *http.Request) (*Principal, error) {
	c, err := r.Cookie(SessionCookie)
	if err != nil {
		return nil, ErrUnauthenticated
	}
	sess, err := e.Sessions.Get(r.Context(), c.Value)
	if errors.Is(err, session.ErrNotFound) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, err
	}
	p, err := LoadPrincipal(r.Context(), e.Pool, "u.id = $1", sess.UserID)
	if err != nil {
		return nil, err
	}
	if ts := e.Sessions.TokenSource(r.Context(), sess, e.OAuth); ts != nil {
		p.token, p.Microsoft = ts, "connected"
	}
	return p, nil
}

func (e *Entra) cookie(name, value string, ttl time.Duration) *http.Cookie {
	return sessionCookie(name, value, ttl, e.Secure)
}

func (e *Entra) fail(w http.ResponseWriter, r *http.Request, code string, err error) {
	slog.WarnContext(r.Context(), "entra sign-in failed", "reason", code, "error", err)
	http.Redirect(w, r, e.WebOrigin+"/login?error="+url.QueryEscape(code), http.StatusFound)
}
