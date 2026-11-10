package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "data"
	}
	configDir := os.Getenv("CONFIG_DIR")
	if configDir == "" {
		configDir = "config"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"df-pmp-api"}`))
	})
	mux.HandleFunc("GET /api/v1", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"name": "df-pmp API", "version": "v1", "status": "ready"})
	})
	mux.HandleFunc("GET /api/v1/config", func(w http.ResponseWriter, r *http.Request) {
		serveJSONFile(w, r, filepath.Join(configDir, "app.json"))
	})
	mux.HandleFunc("GET /api/v1/dashboard", func(w http.ResponseWriter, r *http.Request) {
		serveJSONFile(w, r, filepath.Join(dataDir, "dashboard.json"))
	})
	mux.HandleFunc("GET /api/v1/calendar", func(w http.ResponseWriter, r *http.Request) {
		var events []calendarEvent
		if err := readJSONFile(filepath.Join(dataDir, "calendar.json"), &events); err != nil {
			writeError(w, http.StatusInternalServerError, "calendar data is unavailable")
			return
		}
		from, err := parseDateBound(r.URL.Query().Get("from"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "from must use YYYY-MM-DD format")
			return
		}
		to, err := parseDateBound(r.URL.Query().Get("to"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "to must use YYYY-MM-DD format")
			return
		}
		if !from.IsZero() && !to.IsZero() && to.Before(from) {
			writeError(w, http.StatusBadRequest, "to must be on or after from")
			return
		}
		filtered := make([]calendarEvent, 0, len(events))
		for _, event := range events {
			startsAt, parseErr := time.Parse(time.RFC3339, event.StartsAt)
			if parseErr != nil {
				writeError(w, http.StatusInternalServerError, "calendar data contains an invalid event date")
				return
			}
			date := startsAt.Format("2006-01-02")
			if (!from.IsZero() && date < from.Format("2006-01-02")) || (!to.IsZero() && date > to.Format("2006-01-02")) {
				continue
			}
			filtered = append(filtered, event)
		}
		writeJSON(w, http.StatusOK, filtered)
	})

	webOrigin := os.Getenv("WEB_ORIGIN")
	if webOrigin == "" {
		webOrigin = "http://localhost:5173"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           requestLog(logger, cors(webOrigin, mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info("starting df-pmp API", "port", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("API server stopped", "error", err)
		os.Exit(1)
	}
}

type calendarEvent struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Type         string `json:"type"`
	Tone         string `json:"tone"`
	StartsAt     string `json:"startsAt"`
	EndsAt       string `json:"endsAt"`
	Location     string `json:"location"`
	Participants int    `json:"participants"`
	Project      string `json:"project"`
}

func serveJSONFile(w http.ResponseWriter, r *http.Request, name string) {
	data, err := os.ReadFile(name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("unable to load %s", filepath.Base(name)))
		return
	}
	var value json.RawMessage
	if err := json.Unmarshal(data, &value); err != nil {
		writeError(w, http.StatusInternalServerError, "configuration data is invalid")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(value)
	_, _ = w.Write([]byte("\n"))
}

func readJSONFile(name string, target any) error {
	data, err := os.ReadFile(name)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

func parseDateBound(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, nil
	}
	return time.Parse("2006-01-02", value)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func cors(origin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requestOrigin := r.Header.Get("Origin"); requestOrigin == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requestLog(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("http request", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(started).Milliseconds())
	})
}
