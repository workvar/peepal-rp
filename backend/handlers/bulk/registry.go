package bulk

import (
	"fmt"
	"strings"
)

// MaxUploadBytes caps how large a CSV the client may upload. The frontend
// reads this through the schema endpoint and rejects oversized files before
// they reach the parser — saving both the user's browser and our server
// from having to chew through a multi-hundred-megabyte mistake.
//
// Mirrors the Fiber BodyLimit set in main.go; keep the two in sync.
const MaxUploadBytes int64 = 10 * 1024 * 1024 // 10 MiB

// FieldType declares how a CSV cell value should be parsed and validated.
type FieldType string

const (
	FieldString FieldType = "string"
	FieldInt    FieldType = "int"
	FieldFloat  FieldType = "float"
	FieldBool   FieldType = "bool"
	FieldDate   FieldType = "date"     // YYYY-MM-DD
	// FieldDateRange accepts either a single YYYY-MM-DD or a start..end range
	// (separators: "..", "to", "~", or a comma). Consumers expand it into one
	// value per day via ExpandDateRange — lets one CSV row cover many dates.
	FieldDateRange FieldType = "daterange"
	FieldEnum      FieldType = "enum"  // uses AllowedValues
	FieldEmail     FieldType = "email"
)

// Field describes a single CSV column for a resource.
// Keep this flat and JSON-friendly so the same struct can be shipped to the
// frontend verbatim — the dialog uses it for client-side validation.
type Field struct {
	Name          string    `json:"name"`           // csv header / json key
	Label         string    `json:"label"`          // human label
	Type          FieldType `json:"type"`
	Required      bool      `json:"required"`
	Description   string    `json:"description"`    // full explanation for PDF doc
	AllowedValues []string  `json:"allowed_values,omitempty"`
	Example       string    `json:"example,omitempty"`
	Min           *float64  `json:"min,omitempty"`
	Max           *float64  `json:"max,omitempty"`
	// When true, rows where this field is blank are silently skipped rather
	// than rejected — useful for truly optional numeric fields.
	SkipIfBlank   bool      `json:"skip_if_blank,omitempty"`
}

// RowResult is returned to the client for every submitted row so the user
// can see exactly which entries succeeded and which failed.
//
// Note: the created record's DB id is deliberately NOT serialized — the
// client already holds the submitted values for context and UUIDs are noise
// (and a small info leak) to the end user. The field is kept so tests /
// future server-side consumers can still read it internally.
type RowResult struct {
	Index   int    `json:"index"`   // 0-based row number within the submission
	Success bool   `json:"success"`
	ID      string `json:"-"`       // internal-only, not shipped to the client
	Error   string `json:"error,omitempty"`
}

// CreateFn persists a single validated row and returns the new record ID or
// an error. Receives the raw string map from the CSV (already trimmed) plus
// the authenticated user / tenant context. Keeping this as a plain function
// instead of an interface keeps the module wiring tiny.
type CreateFn func(ctx Ctx, row map[string]string) (id string, err error)

// Ctx is passed into every CreateFn so the handler can access tenant /
// actor info without reaching back into fiber.
type Ctx struct {
	TenantID  string
	ActorID   string
	ActorRole string
}

// Schema binds a logical resource (e.g. "users") to its CSV columns and the
// function that inserts one row.
type Schema struct {
	Resource     string     `json:"resource"`      // url slug: users, students…
	Title        string     `json:"title"`          // "Users", "Students"
	Description  string     `json:"description"`    // one-paragraph summary for PDF/UI
	RequireRole  []string   `json:"-"`              // e.g. ["admin"] — gated upstream too
	Fields       []Field    `json:"fields"`
	// ExampleRows overrides the default single example row in the CSV template.
	// When set, all rows are written instead of the auto-generated one.
	ExampleRows  [][]string `json:"-"`
	// Create inserts one row. May return fiber-style error strings — they
	// surface to the user in the per-row results.
	Create       CreateFn   `json:"-"`
}

// registry holds every registered resource. Access via Get / Register to
// avoid goroutine races (the registry is built once at startup).
var registry = map[string]*Schema{}

// Register adds a schema. Call from init() in each resource file.
func Register(s *Schema) {
	if s == nil || s.Resource == "" {
		panic("bulk: cannot register schema without resource key")
	}
	registry[s.Resource] = s
}

// Get looks a schema up by resource key.
func Get(resource string) (*Schema, bool) {
	s, ok := registry[resource]
	return s, ok
}

// List returns all registered resources, mostly for debugging.
func List() []*Schema {
	out := make([]*Schema, 0, len(registry))
	for _, s := range registry {
		out = append(out, s)
	}
	return out
}

// findField locates a field on a schema by its CSV header name.
func (s *Schema) findField(name string) *Field {
	for i := range s.Fields {
		if strings.EqualFold(s.Fields[i].Name, name) {
			return &s.Fields[i]
		}
	}
	return nil
}

// HeaderRow returns the CSV header line for template downloads.
func (s *Schema) HeaderRow() []string {
	hdr := make([]string, len(s.Fields))
	for i, f := range s.Fields {
		hdr[i] = f.Name
	}
	return hdr
}

// ExampleRow returns a filled-in sample row for the CSV template.
func (s *Schema) ExampleRow() []string {
	row := make([]string, len(s.Fields))
	for i, f := range s.Fields {
		row[i] = f.Example
	}
	return row
}

// TypeLabel is a short human-readable name for a field type (used in PDF docs).
func TypeLabel(f Field) string {
	switch f.Type {
	case FieldEnum:
		return "enum (" + strings.Join(f.AllowedValues, " | ") + ")"
	case FieldDate:
		return "date (YYYY-MM-DD)"
	case FieldDateRange:
		return "date or range (YYYY-MM-DD, or start..end / start to end)"
	default:
		return string(f.Type)
	}
}

// formatAllowed renders the allowed-values hint for error messages.
func formatAllowed(f Field) string {
	if len(f.AllowedValues) == 0 {
		return ""
	}
	return fmt.Sprintf(" (allowed: %s)", strings.Join(f.AllowedValues, ", "))
}
