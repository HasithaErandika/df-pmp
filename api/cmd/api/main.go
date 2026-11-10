// Command api runs the df-pmp REST API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/config"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	if err := run(logger); err != nil {
		logger.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cat := catalog.Source{Dir: cfg.ConfigDir}
	if _, err := cat.Load(); err != nil {
		return err
	}
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	applied, err := database.Migrate(ctx, pool)
	if err != nil {
		return err
	}
	logger.Info("database migrated", "applied", applied)
	if cfg.SeedDemoData {
		seeded, err := database.SeedDemo(ctx, pool)
		if err != nil {
			return err
		}
		logger.Info("demo data checked", "seeded", seeded)
	}

	var resolver auth.Resolver = auth.DisabledResolver{}
	if cfg.AuthMode == config.AuthModePreview {
		logger.Warn("preview authentication is enabled; do not use outside development", "user", cfg.PreviewUserEmail)
		resolver = auth.PreviewResolver{Pool: pool, Email: cfg.PreviewUserEmail}
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.New(server.Deps{Logger: logger, Pool: pool, Catalog: cat, Resolver: resolver, WebOrigin: cfg.WebOrigin}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	errCh := make(chan error, 1)
	go func() {
		logger.Info("starting df-pmp API", "port", cfg.Port, "auth_mode", cfg.AuthMode)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		logger.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
	return nil
}
