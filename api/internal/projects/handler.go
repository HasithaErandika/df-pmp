package projects

import (
	"context"
	"net/http"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Repository is the persistence contract the handler depends on.
type Repository interface {
	List(ctx context.Context) ([]Project, error)
	Get(ctx context.Context, id string) (Project, error)
	Create(ctx context.Context, in validated) (Project, error)
	Update(ctx context.Context, id string, in validated) (Project, error)
	Delete(ctx context.Context, id string) error
}

// Handler exposes project endpoints.
type Handler struct {
	Repo    Repository
	Catalog interface {
		Workflow() (catalog.Workflow, error)
	}
}

// Register mounts routes on mux with their required permissions.
func (h Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/projects", auth.Require("project:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() ([]Project, error) { return h.Repo.List(r.Context()) })
	}))
	mux.HandleFunc("GET /api/v1/projects/{id}", auth.Require("project:view", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Project, error) { return h.Repo.Get(r.Context(), r.PathValue("id")) })
	}))
	mux.HandleFunc("POST /api/v1/projects", auth.Require("project:create", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusCreated, func() (Project, error) {
			in, err := h.decode(w, r)
			if err != nil {
				return Project{}, err
			}
			return h.Repo.Create(r.Context(), in)
		})
	}))
	mux.HandleFunc("PUT /api/v1/projects/{id}", auth.Require("project:update", func(w http.ResponseWriter, r *http.Request) {
		httpx.Respond(w, r, http.StatusOK, func() (Project, error) {
			in, err := h.decode(w, r)
			if err != nil {
				return Project{}, err
			}
			return h.Repo.Update(r.Context(), r.PathValue("id"), in)
		})
	}))
	mux.HandleFunc("DELETE /api/v1/projects/{id}", auth.Require("project:delete", func(w http.ResponseWriter, r *http.Request) {
		httpx.NoContent(w, r, func() error { return h.Repo.Delete(r.Context(), r.PathValue("id")) })
	}))
}

func (h Handler) decode(w http.ResponseWriter, r *http.Request) (validated, error) {
	wf, err := h.Catalog.Workflow()
	if err != nil {
		return validated{}, err
	}
	return httpx.DecodeValid(w, r, func(in Input) (validated, error) { return in.Validate(wf) })
}
