package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/dialog-finance/df-pmp/api/internal/session"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DevLogin is the development sign-in used with AUTH_MODE=preview: the sign-in page lists the
// configured roles and one click starts a server-side session as a user holding that role.
// It performs no identity verification and must never be enabled in production.
type DevLogin struct {
	Pool     *pgxpool.Pool
	Sessions session.Store
	Secure   bool
}

// DevRole is a role offered on the development sign-in page with the user it signs in as.
type DevRole struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	User        string `json:"user"`
	Email       string `json:"email"`
}

// Roles lists roles (administrator first) with the first active user who holds each one.
func (d *DevLogin) Roles(w http.ResponseWriter, r *http.Request) {
	httpx.Respond(w, r, http.StatusOK, func() ([]DevRole, error) {
		rows, err := d.Pool.Query(r.Context(), `
			SELECT r.key, r.name, r.description, COALESCE(u.display_name, ''), COALESCE(u.email, '')
			FROM roles r
			LEFT JOIN LATERAL (
				SELECT u.display_name, u.email FROM users u JOIN user_roles ur ON ur.user_id = u.id
				WHERE ur.role_id = r.id AND u.active ORDER BY u.id LIMIT 1
			) u ON TRUE
			ORDER BY r.key <> $1, (SELECT count(*) FROM role_permissions rp WHERE rp.role_id = r.id) DESC, r.name`,
			AdministratorRole)
		if err != nil {
			return nil, err
		}
		return pgx.CollectRows(rows, pgx.RowToStructByPos[DevRole])
	})
}

// Login starts a session for the role in the body ({"role": "project_manager"}). When no active
// user holds the role yet, a demo user is created for it.
func (d *DevLogin) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Role string `json:"role"`
	}
	if err := httpx.Decode(w, r, &in); err != nil {
		httpx.Fail(w, r, err)
		return
	}
	userID, err := d.userForRole(r.Context(), strings.TrimSpace(in.Role))
	if err != nil {
		httpx.Fail(w, r, err)
		return
	}
	id, err := d.Sessions.Create(r.Context(), userID, nil)
	if err != nil {
		httpx.Fail(w, r, err)
		return
	}
	http.SetCookie(w, sessionCookie(SessionCookie, id, d.Sessions.TTL, d.Secure))
	principal, err := LoadPrincipal(r.Context(), d.Pool, "u.id = $1", userID)
	if err != nil {
		httpx.Fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, principal)
}

func (d *DevLogin) userForRole(ctx context.Context, role string) (int64, error) {
	var userID int64
	err := pgx.BeginFunc(ctx, d.Pool, func(tx pgx.Tx) error {
		var roleID int64
		var name string
		err := tx.QueryRow(ctx, "SELECT id, name FROM roles WHERE key = $1", role).Scan(&roleID, &name)
		if errors.Is(err, pgx.ErrNoRows) {
			return &httpx.ValidationError{Fields: map[string]string{"role": "Choose an existing role."}}
		}
		if err != nil {
			return err
		}
		err = tx.QueryRow(ctx, `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id
			WHERE ur.role_id = $1 AND u.active ORDER BY u.id LIMIT 1`, roleID).Scan(&userID)
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		err = tx.QueryRow(ctx, `INSERT INTO users (display_name, email) VALUES ($1, $2)
			ON CONFLICT (email) DO UPDATE SET active = TRUE RETURNING id`,
			"Demo "+name, strings.ReplaceAll(role, "_", ".")+"@demo.local").Scan(&userID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", userID, roleID)
		return err
	})
	return userID, err
}

// Logout ends the development session.
func (d *DevLogin) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(SessionCookie); err == nil {
		_ = d.Sessions.Delete(r.Context(), c.Value)
	}
	http.SetCookie(w, sessionCookie(SessionCookie, "", -1, d.Secure))
	w.WriteHeader(http.StatusNoContent)
}

// Resolve implements Resolver using the session cookie.
func (d *DevLogin) Resolve(r *http.Request) (*Principal, error) {
	c, err := r.Cookie(SessionCookie)
	if err != nil {
		return nil, ErrUnauthenticated
	}
	sess, err := d.Sessions.Get(r.Context(), c.Value)
	if errors.Is(err, session.ErrNotFound) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, err
	}
	return LoadPrincipal(r.Context(), d.Pool, "u.id = $1", sess.UserID)
}

// sessionCookie builds an HTTP-only cookie; a negative ttl deletes it.
func sessionCookie(name, value string, ttl time.Duration, secure bool) *http.Cookie {
	c := &http.Cookie{Name: name, Value: value, Path: "/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode}
	if ttl < 0 {
		c.MaxAge = -1
	} else {
		c.MaxAge = int(ttl.Seconds())
	}
	return c
}
