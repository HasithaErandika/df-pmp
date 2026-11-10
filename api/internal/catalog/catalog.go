// Package catalog serves editable application configuration: branding, theme and workflow vocabularies.
// The file is read on each use so administrators can change values without a deployment.
package catalog

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"slices"

	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Workflow lists the values accepted for configurable fields.
type Workflow struct {
	ProjectStatuses  []string `json:"projectStatuses"`
	WorkItemStatuses []string `json:"workItemStatuses"`
	WorkItemTypes    []string `json:"workItemTypes"`
	Priorities       []string `json:"priorities"`
	Tones            []string `json:"tones"`
}

// App is the application configuration document.
type App struct {
	ApplicationName    string            `json:"applicationName"`
	CompanyName        string            `json:"companyName"`
	ProductDescription string            `json:"productDescription"`
	Timezone           string            `json:"timezone"`
	LogoPath           string            `json:"logoPath"`
	StatusTones        map[string]string `json:"statusTones"`
	Theme              map[string]string `json:"theme"`
	Workflow           Workflow          `json:"workflow"`
}

// Source reads the configuration document from a directory.
type Source struct{ Dir string }

// Load parses and validates app.json.
func (s Source) Load() (App, error) {
	var app App
	data, err := os.ReadFile(filepath.Join(s.Dir, "app.json"))
	if err != nil {
		return app, fmt.Errorf("read app config: %w", err)
	}
	if err := json.Unmarshal(data, &app); err != nil {
		return app, fmt.Errorf("parse app config: %w", err)
	}
	w := app.Workflow
	if len(w.ProjectStatuses) == 0 || len(w.WorkItemStatuses) == 0 || len(w.WorkItemTypes) == 0 ||
		len(w.Priorities) == 0 || len(w.Tones) == 0 {
		return app, fmt.Errorf("app config workflow vocabularies must not be empty")
	}
	return app, nil
}

// Workflow returns only the workflow vocabularies.
func (s Source) Workflow() (Workflow, error) {
	app, err := s.Load()
	return app.Workflow, err
}

// Handler serves the configuration document.
func (s Source) Handler(w http.ResponseWriter, r *http.Request) {
	app, err := s.Load()
	if err != nil {
		httpx.Fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, app)
}

// OneOf reports whether value is in allowed.
func OneOf(value string, allowed []string) bool { return slices.Contains(allowed, value) }
