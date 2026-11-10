package session

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
)

// ErrNotFound means the session does not exist or has expired.
var ErrNotFound = errors.New("session not found")

const tokenPurpose = "oauth-token"

// Session is an authenticated browser session.
type Session struct {
	ID     string
	UserID int64
	token  *oauth2.Token
}

// Store persists sessions in PostgreSQL.
type Store struct {
	Pool   *pgxpool.Pool
	Sealer *Sealer
	TTL    time.Duration
}

// Create starts a session for a user and returns its opaque ID (the cookie value).
func (s Store) Create(ctx context.Context, userID int64, token *oauth2.Token) (string, error) {
	id := RandomToken(32)
	sealed, err := s.sealToken(token)
	if err != nil {
		return "", err
	}
	_, err = s.Pool.Exec(ctx, `INSERT INTO sessions (id_hash, user_id, expires_at, token_encrypted) VALUES ($1, $2, $3, $4)`,
		hashID(id), userID, time.Now().Add(s.TTL), sealed)
	return id, err
}

// Get loads an unexpired session.
func (s Store) Get(ctx context.Context, id string) (*Session, error) {
	var userID int64
	var sealed []byte
	err := s.Pool.QueryRow(ctx, `SELECT user_id, token_encrypted FROM sessions WHERE id_hash = $1 AND expires_at > now()`,
		hashID(id)).Scan(&userID, &sealed)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	sess := &Session{ID: id, UserID: userID}
	if len(sealed) > 0 {
		plain, err := s.Sealer.Open(sealed, tokenPurpose)
		if err != nil {
			return nil, ErrNotFound // key rotated or tampered: force a new sign-in
		}
		sess.token = new(oauth2.Token)
		if err := json.Unmarshal(plain, sess.token); err != nil {
			return nil, ErrNotFound
		}
	}
	return sess, nil
}

// Delete ends a session.
func (s Store) Delete(ctx context.Context, id string) error {
	_, err := s.Pool.Exec(ctx, "DELETE FROM sessions WHERE id_hash = $1", hashID(id))
	return err
}

// DeleteForUser ends every session of a user (used when an account is deactivated).
func (s Store) DeleteForUser(ctx context.Context, userID int64) error {
	_, err := s.Pool.Exec(ctx, "DELETE FROM sessions WHERE user_id = $1", userID)
	return err
}

// PurgeExpired removes expired sessions.
func (s Store) PurgeExpired(ctx context.Context) error {
	_, err := s.Pool.Exec(ctx, "DELETE FROM sessions WHERE expires_at <= now()")
	return err
}

// TokenSource returns a refreshing source for the session's delegated Microsoft token.
// Refreshed tokens are written back so the next request reuses them.
func (s Store) TokenSource(ctx context.Context, sess *Session, cfg *oauth2.Config) oauth2.TokenSource {
	if sess.token == nil {
		return nil
	}
	return &persistingSource{ctx: context.WithoutCancel(ctx), store: s, sess: sess,
		base: cfg.TokenSource(context.WithoutCancel(ctx), sess.token)}
}

type persistingSource struct {
	mu    sync.Mutex
	ctx   context.Context
	store Store
	sess  *Session
	base  oauth2.TokenSource
}

func (p *persistingSource) Token() (*oauth2.Token, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	token, err := p.base.Token()
	if err != nil {
		return nil, err
	}
	if token.AccessToken != p.sess.token.AccessToken {
		p.sess.token = token
		if sealed, err := p.store.sealToken(token); err == nil {
			_, _ = p.store.Pool.Exec(p.ctx, "UPDATE sessions SET token_encrypted = $2 WHERE id_hash = $1", hashID(p.sess.ID), sealed)
		}
	}
	return token, nil
}

func (s Store) sealToken(token *oauth2.Token) ([]byte, error) {
	if token == nil {
		return nil, nil
	}
	plain, err := json.Marshal(token)
	if err != nil {
		return nil, err
	}
	return s.Sealer.Seal(plain, tokenPurpose)
}
