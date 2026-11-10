package projects

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dialog-finance/df-pmp/api/internal/auth"
	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

type fakeRepo struct{ created *validated }

func (f *fakeRepo) List(context.Context) ([]Project, error)                    { return []Project{}, nil }
func (f *fakeRepo) Get(context.Context, string) (Project, error)               { return Project{}, httpx.ErrNotFound }
func (f *fakeRepo) Delete(context.Context, string) error                       { return nil }
func (f *fakeRepo) Update(context.Context, string, validated) (Project, error) { return Project{}, nil }
func (f *fakeRepo) Create(_ context.Context, in validated) (Project, error) {
	f.created = &in
	return Project{ID: "DF-PROJ-100", Name: in.Name}, nil
}

type fakeCatalog struct{}

func (fakeCatalog) Workflow() (catalog.Workflow, error) {
	return catalog.Workflow{ProjectStatuses: []string{"Planning"}, Tones: []string{"blue"}}, nil
}

func serve(t *testing.T, repo *fakeRepo, method, path, body string, perms ...string) *httptest.ResponseRecorder {
	t.Helper()
	mux := http.NewServeMux()
	Handler{Repo: repo, Catalog: fakeCatalog{}}.Register(mux)
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req = req.WithContext(auth.WithPrincipal(req.Context(), &auth.Principal{ID: 1, Permissions: perms}))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

const validBody = `{"name":"  Payments Hub ","description":"","ownerId":2,"status":"Planning","tone":"blue","progress":10,"startDate":"2026-12-01","endDate":"2027-01-01"}`

func TestCreateProject(t *testing.T) {
	repo := &fakeRepo{}
	rec := serve(t, repo, http.MethodPost, "/api/v1/projects", validBody, "project:create")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	if repo.created == nil || repo.created.Name != "Payments Hub" {
		t.Fatalf("expected trimmed name to reach the repository, got %+v", repo.created)
	}
}

func TestCreateProjectRequiresPermission(t *testing.T) {
	repo := &fakeRepo{}
	rec := serve(t, repo, http.MethodPost, "/api/v1/projects", validBody, "project:view")
	if rec.Code != http.StatusForbidden || repo.created != nil {
		t.Fatalf("status %d, created %v", rec.Code, repo.created)
	}
}

func TestCreateProjectValidates(t *testing.T) {
	body := `{"name":"P","ownerId":0,"status":"Unknown","tone":"pink","progress":120,"startDate":"2027-01-02","endDate":"2027-01-01"}`
	rec := serve(t, &fakeRepo{}, http.MethodPost, "/api/v1/projects", body, "project:create")
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d", rec.Code)
	}
	for _, field := range []string{"name", "ownerId", "status", "tone", "progress", "endDate"} {
		if !strings.Contains(rec.Body.String(), `"`+field+`"`) {
			t.Errorf("missing field error for %s: %s", field, rec.Body)
		}
	}
}

func TestGetMissingProjectReturns404(t *testing.T) {
	rec := serve(t, &fakeRepo{}, http.MethodGet, "/api/v1/projects/NOPE", "", "project:view")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d", rec.Code)
	}
}
