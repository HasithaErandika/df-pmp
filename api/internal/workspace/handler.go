// Package workspace serves cross-cutting read models: the session, user directory, dashboard and activity.
package workspace

import (
	"net/http"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/audit"
	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is a directory entry used for owner, assignee and participant selection.
type User struct {
	ID          int64  `json:"id"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

// Summary holds dashboard counters computed from live data.
type Summary struct {
	ActiveProjects     int `json:"activeProjects"`
	OpenWorkItems      int `json:"openWorkItems"`
	AssignedToMe       int `json:"assignedToMe"`
	DueThisWeek        int `json:"dueThisWeek"`
	Overdue            int `json:"overdue"`
	CompletedThisMonth int `json:"completedThisMonth"`
	UpcomingMeetings   int `json:"upcomingMeetings"`
}

// Handler exposes workspace endpoints.
type Handler struct {
	Pool     *pgxpool.Pool
	TimeZone func() (*time.Location, error)
}

// Register mounts routes on mux.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/me", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, auth.FromContext(r.Context()))
	})
	mux.HandleFunc("GET /api/v1/users", auth.Require("project:view", h.users))
	mux.HandleFunc("GET /api/v1/dashboard", auth.Require("project:view", h.dashboard))
	mux.HandleFunc("GET /api/v1/activity/{type}/{id}", auth.Require("audit:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]audit.Event, error) {
			return audit.List(r.Context(), h.Pool, r.PathValue("type"), r.PathValue("id"), 25)
		})
	}))
}

func (h Handler) users(w http.ResponseWriter, r *http.Request) {
	httpx.Respond(w, r, http.StatusOK, func() ([]User, error) {
		rows, err := h.Pool.Query(r.Context(), "SELECT id, display_name, email FROM users WHERE active ORDER BY display_name")
		if err != nil {
			return nil, err
		}
		return pgx.CollectRows(rows, pgx.RowToStructByPos[User])
	})
}

func (h Handler) dashboard(w http.ResponseWriter, r *http.Request) {
	httpx.Respond(w, r, http.StatusOK, func() (Summary, error) {
		loc, err := h.TimeZone()
		if err != nil {
			return Summary{}, err
		}
		now := time.Now().In(loc)
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		var s Summary
		err = h.Pool.QueryRow(r.Context(), `
			SELECT
			  (SELECT count(*) FROM projects WHERE status <> 'Done'),
			  count(*) FILTER (WHERE status <> 'Done'),
			  count(*) FILTER (WHERE status <> 'Done' AND assignee_id = $1),
			  count(*) FILTER (WHERE status <> 'Done' AND due_date BETWEEN $2::date AND $2::date + 6),
			  count(*) FILTER (WHERE status <> 'Done' AND due_date < $2::date),
			  count(*) FILTER (WHERE status = 'Done' AND updated_at >= $3),
			  (SELECT count(*) FROM meetings WHERE starts_at >= now() AND starts_at < now() + interval '7 days')
			FROM work_items`, auth.FromContext(r.Context()).ID, today, monthStart).Scan(
			&s.ActiveProjects, &s.OpenWorkItems, &s.AssignedToMe, &s.DueThisWeek, &s.Overdue,
			&s.CompletedThisMonth, &s.UpcomingMeetings)
		return s, err
	})
}
