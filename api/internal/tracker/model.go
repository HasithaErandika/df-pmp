// Package tracker manages delivery task boards (Fintech, Infra) and the release calendar
// that replaced the shared Excel trackers.
package tracker

import (
	"strings"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Board groups tracker tasks, e.g. Fintech or Infra.
type Board struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Tone        string `json:"tone"`
	Total       int    `json:"total"`
	Open        int    `json:"open"`
}

// Task is a tracked delivery item. TargetDate is the current target (nil = to be decided);
// TargetHistory holds every earlier target, oldest first, so slippage stays visible.
type Task struct {
	ID            string     `json:"id"`
	Board         string     `json:"board"`
	RefNo         *int       `json:"refNo"`
	Title         string     `json:"title"`
	Owners        []string   `json:"owners"`
	BUOwner       string     `json:"buOwner"`
	Status        string     `json:"status"`
	TargetDate    *string    `json:"targetDate"`
	TargetHistory []string   `json:"targetHistory"`
	Remarks       string     `json:"remarks"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	CompletedAt   *time.Time `json:"completedAt"`
}

// TaskInput is the writable subset of a task. An empty targetDate means "to be decided".
type TaskInput struct {
	Board      string   `json:"board"`
	Title      string   `json:"title"`
	Owners     []string `json:"owners"`
	BUOwner    string   `json:"buOwner"`
	Status     string   `json:"status"`
	TargetDate string   `json:"targetDate"`
	Remarks    string   `json:"remarks"`
}

// Update is an entry in a task's progress log.
type Update struct {
	ID        int64     `json:"id"`
	Kind      string    `json:"kind"`
	Body      string    `json:"body"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"createdAt"`
}

type validTask struct {
	TaskInput
	target *time.Time
	done   string
}

// Validate normalises a task against the configured tracker statuses.
func (in TaskInput) Validate(wf catalog.Workflow) (validTask, error) {
	var v httpx.Validator
	out := validTask{TaskInput: in, done: wf.TrackerDoneStatus()}
	out.Board = strings.TrimSpace(in.Board)
	v.Check(out.Board != "", "board", "Choose a board.")
	out.Title = v.Text("title", in.Title, 2, 300, "Title")
	out.BUOwner = v.Text("buOwner", in.BUOwner, 0, 120, "BU/PO owner")
	out.Remarks = v.Text("remarks", in.Remarks, 0, 2000, "Remarks")
	v.Check(catalog.OneOf(in.Status, wf.TrackerStatuses), "status", "Choose a valid status.")
	out.Owners = cleanList(in.Owners)
	v.Check(len(out.Owners) <= 10, "owners", "List at most 10 owners.")
	for _, owner := range out.Owners {
		v.Check(len([]rune(owner)) <= 80, "owners", "Owner names must be 80 characters or fewer.")
	}
	if t := v.OptionalDate("targetDate", in.TargetDate); !t.IsZero() {
		out.target = &t
	}
	return out, v.Err()
}

// Release is a scheduled or completed production release.
type Release struct {
	ID          string    `json:"id"`
	ReleaseDate string    `json:"releaseDate"`
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	Systems     string    `json:"systems"`
	Layer       string    `json:"layer"`
	TechOwner   string    `json:"techOwner"`
	BUSpoc      string    `json:"buSpoc"`
	SanityTest  string    `json:"sanityTest"`
	QASpoc      string    `json:"qaSpoc"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ReleaseInput is the writable subset of a release.
type ReleaseInput struct {
	ReleaseDate string `json:"releaseDate"`
	Title       string `json:"title"`
	Type        string `json:"type"`
	Systems     string `json:"systems"`
	Layer       string `json:"layer"`
	TechOwner   string `json:"techOwner"`
	BUSpoc      string `json:"buSpoc"`
	SanityTest  string `json:"sanityTest"`
	QASpoc      string `json:"qaSpoc"`
	Status      string `json:"status"`
	Notes       string `json:"notes"`
}

var sanityValues = []string{"", "Applicable", "Not applicable"}

type validRelease struct {
	ReleaseInput
	date time.Time
}

// Validate normalises a release against the configured release vocabularies.
func (in ReleaseInput) Validate(wf catalog.Workflow) (validRelease, error) {
	var v httpx.Validator
	out := validRelease{ReleaseInput: in}
	out.date = v.Date("releaseDate", in.ReleaseDate)
	out.Title = v.Text("title", in.Title, 2, 300, "Release")
	v.Check(catalog.OneOf(in.Type, wf.ReleaseTypes), "type", "Choose a valid type.")
	v.Check(catalog.OneOf(in.Status, wf.ReleaseStatuses), "status", "Choose a valid status.")
	v.Check(catalog.OneOf(in.SanityTest, sanityValues), "sanityTest", "Choose a valid sanity test value.")
	out.Systems = v.Text("systems", in.Systems, 0, 300, "Systems")
	out.Layer = v.Text("layer", in.Layer, 0, 80, "Layer")
	out.TechOwner = v.Text("techOwner", in.TechOwner, 0, 120, "Tech owner")
	out.BUSpoc = v.Text("buSpoc", in.BUSpoc, 0, 120, "BU SPOC")
	out.QASpoc = v.Text("qaSpoc", in.QASpoc, 0, 120, "Dev/QA SPOC")
	out.Notes = v.Text("notes", in.Notes, 0, 2000, "Notes")
	return out, v.Err()
}

// cleanList trims entries, drops blanks and removes case-insensitive duplicates.
func cleanList(values []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[strings.ToLower(value)] {
			continue
		}
		seen[strings.ToLower(value)] = true
		out = append(out, value)
	}
	return out
}
