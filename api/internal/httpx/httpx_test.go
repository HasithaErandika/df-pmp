package httpx

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidatorKeepsFirstMessagePerField(t *testing.T) {
	var v Validator
	v.Check(false, "name", "first")
	v.Check(false, "name", "second")
	v.Check(true, "other", "ignored")
	var ve *ValidationError
	if !errors.As(v.Err(), &ve) {
		t.Fatal("expected a validation error")
	}
	if got := ve.Fields["name"]; got != "first" || len(ve.Fields) != 1 {
		t.Fatalf("unexpected fields: %v", ve.Fields)
	}
}

func TestValidatorText(t *testing.T) {
	cases := map[string]struct {
		in      string
		wantErr bool
	}{
		"trimmed ok": {"  ok  ", false},
		"empty":      {"   ", true},
		"too long":   {strings.Repeat("a", 11), true},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			var v Validator
			got := v.Text("f", tc.in, 1, 10, "Field")
			if (v.Err() != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr %v", v.Err(), tc.wantErr)
			}
			if !tc.wantErr && got != "ok" {
				t.Fatalf("got %q, want trimmed value", got)
			}
		})
	}
}

func TestDecodeRejectsUnknownFieldsAndTrailingData(t *testing.T) {
	for _, body := range []string{`{"name":"a","extra":1}`, `{"name":"a"}{}`, `not json`} {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		var target struct{ Name string }
		if err := Decode(httptest.NewRecorder(), req, &target); err == nil {
			t.Errorf("expected error for body %s", body)
		}
	}
}

func TestFailMapsErrors(t *testing.T) {
	cases := map[error]int{
		ErrNotFound:                     http.StatusNotFound,
		&ValidationError{Fields: nil}:   http.StatusUnprocessableEntity,
		errors.New("database exploded"): http.StatusInternalServerError,
	}
	for err, want := range cases {
		rec := httptest.NewRecorder()
		Fail(rec, httptest.NewRequest(http.MethodGet, "/", nil), err)
		if rec.Code != want {
			t.Errorf("%v: status %d, want %d", err, rec.Code, want)
		}
		if strings.Contains(rec.Body.String(), "exploded") {
			t.Error("internal error details leaked to the client")
		}
	}
}

func TestCORSAllowsOnlyConfiguredOrigin(t *testing.T) {
	h := CORS("http://app")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	for origin, want := range map[string]string{"http://app": "http://app", "http://evil": ""} {
		req := httptest.NewRequest(http.MethodOptions, "/", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != want {
			t.Errorf("origin %s: allow-origin %q, want %q", origin, got, want)
		}
	}
}
