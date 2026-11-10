package auth

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdministratorRole holds every permission, including permissions added after the role was granted.
const AdministratorRole = "administrator"

// LoadPrincipal reads an active user matching where (a SQL predicate on alias u with one $1 argument)
// together with their roles and effective permissions.
func LoadPrincipal(ctx context.Context, pool *pgxpool.Pool, where string, arg any) (*Principal, error) {
	query := `
		SELECT u.id, u.display_name, u.email,
		       COALESCE(array_agg(DISTINCT r.key) FILTER (WHERE r.key IS NOT NULL), '{}'),
		       CASE WHEN bool_or(r.key = '` + AdministratorRole + `')
		            THEN (SELECT array_agg(key ORDER BY key) FROM permissions)
		            ELSE COALESCE(array_agg(DISTINCT rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), '{}')
		       END
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		LEFT JOIN role_permissions rp ON rp.role_id = r.id
		WHERE ` + where + ` AND u.active
		GROUP BY u.id`
	var p Principal
	err := pool.QueryRow(ctx, query, arg).Scan(&p.ID, &p.DisplayName, &p.Email, &p.Roles, &p.Permissions)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUnauthenticated
	}
	if err != nil {
		return nil, err
	}
	p.Microsoft = "not_connected"
	return &p, nil
}
