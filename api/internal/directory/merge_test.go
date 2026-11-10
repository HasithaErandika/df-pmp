package directory

import (
	"testing"

	ms "github.com/dialog-finance/df-pmp/api/internal/integrations/microsoft"
)

func TestMergeMarksLinkedAndSkipsDuplicates(t *testing.T) {
	one := int64(1)
	local := []Person{{LocalID: &one, EntraID: "oid-1", Email: "a@corp.com", Source: "local"}}
	found := []ms.DirectoryUser{
		{ID: "oid-1", Mail: "a@corp.com"},              // already listed locally
		{ID: "oid-2", Mail: "b@corp.com"},              // linked user not matched by text search
		{ID: "oid-3", UserPrincipalName: "C@corp.com"}, // new organization person
		{ID: "oid-4"}, // no address: cannot be invited, skipped
	}
	out := merge(local, found, map[string]int64{"oid-2": 7})
	if len(out) != 3 {
		t.Fatalf("got %d people: %+v", len(out), out)
	}
	if out[1].Source != "local" || out[1].LocalID == nil || *out[1].LocalID != 7 {
		t.Errorf("linked user should be local: %+v", out[1])
	}
	if out[2].Source != "entra" || out[2].Email != "c@corp.com" {
		t.Errorf("new person should come from entra with lower-case email: %+v", out[2])
	}
}
