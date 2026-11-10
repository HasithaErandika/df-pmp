package httpx

import (
	"strings"
	"time"
)

// DateLayout is the wire format for calendar dates.
const DateLayout = "2006-01-02"

// Date parses a required YYYY-MM-DD value, recording a field error when invalid.
func (v *Validator) Date(field, value string) time.Time {
	parsed, err := time.Parse(DateLayout, strings.TrimSpace(value))
	v.Check(err == nil, field, "Enter a valid date.")
	return parsed
}

// Time parses a required RFC 3339 timestamp, recording a field error when invalid.
func (v *Validator) Time(field, value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	v.Check(err == nil, field, "Enter a valid date and time.")
	return parsed
}

// Text trims value and checks its length is within [min, max] runes.
func (v *Validator) Text(field, value string, min, max int, label string) string {
	value = strings.TrimSpace(value)
	n := len([]rune(value))
	switch {
	case n == 0 && min > 0:
		v.Check(false, field, label+" is required.")
	case n < min:
		v.Check(false, field, label+" is too short.")
	case n > max:
		v.Check(false, field, label+" is too long.")
	}
	return value
}

// OptionalDate parses value when present. An empty value yields the zero time.
func (v *Validator) OptionalDate(field, value string) time.Time {
	if strings.TrimSpace(value) == "" {
		return time.Time{}
	}
	return v.Date(field, value)
}
