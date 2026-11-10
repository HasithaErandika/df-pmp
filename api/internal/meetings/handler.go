package meetings

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Repository is the persistence contract the handler depends on.
type Repository interface {
	Types(ctx context.Context) ([]Type, error)
	List(ctx context.Context, rg Range) ([]Meeting, error)
	Get(ctx context.Context, id string) (Meeting, error)
	Save(ctx context.Context, id string, in validated) (Meeting, error)
	Delete(ctx context.Context, id string) error
}

// Handler exposes meeting endpoints.
type Handler struct {
	Repo     Repository
	TimeZone func() (*time.Location, error)
	Outlook  *Outlook // nil when Microsoft 365 is not configured
}

// Register mounts routes on mux with their required permissions.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/meeting-types", auth.Require("meeting:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Type, error) { return h.Repo.Types(r.Context()) })
	}))
	mux.HandleFunc("GET /api/v1/meetings", auth.Require("meeting:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Meeting, error) {
			rg, err := h.parseRange(r)
			if err != nil {
				return nil, err
			}
			return h.Repo.List(r.Context(), rg)
		})
	}))
	mux.HandleFunc("GET /api/v1/meetings/{id}", auth.Require("meeting:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Meeting, error) { return h.Repo.Get(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("POST /api/v1/meetings", auth.Require("meeting:create", h.save("", http.StatusCreated)))
	mux.HandleFunc("PUT /api/v1/meetings/{id}", auth.Require("meeting:update", func(w http.ResponseWriter, r *http.Request) {
		h.save(r.PathValue("id"), http.StatusOK)(w, r)
	}))
	mux.HandleFunc("DELETE /api/v1/meetings/{id}", auth.Require("meeting:delete", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error {
			if h.Outlook != nil {
				if err := h.Outlook.Cancel(r.Context(), r.PathValue("id"), auth.FromContext(r.Context())); err != nil {
					return err
				}
			}
			return h.Repo.Delete(r.Context(), r.PathValue("id"))
		})
	}))
	mux.HandleFunc("POST /api/v1/meetings/{id}/outlook-sync", auth.Require("meeting:update", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Meeting, error) { return h.sync(r, r.PathValue("id")) })
	}))
	h.registerOutlook(mux)
}

// sync pushes the meeting to Outlook (recording any failure on the meeting) and returns its latest state.
func (h Handler) sync(r *http.Request, id string) (Meeting, error) {
	if h.Outlook != nil {
		if err := h.Outlook.Sync(r.Context(), id, auth.FromContext(r.Context())); err != nil {
			slog.ErrorContext(r.Context(), "outlook sync failed", "meeting", id, "error", err)
		}
	}
	return h.Repo.Get(r.Context(), id)
}

func (h Handler) save(id string, status int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, status, func() (Meeting, error) {
			in, err := httpx.DecodeValid(w, r, Input.Validate)
			if err != nil {
				return Meeting{}, err
			}
			saved, err := h.Repo.Save(r.Context(), id, in)
			if err != nil {
				return Meeting{}, err
			}
			return h.sync(r, saved.ID)
		})
	}
}

// parseRange reads ?from= and ?to= as dates in the configured time zone.
func (h Handler) parseRange(r *http.Request) (Range, error) {
	loc, err := h.TimeZone()
	if err != nil {
		return Range{}, err
	}
	var v httpx.Validator
	q := r.URL.Query()
	from := v.OptionalDate("from", q.Get("from"))
	to := v.OptionalDate("to", q.Get("to"))
	if !from.IsZero() && !to.IsZero() {
		v.Check(!to.Before(from), "to", "The end date must be on or after the start date.")
	}
	var rg Range
	if !from.IsZero() {
		rg.From = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, loc)
	}
	if !to.IsZero() {
		rg.To = time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, loc)
	}
	return rg, v.Err()
}
