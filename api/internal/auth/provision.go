package auth

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrInactive means the account exists but has been deactivated by an administrator.
var ErrInactive = errors.New("account is deactivated")

// Identity is a verified Microsoft Entra identity (from an ID token or a Graph lookup).
type Identity struct {
	ObjectID    string // Entra object ID (oid): the stable identity key
	DisplayName string
	Email       string
}

// Provisioner creates or links df-pmp users for Entra identities.
type Provisioner struct {
	Pool          *pgxpool.Pool
	DefaultRole   string
	BootstrapUPNs []string // lower-case sign-in names that become administrators
}

// Provision returns the user ID for an identity. Users are matched by Entra object ID. A record
// pre-created without an object ID (e.g. by an administrator) is linked once by email. New users
// receive the default role; bootstrap administrators also receive the administrator role.
func (p Provisioner) Provision(ctx context.Context, id Identity) (int64, error) {
	email := strings.ToLower(strings.TrimSpace(id.Email))
	name := strings.TrimSpace(id.DisplayName)
	if name == "" {
		name = email
	}
	var userID int64
	var active bool
	err := pgx.BeginFunc(ctx, p.Pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			UPDATE users SET display_name = $2, email = $3
			WHERE entra_subject = $1 RETURNING id, active`, id.ObjectID, name, email).Scan(&userID, &active)
		if errors.Is(err, pgx.ErrNoRows) {
			err = tx.QueryRow(ctx, `
				UPDATE users SET entra_subject = $1, display_name = $2
				WHERE lower(email) = $3 AND entra_subject IS NULL RETURNING id, active`, id.ObjectID, name, email).Scan(&userID, &active)
		}
		if errors.Is(err, pgx.ErrNoRows) {
			active = true
			err = tx.QueryRow(ctx, `INSERT INTO users (display_name, email, entra_subject) VALUES ($1, $2, $3) RETURNING id`,
				name, email, id.ObjectID).Scan(&userID)
			if err == nil {
				err = grantRole(ctx, tx, userID, p.DefaultRole)
			}
		}
		if err != nil {
			return err
		}
		if p.isBootstrapAdmin(email) {
			return grantRole(ctx, tx, userID, AdministratorRole)
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	if !active {
		return 0, ErrInactive
	}
	return userID, nil
}

func (p Provisioner) isBootstrapAdmin(email string) bool {
	for _, upn := range p.BootstrapUPNs {
		if upn == email {
			return true
		}
	}
	return false
}

func grantRole(ctx context.Context, tx pgx.Tx, userID int64, role string) error {
	if role == "" {
		return nil
	}
	_, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2
		ON CONFLICT DO NOTHING`, userID, role)
	return err
}
