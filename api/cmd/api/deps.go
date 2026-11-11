package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/config"
	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
	"github.com/dialog-finance/df-pmp/api/internal/server"
	"github.com/dialog-finance/df-pmp/api/internal/session"
	"github.com/jackc/pgx/v5/pgxpool"
)

// buildDeps selects the sign-in mode and constructs Microsoft 365 clients from configuration.
func buildDeps(ctx context.Context, logger *slog.Logger, cfg config.Config, pool *pgxpool.Pool, cat catalog.Source) (server.Deps, error) {
	m := cfg.Microsoft
	graph := ms.NewClient(m.GraphBaseURL, m.AuthorityURL, m.TenantID, m.ClientID, m.ClientSecret)
	provisioner := auth.Provisioner{Pool: pool, DefaultRole: m.DefaultRole, BootstrapUPNs: m.BootstrapUPNs}
	deps := server.Deps{
		Logger: logger, Pool: pool, Catalog: cat, Config: cfg, Graph: graph, Provisioner: provisioner,
		Resolver:   auth.DisabledResolver{},
		SharePoint: &ms.SharePoint{Client: graph, SiteURL: m.SharePointSiteURL, Library: m.SharePointLibrary},
	}
	switch cfg.AuthMode {
	case config.AuthModePreview:
		logger.Warn("development role sign-in is enabled; do not use outside development")
		var sealer *session.Sealer // only needed to encrypt Microsoft tokens, which preview sessions never hold
		if len(m.SessionKey) > 0 {
			var err error
			if sealer, err = session.NewSealer(m.SessionKey); err != nil {
				return deps, err
			}
		}
		store := session.Store{Pool: pool, Sealer: sealer, TTL: m.SessionTTL}
		deps.Dev = &auth.DevLogin{Pool: pool, Sessions: store, Secure: m.CookieSecure}
		deps.Resolver = deps.Dev
		go purgeSessions(ctx, logger, store)
	case config.AuthModeEntra:
		sealer, err := session.NewSealer(m.SessionKey)
		if err != nil {
			return deps, err
		}
		store := session.Store{Pool: pool, Sealer: sealer, TTL: m.SessionTTL}
		deps.Entra = &auth.Entra{
			Pool:        pool,
			Sessions:    store,
			OAuth:       ms.OAuthConfig(m.AuthorityURL, m.TenantID, m.ClientID, m.ClientSecret, m.RedirectURL),
			Issuer:      m.AuthorityURL + "/" + m.TenantID + "/v2.0",
			TenantID:    m.TenantID,
			WebOrigin:   cfg.WebOrigin,
			Secure:      m.CookieSecure,
			Provisioner: provisioner,
		}
		deps.Resolver = deps.Entra
		go purgeSessions(ctx, logger, store)
		logger.Info("microsoft entra sign-in enabled", "tenant", m.TenantID, "sharepoint", deps.SharePoint.Enabled())
	default:
		logger.Warn("sign-in is disabled; set AUTH_MODE=entra or AUTH_MODE=preview", "auth_mode", cfg.AuthMode)
	}
	return deps, nil
}

func purgeSessions(ctx context.Context, logger *slog.Logger, store session.Store) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		if err := store.PurgeExpired(ctx); err != nil && ctx.Err() == nil {
			logger.Warn("purge expired sessions", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
