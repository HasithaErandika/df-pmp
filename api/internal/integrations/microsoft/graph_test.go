package microsoft

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/oauth2"
)

var token = oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"})

func fakeGraph(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return &Client{BaseURL: srv.URL, HTTP: srv.Client(), App: token}
}

func TestSearchUsersSendsAdvancedQueryHeaders(t *testing.T) {
	c := fakeGraph(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("ConsistencyLevel") != "eventual" || r.Header.Get("Authorization") != "Bearer test-token" {
			t.Errorf("missing headers: %v", r.Header)
		}
		if q := r.URL.Query().Get("$search"); !strings.Contains(q, `"displayName:nad"`) {
			t.Errorf("unexpected $search %q", q)
		}
		_, _ = io.WriteString(w, `{"value":[{"id":"1","displayName":"Nadeesha","mail":"","userPrincipalName":"Nadeesha@Corp.com"}]}`)
	})
	users, err := c.SearchUsers(context.Background(), token, `nad"`, 10)
	if err != nil || len(users) != 1 || users[0].Email() != "nadeesha@corp.com" {
		t.Fatalf("users=%v err=%v", users, err)
	}
}

func TestDelegatedCallsRequireToken(t *testing.T) {
	c := &Client{BaseURL: "http://unused"}
	if _, err := c.SearchUsers(context.Background(), nil, "abc", 5); !errors.Is(err, ErrNotConnected) {
		t.Fatalf("err = %v, want ErrNotConnected", err)
	}
}

func TestCreateEventPayload(t *testing.T) {
	var body map[string]any
	c := fakeGraph(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/me/events" {
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		_, _ = io.WriteString(w, `{"id":"evt","iCalUId":"uid","onlineMeeting":{"joinUrl":"https://teams/join"}}`)
	})
	start := time.Date(2026, 11, 12, 10, 0, 0, 0, time.FixedZone("LK", 19800))
	ev, err := c.CreateEvent(context.Background(), token, EventInput{
		TransactionID: "tx", Subject: "Review", Start: start, End: start.Add(time.Hour), Teams: true,
		Attendees: []Attendee{{Name: "A", Email: "a@corp.com"}},
	})
	if err != nil || ev.OnlineMeeting.JoinURL != "https://teams/join" {
		t.Fatalf("event=%+v err=%v", ev, err)
	}
	startBody := body["start"].(map[string]any)
	if startBody["dateTime"] != "2026-11-12T04:30:00" || startBody["timeZone"] != "UTC" {
		t.Errorf("start not converted to UTC: %v", startBody)
	}
	if body["onlineMeetingProvider"] != "teamsForBusiness" || body["transactionId"] != "tx" {
		t.Errorf("missing teams/transaction fields: %v", body)
	}
}

func TestGraphErrorIsDecoded(t *testing.T) {
	c := fakeGraph(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = io.WriteString(w, `{"error":{"code":"ErrorAccessDenied","message":"Access is denied."}}`)
	})
	_, err := c.GetUser(context.Background(), token, "x")
	if !IsStatus(err, http.StatusForbidden) || !strings.Contains(err.Error(), "Access is denied") {
		t.Fatalf("err = %v", err)
	}
}

func TestUploadSendsChunkedRanges(t *testing.T) {
	var ranges []string
	var got bytes.Buffer
	var srvURL string
	c := fakeGraph(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/createUploadSession"):
			_, _ = io.WriteString(w, `{"uploadUrl":"`+srvURL+`/upload"}`)
		case r.URL.Path == "/upload":
			if r.Header.Get("Authorization") != "" {
				t.Error("upload URL must not receive the bearer token")
			}
			ranges = append(ranges, r.Header.Get("Content-Range"))
			_, _ = io.Copy(&got, r.Body)
			if got.Len() < 6<<20 {
				w.WriteHeader(http.StatusAccepted)
				return
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = io.WriteString(w, `{"id":"file","name":"plan.pdf"}`)
		}
	})
	srvURL = c.BaseURL
	sp := &SharePoint{Client: c, SiteURL: "https://x.sharepoint.com/sites/a", driveID: "drive"}
	data := bytes.Repeat([]byte("a"), 6<<20)
	item, err := sp.Upload(context.Background(), "folder", "plan.pdf", int64(len(data)), bytes.NewReader(data))
	if err != nil || item.ID != "file" || got.Len() != len(data) {
		t.Fatalf("item=%+v err=%v bytes=%d", item, err, got.Len())
	}
	if len(ranges) != 2 || ranges[0] != "bytes 0-5242879/6291456" {
		t.Fatalf("ranges = %v", ranges)
	}
}

func TestSafeName(t *testing.T) {
	if got := SafeName(` a/b:c?.  `); got != "a-b-c-" {
		t.Fatalf("SafeName = %q", got)
	}
}

func TestListEncodesQuery(t *testing.T) {
	c := fakeGraph(t, func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("$orderby"); got != "lastModifiedDateTime desc" {
			t.Errorf("$orderby = %q", got)
		}
		_, _ = io.WriteString(w, `{"value":[{"id":"1","name":"a.pdf"}]}`)
	})
	sp := &SharePoint{Client: c, SiteURL: "https://x.sharepoint.com/sites/a", driveID: "drive"}
	items, err := sp.List(context.Background(), "folder")
	if err != nil || len(items) != 1 {
		t.Fatalf("items=%v err=%v", items, err)
	}
}
