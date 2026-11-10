// Package microsoft is the single boundary for Microsoft Graph calls (directory, Outlook, SharePoint).
// Domain packages depend on this package's methods, never on raw Graph HTTP requests.
package microsoft

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
)

// ErrNotConnected means the caller has no Microsoft token (e.g. preview sign-in) or Graph is not configured.
var ErrNotConnected = errors.New("microsoft 365 is not connected for this session")

// Error is a Graph API error response.
type Error struct {
	Status  int
	Code    string
	Message string
}

func (e *Error) Error() string { return fmt.Sprintf("graph %d %s: %s", e.Status, e.Code, e.Message) }

// IsStatus reports whether err is a Graph error with the given HTTP status.
func IsStatus(err error, status int) bool {
	var ge *Error
	return errors.As(err, &ge) && ge.Status == status
}

// Client calls Microsoft Graph. App is the application (client-credentials) token source, used only
// for SharePoint Sites.Selected; delegated calls take the signed-in user's token source.
type Client struct {
	BaseURL string
	HTTP    *http.Client
	App     oauth2.TokenSource
}

// NewClient builds a client. App credentials are optional; without them app-only calls return ErrNotConnected.
func NewClient(baseURL, authority, tenantID, clientID, secret string) *Client {
	c := &Client{BaseURL: strings.TrimRight(baseURL, "/"), HTTP: &http.Client{Timeout: 60 * time.Second}}
	if tenantID != "" && clientID != "" && secret != "" {
		cc := clientcredentials.Config{
			ClientID:     clientID,
			ClientSecret: secret,
			TokenURL:     fmt.Sprintf("%s/%s/oauth2/v2.0/token", strings.TrimRight(authority, "/"), tenantID),
			Scopes:       []string{"https://graph.microsoft.com/.default"},
		}
		c.App = cc.TokenSource(context.Background())
	}
	return c
}

type request struct {
	method  string
	path    string // relative to BaseURL, or absolute
	body    any
	raw     io.Reader
	headers map[string]string
	out     any
}

func (c *Client) do(ctx context.Context, ts oauth2.TokenSource, r request) error {
	if ts == nil {
		return ErrNotConnected
	}
	token, err := ts.Token()
	if err != nil {
		return fmt.Errorf("%w: %v", ErrNotConnected, err)
	}
	url := r.path
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		url = c.BaseURL + r.path
	}
	body := r.raw
	if r.body != nil {
		encoded, err := json.Marshal(r.body)
		if err != nil {
			return err
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, r.method, url, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Accept", "application/json")
	if r.body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range r.headers {
		req.Header.Set(key, value)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("graph request: %w", err)
	}
	defer resp.Body.Close()
	return decode(resp, r.out)
}

func decode(resp *http.Response, out any) error {
	if resp.StatusCode >= 300 {
		var payload struct {
			Error struct{ Code, Message string } `json:"error"`
		}
		_ = json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&payload)
		return &Error{Status: resp.StatusCode, Code: payload.Error.Code, Message: payload.Error.Message}
	}
	if out == nil || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// OAuthConfig returns the delegated (authorization code) configuration for the app registration.
func OAuthConfig(authority, tenantID, clientID, secret, redirect string) *oauth2.Config {
	base := fmt.Sprintf("%s/%s/oauth2/v2.0", strings.TrimRight(authority, "/"), tenantID)
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: secret,
		RedirectURL:  redirect,
		Endpoint:     oauth2.Endpoint{AuthURL: base + "/authorize", TokenURL: base + "/token"},
		Scopes:       DelegatedScopes,
	}
}

// DelegatedScopes are requested at sign-in. Admin consent is required for User.ReadBasic.All in most tenants.
var DelegatedScopes = []string{
	"openid", "profile", "email", "offline_access",
	"User.Read", "User.ReadBasic.All", "Calendars.ReadWrite",
}
