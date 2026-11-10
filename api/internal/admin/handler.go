// Package admin manages users, role assignments and shows integration status. Requires user:manage.
package admin

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is a user with their role keys.
type User struct {
	ID          int64    `json:"id"`
	DisplayName string   `json:"displayName"`
	Email       string   `json:"email"`
	Active      bool     `json:"active"`
	Entra       bool     `json:"entra"`
	Roles       []string `json:"roles"`
}

// Role is a role with its granted permissions.
type Role struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	Members     int      `json:"members"`
}

// Handler exposes administration endpoints.
type Handler struct {
	Pool         *pgxpool.Pool
	EndSessions  func(ctx context.Context, userID int64) error
	Integrations func() any
}

// Register mounts routes on mux.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/admin/users", auth.Require("user:manage", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]User, error) { return h.users(r.Context()) })
	}))
	mux.HandleFunc("GET /api/v1/admin/roles", auth.Require("user:manage", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Role, error) { return h.roles(r.Context()) })
	}))
	mux.HandleFunc("PUT /api/v1/admin/users/{id}", auth.Require("user:manage", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error { return h.update(w, r) })
	}))
	mux.HandleFunc("GET /api/v1/admin/integrations", auth.Require("user:manage", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, h.Integrations())
	}))
}

func (h Handler) users(ctx context.Context) ([]User, error) {
	rows, err := h.Pool.Query(ctx, `
		SELECT u.id, u.display_name, u.email, u.active, u.entra_subject IS NOT NULL,
		       COALESCE(array_agg(r.key ORDER BY r.key) FILTER (WHERE r.key IS NOT NULL), '{}')
		FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
		GROUP BY u.id ORDER BY u.active DESC, u.display_name`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[User])
}

func (h Handler) roles(ctx context.Context) ([]Role, error) {
	rows, err := h.Pool.Query(ctx, `
		SELECT r.key, r.name, r.description,
		       CASE WHEN r.key = $1 THEN (SELECT array_agg(key ORDER BY key) FROM permissions)
		            ELSE COALESCE((SELECT array_agg(permission_key ORDER BY permission_key) FROM role_permissions WHERE role_id = r.id), '{}') END,
		       (SELECT count(*) FROM user_roles WHERE role_id = r.id)
		FROM roles r ORDER BY r.id`, auth.AdministratorRole)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Role])
}

func (h Handler) update(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Roles  []string `json:"roles"`
		Active bool     `json:"active"`
	}
	if err := httpx.Decode(w, r, &in); err != nil {
		return err
	}
	var userID int64
	if _, err := fmt.Sscan(r.PathValue("id"), &userID); err != nil {
		return httpx.ErrNotFound
	}
	ctx := r.Context()
	me := auth.FromContext(ctx)
	if userID == me.ID && (!in.Active || !slices.Contains(in.Roles, auth.AdministratorRole) && slices.Contains(me.Roles, auth.AdministratorRole)) {
		return invalid("You cannot deactivate yourself or remove your own administrator role.")
	}
	err := pgx.BeginFunc(ctx, h.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "UPDATE users SET active = $2 WHERE id = $1", userID, in.Active)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		if _, err := tx.Exec(ctx, "DELETE FROM user_roles WHERE user_id = $1", userID); err != nil {
			return err
		}
		tag, err = tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = ANY($2)`, userID, in.Roles)
		if err != nil {
			return err
		}
		if int(tag.RowsAffected()) != len(slices.Compact(slices.Sorted(slices.Values(in.Roles)))) {
			return invalid("One or more roles do not exist.")
		}
		var admins int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id
			JOIN roles r ON r.id = ur.role_id WHERE r.key = $1 AND u.active`, auth.AdministratorRole).Scan(&admins); err != nil {
			return err
		}
		if admins == 0 {
			return invalid("At least one active administrator is required.")
		}
		status := "active"
		if !in.Active {
			status = "deactivated"
		}
		return audit.Record(ctx, tx, "user.access_changed", "user", fmt.Sprint(userID),
			fmt.Sprintf("%s · roles: %s", status, strings.Join(in.Roles, ", ")))
	})
	if err != nil {
		return err
	}
	if !in.Active && h.EndSessions != nil {
		return h.EndSessions(ctx, userID) // sign the user out everywhere immediately
	}
	return nil
}

func invalid(message string) error {
	return &httpx.ValidationError{Fields: map[string]string{"body": message}}
}
