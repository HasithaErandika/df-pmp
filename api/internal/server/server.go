// Package server wires routes, middleware and dependencies into an http.Handler.
package server

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/admin"
	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/config"
	"github.com/dialog-finance/df-pmp/api/internal/directory"
	"github.com/dialog-finance/df-pmp/api/internal/documents"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
	"github.com/dialog-finance/df-pmp/api/internal/meetings"
	"github.com/dialog-finance/df-pmp/api/internal/projects"
	"github.com/dialog-finance/df-pmp/api/internal/workitems"
	"github.com/dialog-finance/df-pmp/api/internal/workspace"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Deps are the collaborators needed to build the API.
type Deps struct {
	Logger      *slog.Logger
	Pool        *pgxpool.Pool
	Catalog     catalog.Source
	Config      config.Config
	Resolver    auth.Resolver
	Entra       *auth.Entra // nil unless AUTH_MODE=entra
	Graph       *ms.Client
	SharePoint  *ms.SharePoint
	Provisioner auth.Provisioner
}

// Status tells the web app how to sign in and which Microsoft 365 features are available.
type Status struct {
	Mode     string          `json:"mode"`
	Features map[string]bool `json:"features"`
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
	status := Status{Mode: d.Config.AuthMode, Features: map[string]bool{
		"outlook":    d.Entra != nil,
		"directory":  d.Entra != nil,
		"sharepoint": d.SharePoint.Enabled(),
	}}
	var outlook *meetings.Outlook
	if d.Entra != nil {
		outlook = &meetings.Outlook{Pool: d.Pool, Graph: d.Graph, WebOrigin: d.Config.WebOrigin}
	}

	// Authenticated routes: every handler below also checks its own permission.
	protected := http.NewServeMux()
	projects.Handler{Repo: projects.Store{Pool: d.Pool}, Catalog: d.Catalog}.Register(protected)
	workitems.Handler{Repo: workitems.Store{Pool: d.Pool}, Catalog: d.Catalog}.Register(protected)
	meetings.Handler{Repo: meetings.Store{Pool: d.Pool}, TimeZone: timeZone, Outlook: outlook}.Register(protected)
	workspace.Handler{Pool: d.Pool, TimeZone: timeZone}.Register(protected)
	directory.Handler{Pool: d.Pool, Graph: d.Graph, Provisioner: d.Provisioner}.Register(protected)
	documents.Handler{Pool: d.Pool, SharePoint: d.SharePoint}.Register(protected)
	adminHandler := admin.Handler{Pool: d.Pool, Integrations: func() any { return integrationReport(d, status) }}
	if d.Entra != nil {
		adminHandler.EndSessions = d.Entra.Sessions.DeleteForUser
	}
	adminHandler.Register(protected)

	// Public routes: health probes, branding and sign-in.
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
	root.HandleFunc("GET /api/v1/auth/status", func(w http.ResponseWriter, _ *http.Request) { httpx.JSON(w, http.StatusOK, status) })
	if d.Entra != nil {
		root.HandleFunc("GET /api/v1/auth/login", d.Entra.Login)
		root.HandleFunc("GET /api/v1/auth/callback", d.Entra.Callback)
		root.HandleFunc("POST /api/v1/auth/logout", d.Entra.Logout)
	}
	root.Handle("/api/v1/", auth.Authenticate(d.Resolver)(protected))

	return httpx.Chain(root,
		httpx.WithRequestID,
		httpx.Logger(d.Logger),
		httpx.Recover,
		httpx.SecurityHeaders,
		httpx.CORS(d.Config.WebOrigin),
		httpx.SameOrigin(d.Config.WebOrigin),
	)
}

// integrationReport lists configuration state for administrators. It never includes secrets.
func integrationReport(d Deps, s Status) any {
	m := d.Config.Microsoft
	return map[string]any{
		"authMode":        s.Mode,
		"features":        s.Features,
		"tenantId":        m.TenantID,
		"clientId":        m.ClientID,
		"secretSet":       m.ClientSecret != "",
		"redirectUrl":     m.RedirectURL,
		"sharePointSite":  m.SharePointSiteURL,
		"sharePointLib":   m.SharePointLibrary,
		"delegatedScopes": ms.DelegatedScopes,
		"bootstrapAdmins": len(m.BootstrapUPNs),
		"defaultRole":     m.DefaultRole,
	}
}
