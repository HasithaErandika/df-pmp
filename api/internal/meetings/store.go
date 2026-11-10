package meetings

import (
	"context"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store persists meetings in PostgreSQL.
type Store struct{ Pool *pgxpool.Pool }

var fkFields = database.ForeignKeyFields{
	"meetings_type_id_fkey":             {"typeId", "Choose an existing meeting type."},
	"meetings_project_id_fkey":          {"projectId", "Choose an existing project."},
	"meeting_participants_user_id_fkey": {"participantIds", "Choose existing participants."},
}

const selectMeeting = `
	SELECT m.id, m.title, m.type_id, t.name, t.tone, m.project_id, COALESCE(p.name, ''),
	       m.starts_at, m.ends_at, m.location, m.agenda,
	       COALESCE((SELECT array_agg(mp.user_id ORDER BY mp.user_id) FROM meeting_participants mp WHERE mp.meeting_id = m.id), '{}'),
	       m.outlook_enabled, m.teams_meeting, m.outlook_organizer, m.outlook_web_link, m.online_meeting_url,
	       m.sync_status, m.sync_error
	FROM meetings m
	JOIN meeting_types t ON t.id = m.type_id
	LEFT JOIN projects p ON p.id = m.project_id`

func scanMeeting(row pgx.CollectableRow) (Meeting, error) {
	var m Meeting
	err := row.Scan(&m.ID, &m.Title, &m.TypeID, &m.TypeName, &m.Tone, &m.ProjectID, &m.ProjectName,
		&m.StartsAt, &m.EndsAt, &m.Location, &m.Agenda, &m.ParticipantIDs,
		&m.Outlook, &m.TeamsMeeting, &m.OrganizerID, &m.OutlookWebLink, &m.OnlineMeetingURL, &m.SyncStatus, &m.SyncError)
	return m, err
}

// Types lists configured meeting types.
func (s Store) Types(ctx context.Context) ([]Type, error) {
	rows, err := s.Pool.Query(ctx, "SELECT id, name, tone FROM meeting_types ORDER BY name")
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Type])
}

// List returns meetings whose start falls within the range, in chronological order.
func (s Store) List(ctx context.Context, rg Range) ([]Meeting, error) {
	query := selectMeeting + " WHERE ($1::timestamptz IS NULL OR m.starts_at >= $1) AND ($2::timestamptz IS NULL OR m.starts_at < $2) ORDER BY m.starts_at"
	var from, to any
	if !rg.From.IsZero() {
		from = rg.From
	}
	if !rg.To.IsZero() {
		to = rg.To.AddDate(0, 0, 1)
	}
	rows, err := s.Pool.Query(ctx, query, from, to)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanMeeting)
}

// Get returns one meeting.
func (s Store) Get(ctx context.Context, id string) (Meeting, error) {
	rows, err := s.Pool.Query(ctx, selectMeeting+" WHERE m.id = $1", id)
	if err != nil {
		return Meeting{}, err
	}
	m, err := pgx.CollectExactlyOneRow(rows, scanMeeting)
	return m, database.Translate(err, nil)
}

// Save creates (id == "") or replaces a meeting with its participants and audit event.
func (s Store) Save(ctx context.Context, id string, in validated) (Meeting, error) {
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		action := "meeting.updated"
		if id == "" {
			action = "meeting.created"
			err := tx.QueryRow(ctx, `INSERT INTO meetings (title, type_id, project_id, starts_at, ends_at, location, agenda, outlook_enabled, teams_meeting)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
				in.Title, in.TypeID, in.ProjectID, in.starts, in.ends, in.Location, in.Agenda, in.Outlook, in.TeamsMeeting).Scan(&id)
			if err != nil {
				return err
			}
		} else {
			tag, err := tx.Exec(ctx, `UPDATE meetings SET title = $2, type_id = $3, project_id = $4, starts_at = $5,
				ends_at = $6, location = $7, agenda = $8, outlook_enabled = $9,
				teams_meeting = teams_meeting OR $10 WHERE id = $1`,
				id, in.Title, in.TypeID, in.ProjectID, in.starts, in.ends, in.Location, in.Agenda, in.Outlook, in.TeamsMeeting)
			if err != nil {
				return err
			}
			if tag.RowsAffected() == 0 {
				return httpx.ErrNotFound
			}
		}
		if _, err := tx.Exec(ctx, "DELETE FROM meeting_participants WHERE meeting_id = $1", id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO meeting_participants (meeting_id, user_id)
			SELECT $1, unnest($2::bigint[])`, id, in.ParticipantIDs); err != nil {
			return err
		}
		return audit.Record(ctx, tx, action, "meeting", id, in.Title)
	})
	if err != nil {
		return Meeting{}, database.Translate(err, fkFields)
	}
	return s.Get(ctx, id)
}

// Delete cancels (removes) a meeting.
func (s Store) Delete(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "DELETE FROM meetings WHERE id = $1", id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "meeting.deleted", "meeting", id, "")
	})
}
