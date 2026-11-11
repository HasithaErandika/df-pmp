package tracker

import (
	"testing"

	"github.com/dialog-finance/df-pmp/api/internal/catalog"
)

var wf = catalog.Workflow{
	TrackerStatuses: []string{"To do", "In progress", "Completed"},
	ReleaseTypes:    []string{"VA fixes"},
	ReleaseStatuses: []string{"Planned", "Released"},
}

func TestTaskValidateNormalisesOwnersAndTarget(t *testing.T) {
	in := TaskInput{Board: "infra", Title: " DR Drill ", Owners: []string{"Aruna", " aruna ", "", "Chirath"}, Status: "In progress"}
	out, err := in.Validate(wf)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Title != "DR Drill" || len(out.Owners) != 2 || out.target != nil || out.done != "Completed" {
		t.Fatalf("got %+v", out)
	}
	in.TargetDate = "2026-12-15"
	if out, _ = in.Validate(wf); out.target == nil || out.target.Format("2006-01-02") != "2026-12-15" {
		t.Fatalf("target not parsed: %v", out.target)
	}
}

func TestTaskValidateRejectsUnknownStatusAndBadDate(t *testing.T) {
	_, err := TaskInput{Board: "infra", Title: "PAM", Status: "Done", TargetDate: "31/10"}.Validate(wf)
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestReleaseValidate(t *testing.T) {
	ok := ReleaseInput{ReleaseDate: "2026-11-20", Title: "VA fixes", Type: "VA fixes", Status: "Planned", SanityTest: "Applicable"}
	if _, err := ok.Validate(wf); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	bad := ok
	bad.SanityTest = "Maybe"
	if _, err := bad.Validate(wf); err == nil {
		t.Fatal("expected sanity test validation error")
	}
}
