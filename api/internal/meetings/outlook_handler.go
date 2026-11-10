package meetings

import (
	"net/http"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// OutlookEvent is an event from the signed-in user's own Outlook calendar (read-only in df-pmp).
type OutlookEvent struct {
	ID       string    `json:"id"`
	Subject  string    `json:"subject"`
	StartsAt time.Time `json:"startsAt"`
	EndsAt   time.Time `json:"endsAt"`
	Location string    `json:"location"`
	WebLink  string    `json:"webLink"`
	JoinURL  string    `json:"joinUrl"`
	ShowAs   string    `json:"showAs"`
}

type outlookCalendar struct {
	Connected bool           `json:"connected"`
	Events    []OutlookEvent `json:"events"`
}

func (h Handler) registerOutlook(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/outlook/events", auth.Require("meeting:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (outlookCalendar, error) { return h.outlookEvents(r) })
	}))
}

// outlookEvents lists the user's Outlook events in the range, excluding ones that are df-pmp meetings
// (matched by iCalUId, which is identical in the organizer's and every attendee's calendar).
func (h Handler) outlookEvents(r *http.Request) (outlookCalendar, error) {
	ts := auth.FromContext(r.Context()).MicrosoftToken()
	if h.Outlook == nil || ts == nil {
		return outlookCalendar{Events: []OutlookEvent{}}, nil
	}
	rg, err := h.parseRange(r)
	if err != nil {
		return outlookCalendar{}, err
	}
	if rg.From.IsZero() || rg.To.IsZero() {
		return outlookCalendar{}, &httpx.ValidationError{Fields: map[string]string{"from": "from and to are required."}}
	}
	if rg.To.Sub(rg.From) > 62*24*time.Hour {
		return outlookCalendar{}, &httpx.ValidationError{Fields: map[string]string{"to": "Choose a range of two months or less."}}
	}
	events, err := h.Outlook.Graph.CalendarView(r.Context(), ts, rg.From, rg.To.AddDate(0, 0, 1))
	if err != nil {
		return outlookCalendar{}, err
	}
	known := map[string]bool{}
	rows, err := h.Outlook.Pool.Query(r.Context(), "SELECT outlook_ical_uid FROM meetings WHERE outlook_ical_uid IS NOT NULL")
	if err != nil {
		return outlookCalendar{}, err
	}
	for rows.Next() {
		var uid string
		if rows.Scan(&uid) == nil {
			known[uid] = true
		}
	}
	rows.Close()
	out := outlookCalendar{Connected: true, Events: []OutlookEvent{}}
	for _, e := range events {
		if e.IsCancelled || known[e.ICalUID] {
			continue
		}
		ev := OutlookEvent{ID: e.ID, Subject: e.Subject, StartsAt: e.Start.UTC(), EndsAt: e.End.UTC(),
			Location: e.Location.DisplayName, WebLink: e.WebLink, ShowAs: e.ShowAs}
		if e.OnlineMeeting != nil {
			ev.JoinURL = e.OnlineMeeting.JoinURL
		}
		out.Events = append(out.Events, ev)
	}
	return out, nil
}
