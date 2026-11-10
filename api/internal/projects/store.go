package projects

import (
	"context"
	"fmt"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store persists projects in PostgreSQL.
type Store struct{ Pool *pgxpool.Pool }

var fkFields = database.ForeignKeyFields{"projects_owner_id_fkey": {"ownerId", "Choose an existing owner."}}

const selectProject = `
	SELECT p.id, p.name, p.description, p.owner_id, u.display_name, p.status, p.tone, p.progress,
	       to_char(p.start_date, 'YYYY-MM-DD'), to_char(p.end_date, 'YYYY-MM-DD'),
	       (SELECT count(*) FROM work_items w WHERE w.project_id = p.id AND w.status <> 'Done'),
	       p.updated_at
	FROM projects p JOIN users u ON u.id = p.owner_id`

func scanProject(row pgx.CollectableRow) (Project, error) {
	var p Project
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.OwnerName, &p.Status, &p.Tone,
		&p.Progress, &p.StartDate, &p.EndDate, &p.OpenItems, &p.UpdatedAt)
	return p, err
}

// List returns all projects ordered by planned finish date.
func (s Store) List(ctx context.Context) ([]Project, error) {
	rows, err := s.Pool.Query(ctx, selectProject+" ORDER BY p.end_date, p.name")
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanProject)
}

// Get returns one project.
func (s Store) Get(ctx context.Context, id string) (Project, error) {
	rows, err := s.Pool.Query(ctx, selectProject+" WHERE p.id = $1", id)
	if err != nil {
		return Project{}, err
	}
	p, err := pgx.CollectExactlyOneRow(rows, scanProject)
	return p, database.Translate(err, nil)
}

// Create inserts a project and its audit event atomically.
func (s Store) Create(ctx context.Context, in validated) (Project, error) {
	var id string
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `INSERT INTO projects (name, description, owner_id, status, tone, progress, start_date, end_date)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
			in.Name, in.Description, in.OwnerID, in.Status, in.Tone, in.Progress, in.start, in.end).Scan(&id)
		if err != nil {
			return err
		}
		return audit.Record(ctx, tx, "project.created", "project", id, in.Name)
	})
	if err != nil {
		return Project{}, database.Translate(err, fkFields)
	}
	return s.Get(ctx, id)
}

// Update replaces a project's writable fields.
func (s Store) Update(ctx context.Context, id string, in validated) (Project, error) {
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE projects SET name = $2, description = $3, owner_id = $4, status = $5,
			tone = $6, progress = $7, start_date = $8, end_date = $9, updated_at = now() WHERE id = $1`,
			id, in.Name, in.Description, in.OwnerID, in.Status, in.Tone, in.Progress, in.start, in.end)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "project.updated", "project", id, fmt.Sprintf("Status %s · %d%%", in.Status, in.Progress))
	})
	if err != nil {
		return Project{}, database.Translate(err, fkFields)
	}
	return s.Get(ctx, id)
}

// Delete removes a project; its work items cascade and linked meetings are detached.
func (s Store) Delete(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "DELETE FROM projects WHERE id = $1", id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "project.deleted", "project", id, "")
	})
}
