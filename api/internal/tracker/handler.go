package tracker

import (
	"net/http"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Handler exposes task tracker and release calendar endpoints.
type Handler struct {
	Store   Store
	Catalog interface {
		Workflow() (catalog.Workflow, error)
	}
}

// Register mounts routes on mux with their required permissions.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/tracker/boards", auth.Require("tracker:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Board, error) {
			wf, err := h.Catalog.Workflow()
			if err != nil {
				return nil, err
			}
			return h.Store.Boards(r.Context(), wf.TrackerDoneStatus())
		})
	}))
	mux.HandleFunc("GET /api/v1/tracker/boards/{board}/tasks", auth.Require("tracker:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Task, error) { return h.Store.List(r.Context(), r.PathValue("board")) })
	}))
	mux.HandleFunc("POST /api/v1/tracker/tasks", auth.Require("tracker:create", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusCreated, func() (Task, error) {
			in, err := decode(h, w, r, TaskInput.Validate)
			if err != nil {
				return Task{}, err
			}
			return h.Store.Create(r.Context(), in)
		})
	}))
	mux.HandleFunc("PUT /api/v1/tracker/tasks/{id}", auth.Require("tracker:update", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Task, error) {
			in, err := decode(h, w, r, TaskInput.Validate)
			if err != nil {
				return Task{}, err
			}
			return h.Store.Update(r.Context(), r.PathValue("id"), in)
		})
	}))
	mux.HandleFunc("DELETE /api/v1/tracker/tasks/{id}", auth.Require("tracker:delete", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error { return h.Store.Delete(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("GET /api/v1/tracker/tasks/{id}/updates", auth.Require("tracker:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Update, error) { return h.Store.Updates(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("POST /api/v1/tracker/tasks/{id}/updates", auth.Require("tracker:update", h.addNote))
	h.registerReleases(mux)
}

func (h Handler) registerReleases(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/tracker/releases", auth.Require("tracker:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Release, error) { return h.Store.Releases(r.Context()) })
	}))
	mux.HandleFunc("POST /api/v1/tracker/releases", auth.Require("tracker:create", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusCreated, func() (Release, error) {
			in, err := decode(h, w, r, ReleaseInput.Validate)
			if err != nil {
				return Release{}, err
			}
			return h.Store.CreateRelease(r.Context(), in)
		})
	}))
	mux.HandleFunc("PUT /api/v1/tracker/releases/{id}", auth.Require("tracker:update", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Release, error) {
			in, err := decode(h, w, r, ReleaseInput.Validate)
			if err != nil {
				return Release{}, err
			}
			return h.Store.UpdateRelease(r.Context(), r.PathValue("id"), in)
		})
	}))
	mux.HandleFunc("DELETE /api/v1/tracker/releases/{id}", auth.Require("tracker:delete", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error { return h.Store.DeleteRelease(r.Context(), r.PathValue("id")) })
	}))
}

func (h Handler) addNote(w http.ResponseWriter, r *http.Request) {
	httpx.Respond(w, r, http.StatusCreated, func() ([]Update, error) {
		body, err := httpx.DecodeValid(w, r, func(in struct {
			Body string `json:"body"`
		}) (string, error) {
			var v httpx.Validator
			text := v.Text("body", in.Body, 1, 2000, "Update")
			return text, v.Err()
		})
		if err != nil {
			return nil, err
		}
		id := r.PathValue("id")
		if err := h.Store.AddNote(r.Context(), id, body); err != nil {
			return nil, err
		}
		return h.Store.Updates(r.Context(), id)
	})
}

// decode reads a request body and validates it against the current workflow vocabularies.
func decode[In any, Out any](h Handler, w http.ResponseWriter, r *http.Request, validate func(In, catalog.Workflow) (Out, error)) (Out, error) {
	wf, err := h.Catalog.Workflow()
	if err != nil {
		var zero Out
		return zero, err
	}
	return httpx.DecodeValid(w, r, func(in In) (Out, error) { return validate(in, wf) })
}
