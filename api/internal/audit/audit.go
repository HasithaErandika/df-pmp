// Package audit records attributable events for material business and security changes.
package audit

import (
	"context"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Event is an audit entry as returned to clients.
type Event struct {
	ID         int64     `json:"id"`
	OccurredAt time.Time `json:"occurredAt"`
	Actor      string    `json:"actor"`
	Action     string    `json:"action"`
	ObjectType string    `json:"objectType"`
	ObjectID   string    `json:"objectId"`
	Summary    string    `json:"summary"`
}

// Record writes an audit event inside tx using the principal and request ID from ctx.
func Record(ctx context.Context, tx pgx.Tx, action, objectType, objectID, summary string) error {
	var actorID *int64
	if p := auth.FromContext(ctx); p != nil {
		actorID = &p.ID
	}
	_, err := tx.Exec(ctx, `INSERT INTO audit_events (actor_id, action, object_type, object_id, request_id, summary)
		VALUES ($1, $2, $3, $4, $5, $6)`, actorID, action, objectType, objectID, httpx.RequestID(ctx), summary)
	return err
}

// List returns the most recent events for an object, newest first.
func List(ctx context.Context, pool *pgxpool.Pool, objectType, objectID string, limit int) ([]Event, error) {
	rows, err := pool.Query(ctx, `
		SELECT a.id, a.occurred_at, COALESCE(u.display_name, 'System'), a.action, a.object_type, a.object_id, a.summary
		FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
		WHERE a.object_type = $1 AND a.object_id = $2
		ORDER BY a.occurred_at DESC, a.id DESC LIMIT $3`, objectType, objectID, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Event, error) {
		var e Event
		err := row.Scan(&e.ID, &e.OccurredAt, &e.Actor, &e.Action, &e.ObjectType, &e.ObjectID, &e.Summary)
		return e, err
	})
}
