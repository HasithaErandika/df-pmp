package meetings

import (
	"context"
	"errors"
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Outlook keeps Outlook invitations in step with df-pmp meetings. The organizer is the user who first
// sent the invitation; only they can update or cancel it because the event lives in their mailbox.
type Outlook struct {
	Pool      *pgxpool.Pool
	Graph     *ms.Client
	WebOrigin string
}

type syncRow struct {
	enabled, teams   bool
	eventID          *string
	organizerID      *int64
	organizerName    string
	title, location  string
	agenda           string
	startsAt, endsAt time.Time
	createdAt        time.Time
	attendees        []ms.Attendee
	attendeeIDs      []int64
}

func (o Outlook) load(ctx context.Context, id string) (syncRow, error) {
	var r syncRow
	err := o.Pool.QueryRow(ctx, `
		SELECT m.outlook_enabled, m.teams_meeting, m.outlook_event_id, m.outlook_organizer, COALESCE(u.display_name, ''),
		       m.title, m.location, m.agenda, m.starts_at, m.ends_at, m.created_at
		FROM meetings m LEFT JOIN users u ON u.id = m.outlook_organizer WHERE m.id = $1`, id).Scan(
		&r.enabled, &r.teams, &r.eventID, &r.organizerID, &r.organizerName,
		&r.title, &r.location, &r.agenda, &r.startsAt, &r.endsAt, &r.createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, httpx.ErrNotFound
	}
	if err != nil {
		return r, err
	}
	rows, err := o.Pool.Query(ctx, `SELECT u.id, u.display_name, u.email FROM meeting_participants mp
		JOIN users u ON u.id = mp.user_id WHERE mp.meeting_id = $1 AND u.active ORDER BY u.display_name`, id)
	if err != nil {
		return r, err
	}
	defer rows.Close()
	for rows.Next() {
		var a ms.Attendee
		var uid int64
		if err := rows.Scan(&uid, &a.Name, &a.Email); err != nil {
			return r, err
		}
		r.attendees, r.attendeeIDs = append(r.attendees, a), append(r.attendeeIDs, uid)
	}
	return r, rows.Err()
}

// Sync creates, updates or cancels the Outlook event for a meeting and records the outcome.
// Failures are stored on the meeting (sync_status = failed) rather than failing the save.
func (o Outlook) Sync(ctx context.Context, id string, p *auth.Principal) error {
	r, err := o.load(ctx, id)
	if err != nil {
		return err
	}
	if !r.enabled && r.eventID == nil {
		return nil
	}
	ts := p.MicrosoftToken()
	switch {
	case ts == nil:
		return o.record(ctx, id, "failed", "Sign in with Microsoft to send Outlook invitations.", nil)
	case r.eventID != nil && r.organizerID != nil && *r.organizerID != p.ID:
		return o.record(ctx, id, "failed", fmt.Sprintf("Only the organizer (%s) can update the Outlook invitation.", r.organizerName), nil)
	case !r.enabled: // Outlook switched off: cancel the existing invitation
		if err := o.Graph.CancelEvent(ctx, ts, *r.eventID, "This meeting is no longer tracked in Outlook."); err != nil {
			return o.record(ctx, id, "failed", graphMessage(err), nil)
		}
		_, err := o.Pool.Exec(ctx, `UPDATE meetings SET outlook_event_id = NULL, outlook_ical_uid = NULL, outlook_organizer = NULL,
			outlook_web_link = '', online_meeting_url = '', sync_status = 'not_synced', sync_error = '' WHERE id = $1`, id)
		return err
	}
	in := ms.EventInput{
		TransactionID: fmt.Sprintf("dfpmp-%s-%d", id, r.createdAt.Unix()),
		Subject:       r.title,
		BodyHTML:      o.body(r),
		Start:         r.startsAt, End: r.endsAt,
		Location: r.location,
		Teams:    r.teams,
	}
	for i, a := range r.attendees {
		if r.attendeeIDs[i] != p.ID { // the organizer is not invited to their own meeting
			in.Attendees = append(in.Attendees, a)
		}
	}
	var event ms.Event
	if r.eventID == nil {
		event, err = o.Graph.CreateEvent(ctx, ts, in)
	} else {
		event, err = o.Graph.UpdateEvent(ctx, ts, *r.eventID, in)
	}
	if err != nil {
		return o.record(ctx, id, "failed", graphMessage(err), nil)
	}
	return o.record(ctx, id, "synced", "", &recorded{event: event, organizer: p.ID})
}

type recorded struct {
	event     ms.Event
	organizer int64
}

func (o Outlook) record(ctx context.Context, id, status, message string, rec *recorded) error {
	if rec == nil {
		_, err := o.Pool.Exec(ctx, "UPDATE meetings SET sync_status = $2, sync_error = $3 WHERE id = $1", id, status, message)
		return err
	}
	join := ""
	if rec.event.OnlineMeeting != nil {
		join = rec.event.OnlineMeeting.JoinURL
	}
	_, err := o.Pool.Exec(ctx, `UPDATE meetings SET sync_status = $2, sync_error = '', outlook_event_id = $3,
		outlook_ical_uid = $4, outlook_organizer = $5, outlook_web_link = $6,
		online_meeting_url = COALESCE(NULLIF($7, ''), online_meeting_url) WHERE id = $1`,
		id, status, rec.event.ID, rec.event.ICalUID, rec.organizer, rec.event.WebLink, join)
	return err
}

// Cancel withdraws the Outlook invitation before a meeting is deleted. Only the organizer may do this.
func (o Outlook) Cancel(ctx context.Context, id string, p *auth.Principal) error {
	r, err := o.load(ctx, id)
	if err != nil || r.eventID == nil {
		return err
	}
	if r.organizerID != nil && *r.organizerID != p.ID {
		return &httpx.ValidationError{Fields: map[string]string{"body": fmt.Sprintf(
			"Only the organizer (%s) can cancel this meeting because it was sent as an Outlook invitation.", r.organizerName)}}
	}
	if err := o.Graph.CancelEvent(ctx, p.MicrosoftToken(), *r.eventID, "This meeting has been cancelled."); err != nil {
		return &httpx.ValidationError{Fields: map[string]string{"body": "The Outlook invitation could not be cancelled: " + graphMessage(err)}}
	}
	return nil
}

func (o Outlook) body(r syncRow) string {
	agenda := strings.ReplaceAll(html.EscapeString(r.agenda), "\n", "<br>")
	if agenda == "" {
		agenda = "No agenda yet."
	}
	return fmt.Sprintf(`<p><strong>Agenda</strong><br>%s</p><p style="color:#6f7a8c">Managed in df-pmp · <a href="%s/meetings">Open meetings</a></p>`,
		agenda, html.EscapeString(o.WebOrigin))
}

func graphMessage(err error) string {
	var ge *ms.Error
	switch {
	case errors.Is(err, ms.ErrNotConnected):
		return "Your Microsoft session has expired. Sign out and sign in again."
	case errors.As(err, &ge) && ge.Status == 403:
		return "Microsoft 365 denied access. Ask an administrator to grant Calendars.ReadWrite."
	case errors.As(err, &ge) && ge.Message != "":
		return ge.Message
	default:
		return "Outlook could not be reached. Try again."
	}
}
