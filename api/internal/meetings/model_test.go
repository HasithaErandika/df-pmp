package meetings

import (
	"slices"
	"testing"
)

func TestValidateMeeting(t *testing.T) {
	empty := ""
	in := Input{
		Title: " Weekly sync ", TypeID: "operations", ProjectID: &empty,
		StartsAt: "2026-11-14T14:30:00+05:30", EndsAt: "2026-11-14T15:30:00+05:30",
		ParticipantIDs: []int64{3, 1, 3},
	}
	out, err := in.Validate()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Title != "Weekly sync" || out.ProjectID != nil {
		t.Fatalf("not normalised: %+v", out.Input)
	}
	if !slices.Equal(out.ParticipantIDs, []int64{1, 3}) {
		t.Fatalf("participants not de-duplicated: %v", out.ParticipantIDs)
	}
}

func TestValidateMeetingRejectsInvertedTimes(t *testing.T) {
	in := Input{Title: "Sync", TypeID: "itssc", StartsAt: "2026-11-14T15:00:00Z", EndsAt: "2026-11-14T14:00:00Z"}
	if _, err := in.Validate(); err == nil {
		t.Fatal("expected an error when the meeting ends before it starts")
	}
}
