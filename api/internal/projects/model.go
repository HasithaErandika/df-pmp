// Package projects manages the project portfolio.
package projects

import (
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Project is the API representation of a project.
type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OwnerID     int64     `json:"ownerId"`
	OwnerName   string    `json:"ownerName"`
	Status      string    `json:"status"`
	Tone        string    `json:"tone"`
	Progress    int       `json:"progress"`
	StartDate   string    `json:"startDate"`
	EndDate     string    `json:"endDate"`
	OpenItems   int       `json:"openItems"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Input is the writable subset of a project.
type Input struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	OwnerID     int64  `json:"ownerId"`
	Status      string `json:"status"`
	Tone        string `json:"tone"`
	Progress    int    `json:"progress"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
}

// validated is Input after normalisation.
type validated struct {
	Input
	start, end time.Time
}

// Validate normalises the input against the configured vocabularies.
func (in Input) Validate(wf catalog.Workflow) (validated, error) {
	var v httpx.Validator
	out := validated{Input: in}
	out.Name = v.Text("name", in.Name, 2, 120, "Project name")
	out.Description = v.Text("description", in.Description, 0, 2000, "Description")
	v.Check(in.OwnerID > 0, "ownerId", "Choose a project owner.")
	v.Check(catalog.OneOf(in.Status, wf.ProjectStatuses), "status", "Choose a valid status.")
	v.Check(catalog.OneOf(in.Tone, wf.Tones), "tone", "Choose a valid colour.")
	v.Check(in.Progress >= 0 && in.Progress <= 100, "progress", "Progress must be between 0 and 100.")
	out.start = v.Date("startDate", in.StartDate)
	out.end = v.Date("endDate", in.EndDate)
	if !out.start.IsZero() && !out.end.IsZero() {
		v.Check(!out.end.Before(out.start), "endDate", "Finish date must be on or after the start date.")
	}
	return out, v.Err()
}
