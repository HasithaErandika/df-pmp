// Package directory finds people for owner, assignee and participant fields. It searches df-pmp users
// and, when the caller signed in with Microsoft, the organization's Entra ID directory.
package directory

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Person is a search result. LocalID is set when the person already exists in df-pmp.
type Person struct {
	LocalID     *int64 `json:"localId"`
	EntraID     string `json:"entraId"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Source      string `json:"source"` // "local" or "entra"
}

// Results wraps people with whether the organization directory was searched.
type Results struct {
	Directory bool     `json:"directory"`
	People    []Person `json:"people"`
}

// Handler exposes directory endpoints.
type Handler struct {
	Pool        *pgxpool.Pool
	Graph       *ms.Client
	Provisioner auth.Provisioner
}

// Register mounts routes on mux.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/directory/people", auth.Require("project:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Results, error) { return h.search(r) })
	}))
	mux.HandleFunc("POST /api/v1/directory/people", auth.Require("directory:search", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Person, error) { return h.add(w, r) })
	}))
}

func (h Handler) search(r *http.Request) (Results, error) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len([]rune(q)) < 2 {
		return Results{People: []Person{}}, nil
	}
	ctx := r.Context()
	local, err := h.local(ctx, q)
	if err != nil {
		return Results{}, err
	}
	p := auth.FromContext(ctx)
	out := Results{People: local}
	if ts := p.MicrosoftToken(); ts != nil && p.Can("directory:search") {
		found, err := h.Graph.SearchUsers(ctx, ts, q, 15)
		if err != nil { // degrade to df-pmp users rather than failing the picker
			slog.WarnContext(ctx, "directory search failed", "error", err)
			return out, nil
		}
		out.Directory = true
		known, err := h.linked(ctx, found)
		if err != nil {
			return Results{}, err
		}
		out.People = merge(local, found, known)
	}
	return out, nil
}

func (h Handler) local(ctx context.Context, q string) ([]Person, error) {
	rows, err := h.Pool.Query(ctx, `
		SELECT id, COALESCE(entra_subject, ''), display_name, email FROM users
		WHERE active AND (display_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
		ORDER BY display_name LIMIT 15`, q)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Person, error) {
		var p Person
		var id int64
		err := row.Scan(&id, &p.EntraID, &p.DisplayName, &p.Email)
		p.LocalID, p.Source = &id, "local"
		return p, err
	})
}

// linked maps Entra object IDs that already belong to df-pmp users to their local IDs.
func (h Handler) linked(ctx context.Context, found []ms.DirectoryUser) (map[string]int64, error) {
	ids := make([]string, 0, len(found))
	for _, u := range found {
		ids = append(ids, u.ID)
	}
	rows, err := h.Pool.Query(ctx, "SELECT entra_subject, id FROM users WHERE active AND entra_subject = ANY($1)", ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	known := map[string]int64{}
	for rows.Next() {
		var oid string
		var id int64
		if err := rows.Scan(&oid, &id); err != nil {
			return nil, err
		}
		known[oid] = id
	}
	return known, rows.Err()
}

// merge appends directory people not already listed. Directory people who are already df-pmp users
// (by object ID) are returned as local so selecting them never re-imports.
func merge(local []Person, found []ms.DirectoryUser, known map[string]int64) []Person {
	seen := map[string]bool{}
	for _, p := range local {
		seen[p.EntraID], seen[strings.ToLower(p.Email)] = true, true
	}
	out := local
	for _, u := range found {
		if seen[u.ID] || seen[u.Email()] || u.Email() == "" {
			continue
		}
		person := Person{EntraID: u.ID, DisplayName: u.DisplayName, Email: u.Email(), Source: "entra"}
		if id, ok := known[u.ID]; ok {
			person.LocalID, person.Source = &id, "local"
		}
		out = append(out, person)
	}
	return out
}

// add provisions an Entra user into df-pmp. The profile is re-read from Microsoft Graph so a client
// cannot inject a different name or email for an object ID.
func (h Handler) add(w http.ResponseWriter, r *http.Request) (Person, error) {
	var in struct {
		EntraID string `json:"entraId"`
	}
	if err := httpx.Decode(w, r, &in); err != nil {
		return Person{}, err
	}
	ts := auth.FromContext(r.Context()).MicrosoftToken()
	if ts == nil {
		return Person{}, &httpx.ValidationError{Fields: map[string]string{"entraId": "Sign in with Microsoft to add people from the organization."}}
	}
	user, err := h.Graph.GetUser(r.Context(), ts, in.EntraID)
	if ms.IsStatus(err, http.StatusNotFound) || ms.IsStatus(err, http.StatusBadRequest) {
		return Person{}, &httpx.ValidationError{Fields: map[string]string{"entraId": "This person was not found in the organization."}}
	}
	if err != nil {
		return Person{}, err
	}
	id, err := h.Provisioner.Provision(r.Context(), auth.Identity{ObjectID: user.ID, DisplayName: user.DisplayName, Email: user.Email()})
	if errors.Is(err, auth.ErrInactive) {
		return Person{}, &httpx.ValidationError{Fields: map[string]string{"entraId": "This person's df-pmp account is deactivated."}}
	}
	if err != nil {
		return Person{}, err
	}
	return Person{LocalID: &id, EntraID: user.ID, DisplayName: user.DisplayName, Email: user.Email(), Source: "local"}, nil
}
