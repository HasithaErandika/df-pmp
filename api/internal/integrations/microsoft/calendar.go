package microsoft

import (
	"context"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/oauth2"
)

// Attendee is an invited participant.
type Attendee struct{ Name, Email string }

// EventInput describes an Outlook event created on behalf of the signed-in organizer.
type EventInput struct {
	TransactionID string // makes create idempotent across retries
	Subject       string
	BodyHTML      string
	Start, End    time.Time
	Location      string
	Attendees     []Attendee
	Teams         bool
}

// Event is the subset of an Outlook event df-pmp stores or displays.
type Event struct {
	ID            string                       `json:"id"`
	ICalUID       string                       `json:"iCalUId"`
	Subject       string                       `json:"subject"`
	WebLink       string                       `json:"webLink"`
	IsCancelled   bool                         `json:"isCancelled"`
	IsOnline      bool                         `json:"isOnlineMeeting"`
	ShowAs        string                       `json:"showAs"`
	Start         graphDateTime                `json:"start"`
	End           graphDateTime                `json:"end"`
	Location      struct{ DisplayName string } `json:"location"`
	OnlineMeeting *struct {
		JoinURL string `json:"joinUrl"`
	} `json:"onlineMeeting"`
}

type graphDateTime struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone"`
}

// UTC parses a Graph dateTime that was requested in UTC.
func (g graphDateTime) UTC() time.Time {
	t, _ := time.Parse("2006-01-02T15:04:05.9999999", g.DateTime)
	return t.UTC()
}

func toGraphTime(t time.Time) graphDateTime {
	return graphDateTime{DateTime: t.UTC().Format("2006-01-02T15:04:05"), TimeZone: "UTC"}
}

func (in EventInput) payload(create bool) map[string]any {
	attendees := make([]map[string]any, 0, len(in.Attendees))
	for _, a := range in.Attendees {
		attendees = append(attendees, map[string]any{
			"type":         "required",
			"emailAddress": map[string]string{"address": a.Email, "name": a.Name},
		})
	}
	body := map[string]any{
		"subject":   in.Subject,
		"body":      map[string]string{"contentType": "HTML", "content": in.BodyHTML},
		"start":     toGraphTime(in.Start),
		"end":       toGraphTime(in.End),
		"location":  map[string]string{"displayName": in.Location},
		"attendees": attendees,
	}
	// Teams can be added later but Graph cannot remove an online meeting from an existing event.
	if in.Teams || create {
		body["isOnlineMeeting"] = in.Teams
		if in.Teams {
			body["onlineMeetingProvider"] = "teamsForBusiness"
		}
	}
	if create {
		body["transactionId"] = in.TransactionID
		body["allowNewTimeProposals"] = false
	}
	return body
}

// CreateEvent creates the event in the organizer's calendar; Outlook sends the invitations.
func (c *Client) CreateEvent(ctx context.Context, ts oauth2.TokenSource, in EventInput) (Event, error) {
	var out Event
	err := c.do(ctx, ts, request{method: http.MethodPost, path: "/me/events", body: in.payload(true), out: &out})
	return out, err
}

// UpdateEvent updates the organizer's event; Outlook sends updates to attendees.
func (c *Client) UpdateEvent(ctx context.Context, ts oauth2.TokenSource, id string, in EventInput) (Event, error) {
	var out Event
	err := c.do(ctx, ts, request{method: http.MethodPatch, path: "/me/events/" + url.PathEscape(id), body: in.payload(false), out: &out})
	return out, err
}

// CancelEvent cancels the organizer's event and notifies attendees with an optional comment.
func (c *Client) CancelEvent(ctx context.Context, ts oauth2.TokenSource, id, comment string) error {
	err := c.do(ctx, ts, request{
		method: http.MethodPost,
		path:   "/me/events/" + url.PathEscape(id) + "/cancel",
		body:   map[string]string{"comment": comment},
	})
	if IsStatus(err, http.StatusNotFound) {
		return nil // already removed in Outlook
	}
	return err
}

// CalendarView lists the signed-in user's events (including recurring instances) in a time window.
func (c *Client) CalendarView(ctx context.Context, ts oauth2.TokenSource, from, to time.Time) ([]Event, error) {
	params := url.Values{}
	params.Set("startDateTime", from.UTC().Format(time.RFC3339))
	params.Set("endDateTime", to.UTC().Format(time.RFC3339))
	params.Set("$select", "id,iCalUId,subject,start,end,location,webLink,isCancelled,isOnlineMeeting,onlineMeeting,showAs")
	params.Set("$orderby", "start/dateTime")
	params.Set("$top", "250")
	var out struct {
		Value []Event `json:"value"`
	}
	err := c.do(ctx, ts, request{
		method:  http.MethodGet,
		path:    "/me/calendarView?" + params.Encode(),
		headers: map[string]string{"Prefer": `outlook.timezone="UTC"`},
		out:     &out,
	})
	return out.Value, err
}
