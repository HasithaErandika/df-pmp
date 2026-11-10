package database

import (
	"errors"

	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ForeignKeyFields maps constraint names to the request field and message reported to the client.
type ForeignKeyFields map[string][2]string

// Translate converts common PostgreSQL errors into domain errors.
// Missing rows become httpx.ErrNotFound; foreign-key violations become field validation errors.
func Translate(err error, fields ForeignKeyFields) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return httpx.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		if f, ok := fields[pgErr.ConstraintName]; ok {
			return &httpx.ValidationError{Fields: map[string]string{f[0]: f[1]}}
		}
		return &httpx.ValidationError{Fields: map[string]string{"body": "A referenced record does not exist."}}
	}
	return err
}
