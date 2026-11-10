package workitems

import (
	"context"
	"fmt"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store persists work items in PostgreSQL.
type Store struct{ Pool *pgxpool.Pool }

var fkFields = database.ForeignKeyFields{
	"work_items_project_id_fkey":  {"projectId", "Choose an existing project."},
	"work_items_assignee_id_fkey": {"assigneeId", "Choose an existing assignee."},
}

const selectItem = `
	SELECT w.id, w.project_id, p.name, w.subject, w.type, w.status, w.priority, w.assignee_id,
	       COALESCE(u.display_name, ''), to_char(w.due_date, 'YYYY-MM-DD'), w.updated_at
	FROM work_items w
	JOIN projects p ON p.id = w.project_id
	LEFT JOIN users u ON u.id = w.assignee_id`

func scanItem(row pgx.CollectableRow) (WorkItem, error) {
	var w WorkItem
	err := row.Scan(&w.ID, &w.ProjectID, &w.ProjectName, &w.Subject, &w.Type, &w.Status, &w.Priority,
		&w.AssigneeID, &w.AssigneeName, &w.DueDate, &w.UpdatedAt)
	return w, err
}

// List returns work items matching the filter, open items first and soonest due first.
func (s Store) List(ctx context.Context, f Filter) ([]WorkItem, error) {
	rows, err := s.Pool.Query(ctx, selectItem+`
		WHERE ($1 = '' OR w.project_id = $1) AND ($2 = 0 OR w.assignee_id = $2)
		ORDER BY (w.status = 'Done'), w.due_date, w.id`, f.ProjectID, f.AssigneeID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanItem)
}

// Get returns one work item.
func (s Store) Get(ctx context.Context, id string) (WorkItem, error) {
	rows, err := s.Pool.Query(ctx, selectItem+" WHERE w.id = $1", id)
	if err != nil {
		return WorkItem{}, err
	}
	w, err := pgx.CollectExactlyOneRow(rows, scanItem)
	return w, database.Translate(err, nil)
}

// Create inserts a work item and its audit event atomically.
func (s Store) Create(ctx context.Context, in validated) (WorkItem, error) {
	var id string
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `INSERT INTO work_items (project_id, subject, type, status, priority, assignee_id, due_date)
			VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
			in.ProjectID, in.Subject, in.Type, in.Status, in.Priority, in.AssigneeID, in.due).Scan(&id)
		if err != nil {
			return err
		}
		return audit.Record(ctx, tx, "work_item.created", "work_item", id, in.Subject)
	})
	if err != nil {
		return WorkItem{}, database.Translate(err, fkFields)
	}
	return s.Get(ctx, id)
}

// Update replaces a work item's writable fields, recording the resulting status.
func (s Store) Update(ctx context.Context, id string, in validated) (WorkItem, error) {
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE work_items SET project_id = $2, subject = $3, type = $4, status = $5,
			priority = $6, assignee_id = $7, due_date = $8, updated_at = now() WHERE id = $1`,
			id, in.ProjectID, in.Subject, in.Type, in.Status, in.Priority, in.AssigneeID, in.due)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "work_item.updated", "work_item", id, fmt.Sprintf("Status %s · due %s", in.Status, in.DueDate))
	})
	if err != nil {
		return WorkItem{}, database.Translate(err, fkFields)
	}
	return s.Get(ctx, id)
}

// Delete removes a work item.
func (s Store) Delete(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "DELETE FROM work_items WHERE id = $1", id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "work_item.deleted", "work_item", id, "")
	})
}
