// Package meetings manages typed meetings such as ITSSC and Operations sessions.
package meetings

import (
	"slices"
	"strings"
	"time"

	"github.com/dialog-finance/df-pmp/api/internal/httpx"
)

// Meeting is the API representation of a meeting.
type Meeting struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	TypeID         string    `json:"typeId"`
	TypeName       string    `json:"typeName"`
	Tone           string    `json:"tone"`
	ProjectID      *string   `json:"projectId"`
	ProjectName    string    `json:"projectName"`
	StartsAt       time.Time `json:"startsAt"`
	EndsAt         time.Time `json:"endsAt"`
	Location       string    `json:"location"`
	Agenda         string    `json:"agenda"`
	ParticipantIDs []int64   `json:"participantIds"`
}

// Type is a configurable meeting category.
type Type struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Tone string `json:"tone"`
}

// Input is the writable subset of a meeting.
type Input struct {
	Title          string  `json:"title"`
	TypeID         string  `json:"typeId"`
	ProjectID      *string `json:"projectId"`
	StartsAt       string  `json:"startsAt"`
	EndsAt         string  `json:"endsAt"`
	Location       string  `json:"location"`
	Agenda         string  `json:"agenda"`
	ParticipantIDs []int64 `json:"participantIds"`
}

// Range limits listed meetings to calendar dates (inclusive) in the configured time zone.
type Range struct{ From, To time.Time }

type validated struct {
	Input
	starts, ends time.Time
}

// Validate normalises the input. Referential checks happen in the store.
func (in Input) Validate() (validated, error) {
	var v httpx.Validator
	out := validated{Input: in}
	out.Title = v.Text("title", in.Title, 2, 160, "Title")
	out.TypeID = strings.TrimSpace(in.TypeID)
	v.Check(out.TypeID != "", "typeId", "Choose a meeting type.")
	if in.ProjectID != nil && strings.TrimSpace(*in.ProjectID) == "" {
		out.ProjectID = nil
	}
	out.starts = v.Time("startsAt", in.StartsAt)
	out.ends = v.Time("endsAt", in.EndsAt)
	if !out.starts.IsZero() && !out.ends.IsZero() {
		v.Check(out.ends.After(out.starts), "endsAt", "End time must be after the start time.")
	}
	out.Location = v.Text("location", in.Location, 0, 160, "Location")
	out.Agenda = v.Text("agenda", in.Agenda, 0, 4000, "Agenda")
	v.Check(len(in.ParticipantIDs) <= 200, "participantIds", "Too many participants.")
	ids := slices.Clone(in.ParticipantIDs)
	slices.Sort(ids)
	out.ParticipantIDs = slices.Compact(ids)
	return out, v.Err()
}
