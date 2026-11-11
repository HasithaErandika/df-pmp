package tracker

import (
	"context"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/database"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
)

const selectRelease = `
	SELECT id, to_char(release_date, 'YYYY-MM-DD'), title, type, systems, layer, tech_owner, bu_spoc,
	       sanity_test, qa_spoc, status, notes, updated_at
	FROM tracker_releases`

// Releases lists the release calendar, newest first.
func (s Store) Releases(ctx context.Context) ([]Release, error) {
	rows, err := s.Pool.Query(ctx, selectRelease+" ORDER BY release_date DESC, id DESC")
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Release])
}

// Release returns one release.
func (s Store) Release(ctx context.Context, id string) (Release, error) {
	rows, err := s.Pool.Query(ctx, selectRelease+" WHERE id = $1", id)
	if err != nil {
		return Release{}, err
	}
	r, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByPos[Release])
	return r, database.Translate(err, nil)
}

// CreateRelease schedules a release.
func (s Store) CreateRelease(ctx context.Context, in validRelease) (Release, error) {
	var id string
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			INSERT INTO tracker_releases (release_date, title, type, systems, layer, tech_owner, bu_spoc, sanity_test,
			  qa_spoc, status, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
			in.date, in.Title, in.Type, in.Systems, in.Layer, in.TechOwner, in.BUSpoc, in.SanityTest, in.QASpoc,
			in.Status, in.Notes).Scan(&id)
		if err != nil {
			return err
		}
		return audit.Record(ctx, tx, "release.created", "release", id, in.Title)
	})
	if err != nil {
		return Release{}, err
	}
	return s.Release(ctx, id)
}

// UpdateRelease replaces a release's writable fields.
func (s Store) UpdateRelease(ctx context.Context, id string, in validRelease) (Release, error) {
	err := pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
			UPDATE tracker_releases SET release_date = $2, title = $3, type = $4, systems = $5, layer = $6,
			  tech_owner = $7, bu_spoc = $8, sanity_test = $9, qa_spoc = $10, status = $11, notes = $12,
			  updated_at = now()
			WHERE id = $1`, id, in.date, in.Title, in.Type, in.Systems, in.Layer, in.TechOwner, in.BUSpoc,
			in.SanityTest, in.QASpoc, in.Status, in.Notes)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "release.updated", "release", id, in.Status+" · "+in.ReleaseDate)
	})
	if err != nil {
		return Release{}, err
	}
	return s.Release(ctx, id)
}

// DeleteRelease removes a release.
func (s Store) DeleteRelease(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, "DELETE FROM tracker_releases WHERE id = $1", id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return audit.Record(ctx, tx, "release.deleted", "release", id, "")
	})
}
