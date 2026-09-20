package bulk

import (
	"fmt"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// RowError is a single per-cell error found while validating a row.
type RowError struct {
	Index int    `json:"index"`
	Field string `json:"field"`
	Error string `json:"error"`
}

// ValidateRow runs the declared field validators against a raw string map.
// Returns all problems found (no short-circuit) so the UI can highlight
// every bad cell at once.
func (s *Schema) ValidateRow(index int, row map[string]string) []RowError {
	var errs []RowError
	for _, f := range s.Fields {
		raw := strings.TrimSpace(row[f.Name])
		if raw == "" {
			if f.Required {
				errs = append(errs, RowError{Index: index, Field: f.Name, Error: "required"})
			}
			continue
		}
		if msg := validateCell(f, raw); msg != "" {
			errs = append(errs, RowError{Index: index, Field: f.Name, Error: msg})
		}
	}
	return errs
}

// validateCell returns "" if the value is acceptable for the field, else an
// explanation string.
func validateCell(f Field, v string) string {
	switch f.Type {
	case FieldString:
		// no extra constraints unless enum-like via AllowedValues
		if len(f.AllowedValues) > 0 && !containsIgnoreCase(f.AllowedValues, v) {
			return "invalid value" + formatAllowed(f)
		}
	case FieldEmail:
		if _, err := mail.ParseAddress(v); err != nil {
			return "not a valid email"
		}
	case FieldInt:
		n, err := strconv.Atoi(v)
		if err != nil {
			return "expected an integer"
		}
		if f.Min != nil && float64(n) < *f.Min {
			return fmt.Sprintf("must be >= %v", *f.Min)
		}
		if f.Max != nil && float64(n) > *f.Max {
			return fmt.Sprintf("must be <= %v", *f.Max)
		}
	case FieldFloat:
		n, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return "expected a number"
		}
		if f.Min != nil && n < *f.Min {
			return fmt.Sprintf("must be >= %v", *f.Min)
		}
		if f.Max != nil && n > *f.Max {
			return fmt.Sprintf("must be <= %v", *f.Max)
		}
	case FieldBool:
		if !isBoolish(v) {
			return "expected true/false / yes/no / 1/0"
		}
	case FieldDate:
		if _, err := time.Parse("2006-01-02", v); err != nil {
			return "expected YYYY-MM-DD"
		}
	case FieldDateRange:
		if _, err := ExpandDateRange(v); err != nil {
			return err.Error()
		}
	case FieldEnum:
		if !containsIgnoreCase(f.AllowedValues, v) {
			return "invalid value" + formatAllowed(f)
		}
	}
	return ""
}

func containsIgnoreCase(pool []string, v string) bool {
	for _, p := range pool {
		if strings.EqualFold(p, v) {
			return true
		}
	}
	return false
}

func isBoolish(v string) bool {
	switch strings.ToLower(v) {
	case "true", "false", "yes", "no", "y", "n", "1", "0":
		return true
	}
	return false
}

// ParseBool accepts the same forms as isBoolish.
func ParseBool(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "true", "yes", "y", "1":
		return true
	}
	return false
}

// ParseInt returns 0 when v is blank.
func ParseInt(v string) int {
	v = strings.TrimSpace(v)
	if v == "" {
		return 0
	}
	n, _ := strconv.Atoi(v)
	return n
}

// ParseFloat returns 0 when v is blank.
func ParseFloat(v string) float64 {
	v = strings.TrimSpace(v)
	if v == "" {
		return 0
	}
	n, _ := strconv.ParseFloat(v, 64)
	return n
}

// ParseDate returns the zero time when v is blank or malformed.
func ParseDate(v string) time.Time {
	v = strings.TrimSpace(v)
	if v == "" {
		return time.Time{}
	}
	t, _ := time.Parse("2006-01-02", v)
	return t
}

// maxRangeDays caps how many days a single range cell may expand into, so a
// typo like "2020-01-01..2030-01-01" can't quietly create thousands of rows.
const maxRangeDays = 366

// dateRangeSep splits a range cell on any supported separator: "..", "~", a
// comma, an en/em dash, "->", or the word "to". Case-insensitive.
var dateRangeSep = regexp.MustCompile(`(?i)\s*(?:\.\.+|~|,|->|–|—|\bto\b)\s*`)

// ExpandDateRange turns a cell into the list of days it represents. It accepts
// a single date ("2026-04-20") or a start/end range ("2026-01-25..2026-02-10",
// "2026-01-25 to 2026-02-10", or a comma-separated pair). Returns an error
// string suitable for surfacing to the user on bad input.
func ExpandDateRange(v string) ([]time.Time, error) {
	parts := splitDateRange(v)
	switch len(parts) {
	case 0:
		return nil, fmt.Errorf("expected a date")
	case 1:
		d, err := parseISODate(parts[0])
		if err != nil {
			return nil, err
		}
		return []time.Time{d}, nil
	case 2:
		start, err := parseISODate(parts[0])
		if err != nil {
			return nil, err
		}
		end, err := parseISODate(parts[1])
		if err != nil {
			return nil, err
		}
		if end.Before(start) {
			return nil, fmt.Errorf("range end is before its start")
		}
		days := make([]time.Time, 0)
		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			days = append(days, d)
			if len(days) > maxRangeDays {
				return nil, fmt.Errorf("range too large (max %d days)", maxRangeDays)
			}
		}
		return days, nil
	default:
		return nil, fmt.Errorf("use a single date or one start..end range")
	}
}

// splitDateRange breaks a cell into its date parts, dropping blanks.
func splitDateRange(v string) []string {
	raw := dateRangeSep.Split(strings.TrimSpace(v), -1)
	out := make([]string, 0, len(raw))
	for _, p := range raw {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// parseISODate parses one YYYY-MM-DD value with a friendly error message.
func parseISODate(v string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", strings.TrimSpace(v))
	if err != nil {
		return time.Time{}, fmt.Errorf("expected YYYY-MM-DD, got %q", v)
	}
	return t, nil
}
