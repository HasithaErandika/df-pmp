package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireDeniesByDefault(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	cases := map[string]struct {
		principal *Principal
		want      int
	}{
		"anonymous":          {nil, http.StatusForbidden},
		"missing permission": {&Principal{Permissions: []string{"project:view"}}, http.StatusForbidden},
		"granted":            {&Principal{Permissions: []string{"project:create"}}, http.StatusOK},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", nil)
			if tc.principal != nil {
				req = req.WithContext(WithPrincipal(req.Context(), tc.principal))
			}
			rec := httptest.NewRecorder()
			Require("project:create", ok)(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestAuthenticateRejectsUnknownCaller(t *testing.T) {
	rec := httptest.NewRecorder()
	Authenticate(DisabledResolver{})(http.NotFoundHandler()).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d, want 401", rec.Code)
	}
}
