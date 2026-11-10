package workitems

import (
	"context"
	"net/http"
	"strconv"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Repository is the persistence contract the handler depends on.
type Repository interface {
	List(ctx context.Context, f Filter) ([]WorkItem, error)
	Get(ctx context.Context, id string) (WorkItem, error)
	Create(ctx context.Context, in validated) (WorkItem, error)
	Update(ctx context.Context, id string, in validated) (WorkItem, error)
	Delete(ctx context.Context, id string) error
}

// Handler exposes work item endpoints.
type Handler struct {
	Repo    Repository
	Catalog interface {
		Workflow() (catalog.Workflow, error)
	}
}

// Register mounts routes on mux with their required permissions.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/work-items", auth.Require("work:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]WorkItem, error) {
			f, err := parseFilter(r)
			if err != nil {
				return nil, err
			}
			return h.Repo.List(r.Context(), f)
		})
	}))
	mux.HandleFunc("GET /api/v1/work-items/{id}", auth.Require("work:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (WorkItem, error) { return h.Repo.Get(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("POST /api/v1/work-items", auth.Require("work:create", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusCreated, func() (WorkItem, error) {
			in, err := h.decode(w, r)
			if err != nil {
				return WorkItem{}, err
			}
			return h.Repo.Create(r.Context(), in)
		})
	}))
	mux.HandleFunc("PUT /api/v1/work-items/{id}", auth.Require("work:update", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (WorkItem, error) {
			in, err := h.decode(w, r)
			if err != nil {
				return WorkItem{}, err
			}
			return h.Repo.Update(r.Context(), r.PathValue("id"), in)
		})
	}))
	mux.HandleFunc("DELETE /api/v1/work-items/{id}", auth.Require("work:delete", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error { return h.Repo.Delete(r.Context(), r.PathValue("id")) })
	}))
}

// parseFilter reads ?projectId= and ?assignee= (a user ID or "me").
func parseFilter(r *http.Request) (Filter, error) {
	q := r.URL.Query()
	f := Filter{ProjectID: q.Get("projectId")}
	switch assignee := q.Get("assignee"); assignee {
	case "":
	case "me":
		f.AssigneeID = auth.FromContext(r.Context()).ID
	default:
		id, err := strconv.ParseInt(assignee, 10, 64)
		if err != nil || id <= 0 {
			return f, &httpx.ValidationError{Fields: map[string]string{"assignee": "Use a user ID or \"me\"."}}
		}
		f.AssigneeID = id
	}
	return f, nil
}

func (h Handler) decode(w http.ResponseWriter, r *http.Request) (validated, error) {
	wf, err := h.Catalog.Workflow()
	if err != nil {
		return validated{}, err
	}
	return httpx.DecodeValid(w, r, func(in Input) (validated, error) { return in.Validate(wf) })
}
