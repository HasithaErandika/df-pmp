// Package database owns the PostgreSQL connection pool, versioned migrations and demo seeding.
package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

//go:embed seed/demo.sql
var demoSeed string

// migrationLockID serialises migrations when several API replicas start at once.
const migrationLockID = 7_202_611

// Connect opens a pool and verifies connectivity, retrying while the database starts.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	for attempt := 1; ; attempt++ {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		err = pool.Ping(pingCtx)
		cancel()
		if err == nil {
			return pool, nil
		}
		if attempt == 10 {
			pool.Close()
			return nil, fmt.Errorf("connect to database: %w", err)
		}
		select {
		case <-ctx.Done():
			pool.Close()
			return nil, ctx.Err()
		case <-time.After(time.Duration(attempt) * 500 * time.Millisecond):
		}
	}
}

// Migrate applies embedded migrations in filename order, each in its own transaction.
func Migrate(ctx context.Context, pool *pgxpool.Pool) ([]string, error) {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	if _, err = conn.Exec(ctx, "SELECT pg_advisory_lock($1)", migrationLockID); err != nil {
		return nil, fmt.Errorf("acquire migration lock: %w", err)
	}
	defer conn.Exec(context.WithoutCancel(ctx), "SELECT pg_advisory_unlock($1)", migrationLockID) //nolint:errcheck

	const ddl = `CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`
	if _, err = conn.Exec(ctx, ddl); err != nil {
		return nil, fmt.Errorf("create migrations table: %w", err)
	}
	names, err := fs.Glob(migrationFiles, "migrations/*.sql")
	if err != nil {
		return nil, err
	}
	sort.Strings(names)

	var applied []string
	for _, name := range names {
		version := strings.TrimSuffix(strings.TrimPrefix(name, "migrations/"), ".sql")
		var exists bool
		err = conn.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists)
		if err != nil {
			return applied, err
		}
		if exists {
			continue
		}
		body, err := migrationFiles.ReadFile(name)
		if err != nil {
			return applied, err
		}
		err = pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, string(body)); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version)
			return err
		})
		if err != nil {
			return applied, fmt.Errorf("apply migration %s: %w", version, err)
		}
		applied = append(applied, version)
	}
	return applied, nil
}

// SeedDemo loads preview data into an empty database. It returns false when data already exists.
func SeedDemo(ctx context.Context, pool *pgxpool.Pool) (bool, error) {
	var hasUsers bool
	if err := pool.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM users)").Scan(&hasUsers); err != nil {
		return false, err
	}
	if hasUsers {
		return false, nil
	}
	err := pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, demoSeed)
		return err
	})
	if err != nil {
		return false, fmt.Errorf("seed demo data: %w", err)
	}
	return true, nil
}
