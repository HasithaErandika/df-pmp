// Package server wires routes, middleware and dependencies into an http.Handler.
package server

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/dialog-finance/df-pmp/api/internal/meetings"
	"github.com/dialog-finance/df-pmp/api/internal/projects"
	"github.com/dialog-finance/df-pmp/api/internal/workitems"
	"github.com/dialog-finance/df-pmp/api/internal/workspace"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Deps are the collaborators needed to build the API.
type Deps struct {
	Logger    *slog.Logger
	Pool      *pgxpool.Pool
	Catalog   catalog.Source
	Resolver  auth.Resolver
	WebOrigin string
}

// New returns the fully wired API handler.
func New(d Deps) http.Handler {
	timeZone := func() (*time.Location, error) {
		app, err := d.Catalog.Load()
		if err != nil {
			return nil, err
		}
		return time.LoadLocation(app.Timezone)
	}

	// Authenticated routes: every handler below also checks its own permission.
	protected := http.NewServeMux()
	projects.Handler{Repo: projects.Store{Pool: d.Pool}, Catalog: d.Catalog}.Register(protected)
	workitems.Handler{Repo: workitems.Store{Pool: d.Pool}, Catalog: d.Catalog}.Register(protected)
	meetings.Handler{Repo: meetings.Store{Pool: d.Pool}, TimeZone: timeZone}.Register(protected)
	workspace.Handler{Pool: d.Pool, TimeZone: timeZone}.Register(protected)

	// Public routes: health probes and branding needed to render the sign-in page.
	root := http.NewServeMux()
	root.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "df-pmp-api"})
	})
	root.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := d.Pool.Ping(r.Context()); err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "database unavailable")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	root.HandleFunc("GET /api/v1/config", d.Catalog.Handler)
	root.Handle("/api/v1/", auth.Authenticate(d.Resolver)(protected))

	return httpx.Chain(root,
		httpx.WithRequestID,
		httpx.Logger(d.Logger),
		httpx.Recover,
		httpx.SecurityHeaders,
		httpx.CORS(d.WebOrigin),
	)
}
