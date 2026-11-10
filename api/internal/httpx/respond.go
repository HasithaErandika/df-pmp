// Package httpx contains shared HTTP helpers: JSON responses, request decoding and middleware.
package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

const maxBodyBytes = 1 << 20

// ErrNotFound is returned by stores when a record does not exist.
var ErrNotFound = errors.New("not found")

// ValidationError reports field-level problems back to the client.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string { return fmt.Sprintf("validation failed: %v", e.Fields) }

// Validator accumulates field errors.
type Validator struct{ fields map[string]string }

// Check records message for field when ok is false. The first message per field wins.
func (v *Validator) Check(ok bool, field, message string) {
	if ok {
		return
	}
	if v.fields == nil {
		v.fields = map[string]string{}
	}
	if _, exists := v.fields[field]; !exists {
		v.fields[field] = message
	}
}

// Err returns a *ValidationError when any check failed, otherwise nil.
func (v *Validator) Err() error {
	if len(v.fields) == 0 {
		return nil
	}
	return &ValidationError{Fields: v.fields}
}

// JSON writes value as a JSON response.
func JSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if value != nil {
		_ = json.NewEncoder(w).Encode(value)
	}
}

// Error writes a JSON error body.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// Fail maps domain errors to HTTP responses without leaking internals.
func Fail(w http.ResponseWriter, r *http.Request, err error) {
	var validation *ValidationError
	switch {
	case errors.As(err, &validation):
		JSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Please correct the highlighted fields.", "fields": validation.Fields})
	case errors.Is(err, ErrNotFound):
		Error(w, http.StatusNotFound, "The requested record was not found.")
	default:
		slog.ErrorContext(r.Context(), "request failed", "error", err, "path", r.URL.Path, "request_id", RequestID(r.Context()))
		Error(w, http.StatusInternalServerError, "Something went wrong. Please try again.")
	}
}

// Decode reads a bounded JSON body into target, rejecting unknown fields.
func Decode(w http.ResponseWriter, r *http.Request, target any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return &ValidationError{Fields: map[string]string{"body": "Request body must be valid JSON."}}
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		return &ValidationError{Fields: map[string]string{"body": "Request body must contain a single JSON object."}}
	}
	return nil
}
