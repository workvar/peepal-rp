package pdftemplate

// Bulk-upload field-guide PDF. Drives off a neutral spec so two callers can
// share it without a package cycle: the REST bulk framework (which maps its
// registered Schema → spec) and the generic /bulk-guides/pdf endpoint (which
// renders a spec posted by the frontend's GraphQL-loop bulk dialogs).

import "strings"

// BulkGuideField is one CSV column described in the guide.
type BulkGuideField struct {
	Name          string
	TypeLabel     string // human label, e.g. "enum (a | b)" or "date (YYYY-MM-DD)"
	Required      bool
	Description   string
	AllowedValues []string
	Example       string
}

// BulkGuideSpec is the full guide: a heading, intro, and field reference.
type BulkGuideSpec struct {
	Title       string
	Description string
	Fields      []BulkGuideField
}

// BuildBulkGuidePDF renders a bulk-upload field guide.
func BuildBulkGuidePDF(spec BulkGuideSpec) ([]byte, error) {
	d := NewDoc()

	title := spec.Title
	if title == "" {
		title = "Bulk Upload"
	}
	d.H1("Bulk Upload Guide: " + title)
	d.Space(2)
	if spec.Description != "" {
		d.Body(spec.Description)
	}

	d.Space(4)
	d.H2("Field reference")
	d.Body("Each column in your CSV must use the exact header shown below. Rows " +
		"missing a required field are rejected. Dates use the ISO format " +
		"YYYY-MM-DD. Booleans accept true/false, yes/no, or 1/0.")
	d.Space(2)

	for _, f := range spec.Fields {
		req := "  (optional)"
		if f.Required {
			req = "  (required)"
		}
		d.H3(f.Name + req)
		if f.TypeLabel != "" {
			d.Italic("Type: " + f.TypeLabel)
		}
		if f.Description != "" {
			d.Body(f.Description)
		}
		if len(f.AllowedValues) > 0 {
			d.Body("Allowed values: " + strings.Join(f.AllowedValues, ", "))
		}
		if f.Example != "" {
			d.Body("Example: " + f.Example)
		}
		d.Space(3)
	}

	d.Italic("Tip: the CSV template in this dialog already has the correct headers and sample rows.")
	return d.Bytes()
}
