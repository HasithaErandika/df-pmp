package tracker

import (
	"context"
	"fmt"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store persists tracker boards, tasks and progress updates in PostgreSQL.
type Store struct{ Pool *pgxpool.Pool }

var taskFK = database.ForeignKeyFields{"tracker_tasks_board_fkey": {"board", "Choose an existing board."}}

const selectTask = `
	SELECT id, board, ref_no, title, owners, bu_owner, status, to_char(target_date, 'YYYY-MM-DD'),
	       target_history::text[], remarks, updated_at, completed_at
	FROM tracker_tasks`

func scanTask(row pgx.CollectableRow) (Task, error) {
	var t Task
	err := row.Scan(&t.ID, &t.Board, &t.RefNo, &t.Title, &t.Owners, &t.BUOwner, &t.Status, &t.TargetDate,
		&t.TargetHistory, &t.Remarks, &t.UpdatedAt, &t.CompletedAt)
	return t, err
}

// Boards lists boards with their total and open (not completed) task counts.
func (s Store) Boards(ctx context.Context, done string) ([]Board, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT b.key, b.name, b.description, b.tone, count(t.id), count(t.id) FILTER (WHERE t.status <> $1)
		FROM tracker_boards b LEFT JOIN tracker_tasks t ON t.board = b.key
		GROUP BY b.key ORDER BY b.position, b.name`, done)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Board])
}

// List returns a board's tasks in tracker order.
func (s Store) List(ctx context.Context, board string) ([]Task, error) {
	rows, err := s.Pool.Query(ctx, selectTask+" WHERE board = $1 ORDER BY position, id", board)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanTask)
}

// Get returns one task.
func (s Store) Get(ctx context.Context, id string) (Task, error) {
	rows, err := s.Pool.Query(ctx, selectTask+" WHERE id = $1", id)
	if err != nil {
		return Task{}, err
	}
	t, err := pgx.CollectExactlyOneRow(rows, scanTask)
	return t, database.Translate(err, nil)
}

// Create adds a task at the end of its board and logs its creation.
func (s Store) Create(ctx context.Context, in validTask) (Task, error) {
	var id string
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			INSERT INTO tracker_tasks (board, position, title, owners, bu_owner, status, target_date, remarks, completed_at)
			VALUES ($1, (SELECT COALESCE(max(position), 0) + 1 FROM tracker_tasks WHERE board = $1), $2, $3, $4, $5, $6, $7,
			        CASE WHEN $5 = $8 THEN now() END)
			RETURNING id`, in.Board, in.Title, in.Owners, in.BUOwner, in.Status, in.target, in.Remarks, in.done).Scan(&id)
		if err != nil {
			return err
		}
		if err := logUpdate(ctx, tx, id, "created", "Task created with status "+in.Status+"."); err != nil {
			return err
		}
		return audit.Record(ctx, tx, "tracker_task.created", "tracker_task", id, in.Title)
	})
	if err != nil {
		return Task{}, database.Translate(err, taskFK)
	}
	return s.Get(ctx, id)
}

// Update saves a task. A moved target is appended to the target history, and status,
// target and remark changes are written to the progress log.
func (s Store) Update(ctx context.Context, id string, in validTask) (Task, error) {
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		var oldStatus, oldRemarks string
		var oldTarget *time.Time
		err := tx.QueryRow(ctx, "SELECT status, target_date, remarks FROM tracker_tasks WHERE id = $1 FOR UPDATE", id).
			Scan(&oldStatus, &oldTarget, &oldRemarks)
		if err != nil {
			return err
		}
		moved := !sameDate(oldTarget, in.target)
		_, err = tx.Exec(ctx, `
			UPDATE tracker_tasks SET board = $2, title = $3, owners = $4, bu_owner = $5, status = $6, target_date = $7,
			  remarks = $8, updated_at = now(),
			  target_history = CASE WHEN $9 AND target_date IS NOT NULL THEN target_history || target_date ELSE target_history END,
			  completed_at = CASE WHEN $6 = $10 THEN COALESCE(completed_at, now()) END
			WHERE id = $1`, id, in.Board, in.Title, in.Owners, in.BUOwner, in.Status, in.target, in.Remarks, moved, in.done)
		if err != nil {
			return err
		}
		var changes [][2]string
		if oldStatus != in.Status {
			changes = append(changes, [2]string{"status", fmt.Sprintf("Status changed from %s to %s.", oldStatus, in.Status)})
		}
		if moved {
			changes = append(changes, [2]string{"target", fmt.Sprintf("Target moved from %s to %s.", label(oldTarget), label(in.target))})
		}
		if oldRemarks != in.Remarks && in.Remarks != "" {
			changes = append(changes, [2]string{"note", in.Remarks})
		}
		for _, c := range changes {
			if err := logUpdate(ctx, tx, id, c[0], c[1]); err != nil {
				return err
			}
		}
		return audit.Record(ctx, tx, "tracker_task.updated", "tracker_task", id, "Status "+in.Status)
	})
	if err != nil {
		return Task{}, database.Translate(err, taskFK)
	}
	return s.Get(ctx, id)
}

// Delete removes a task and its progress log.
func (s Store) Delete(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "DELETE FROM tracker_tasks WHERE id = $1", id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "tracker_task.deleted", "tracker_task", id, "")
	})
}

// Updates returns a task's progress log, newest first.
func (s Store) Updates(ctx context.Context, id string) ([]Update, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT u.id, u.kind, u.body, COALESCE(a.display_name, 'System'), u.created_at
		FROM tracker_task_updates u LEFT JOIN users a ON a.id = u.author_id
		WHERE u.task_id = $1 ORDER BY u.created_at DESC, u.id DESC LIMIT 100`, id)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Update])
}

// AddNote posts a progress note and refreshes the task's latest remark.
func (s Store) AddNote(ctx context.Context, id, body string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "UPDATE tracker_tasks SET remarks = $2, updated_at = now() WHERE id = $1", id, body)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return logUpdate(ctx, tx, id, "note", body)
	})
}

func logUpdate(ctx context.Context, tx pgx.Tx, taskID, kind, body string) error {
	var author *int64
	if p := auth.FromContext(ctx); p != nil {
		author = &p.ID
	}
	_, err := tx.Exec(ctx, "INSERT INTO tracker_task_updates (task_id, author_id, kind, body) VALUES ($1, $2, $3, $4)",
		taskID, author, kind, body)
	return err
}

func sameDate(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Format(httpx.DateLayout) == b.Format(httpx.DateLayout)
}

func label(t *time.Time) string {
	if t == nil {
		return "TBD"
	}
	return t.Format("2 Jan 2006")
}
