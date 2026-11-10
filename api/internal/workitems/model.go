// Package workitems manages tasks, actions and milestones within projects.
package workitems

import (
	"strings"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/catalog"
	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// WorkItem is the API representation of a work item.
type WorkItem struct {
	ID           string    `json:"id"`
	ProjectID    string    `json:"projectId"`
	ProjectName  string    `json:"projectName"`
	Subject      string    `json:"subject"`
	Type         string    `json:"type"`
	Status       string    `json:"status"`
	Priority     string    `json:"priority"`
	AssigneeID   *int64    `json:"assigneeId"`
	AssigneeName string    `json:"assigneeName"`
	DueDate      string    `json:"dueDate"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Input is the writable subset of a work item.
type Input struct {
	ProjectID  string `json:"projectId"`
	Subject    string `json:"subject"`
	Type       string `json:"type"`
	Status     string `json:"status"`
	Priority   string `json:"priority"`
	AssigneeID *int64 `json:"assigneeId"`
	DueDate    string `json:"dueDate"`
}

// Filter narrows list results.
type Filter struct {
	ProjectID  string
	AssigneeID int64
}

type validated struct {
	Input
	due time.Time
}

// Validate normalises the input against configured vocabularies.
func (in Input) Validate(wf catalog.Workflow) (validated, error) {
	var v httpx.Validator
	out := validated{Input: in}
	out.ProjectID = strings.TrimSpace(in.ProjectID)
	v.Check(out.ProjectID != "", "projectId", "Choose a project.")
	out.Subject = v.Text("subject", in.Subject, 2, 200, "Subject")
	v.Check(catalog.OneOf(in.Type, wf.WorkItemTypes), "type", "Choose a valid type.")
	v.Check(catalog.OneOf(in.Status, wf.WorkItemStatuses), "status", "Choose a valid status.")
	v.Check(catalog.OneOf(in.Priority, wf.Priorities), "priority", "Choose a valid priority.")
	v.Check(in.AssigneeID == nil || *in.AssigneeID > 0, "assigneeId", "Choose a valid assignee.")
	out.due = v.Date("dueDate", in.DueDate)
	return out, v.Err()
}
