// Package auth resolves the calling user and enforces database-driven permissions.
//
// Identity resolution is pluggable: preview mode maps every request to a configured demo user.
// Microsoft Entra ID token validation will implement Resolver once tenant settings are approved.
package auth

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Principal is the authenticated application user with effective permissions.
type Principal struct {
	ID          int64    `json:"id"`
	DisplayName string   `json:"displayName"`
	Email       string   `json:"email"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
}

// Can reports whether the principal holds a permission.
func (p *Principal) Can(permission string) bool { return slices.Contains(p.Permissions, permission) }

// Resolver identifies the caller of a request. It returns ErrUnauthenticated when no identity is present.
type Resolver interface {
	Resolve(r *http.Request) (*Principal, error)
}

// ErrUnauthenticated indicates the request carries no valid identity.
var ErrUnauthenticated = errors.New("unauthenticated")

type principalKey struct{}

// FromContext returns the principal placed by Authenticate.
func FromContext(ctx context.Context) *Principal {
	p, _ := ctx.Value(principalKey{}).(*Principal)
	return p
}

// WithPrincipal returns a context carrying p (useful for tests).
func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey{}, p)
}

// Authenticate resolves the principal or rejects the request with 401.
func Authenticate(resolver Resolver) httpx.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			principal, err := resolver.Resolve(r)
			if errors.Is(err, ErrUnauthenticated) {
				httpx.Error(w, http.StatusUnauthorized, "Sign in to continue.")
				return
			}
			if err != nil {
				httpx.Fail(w, r, err)
				return
			}
			next.ServeHTTP(w, r.WithContext(WithPrincipal(r.Context(), principal)))
		})
	}
}

// Require wraps a handler so it only runs when the caller holds permission. Deny by default.
func Require(permission string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal := FromContext(r.Context())
		if principal == nil || !principal.Can(permission) {
			httpx.Error(w, http.StatusForbidden, "You do not have permission to perform this action.")
			return
		}
		handler(w, r)
	}
}

// PreviewResolver maps all requests to one active user. For local development and demos only.
type PreviewResolver struct {
	Pool  *pgxpool.Pool
	Email string
}

// Resolve loads the preview user and their current grants on every request so changes apply immediately.
func (p PreviewResolver) Resolve(r *http.Request) (*Principal, error) {
	return LoadPrincipal(r.Context(), p.Pool, p.Email)
}

// DisabledResolver rejects every request; used until Entra ID is configured.
type DisabledResolver struct{}

// Resolve always returns ErrUnauthenticated.
func (DisabledResolver) Resolve(*http.Request) (*Principal, error) { return nil, ErrUnauthenticated }

// LoadPrincipal reads an active user with their roles and effective permissions.
func LoadPrincipal(ctx context.Context, pool *pgxpool.Pool, email string) (*Principal, error) {
	const query = `
		SELECT u.id, u.display_name, u.email,
		       COALESCE(array_agg(DISTINCT r.key) FILTER (WHERE r.key IS NOT NULL), '{}'),
		       COALESCE(array_agg(DISTINCT rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), '{}')
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		LEFT JOIN role_permissions rp ON rp.role_id = r.id
		WHERE lower(u.email) = lower($1) AND u.active
		GROUP BY u.id`
	var p Principal
	err := pool.QueryRow(ctx, query, email).Scan(&p.ID, &p.DisplayName, &p.Email, &p.Roles, &p.Permissions)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}
