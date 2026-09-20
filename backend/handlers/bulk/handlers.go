package bulk

import (
	"archive/zip"
	"bytes"
	"collegeerp/audit"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"encoding/csv"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// schemaEnvelope wraps a schema with server-side limits the client must
// respect (e.g. max upload size). Kept as a small struct so future knobs
// like chunk size, rate limits, or feature flags can ride along.
type schemaEnvelope struct {
	*Schema
	MaxFileSizeBytes int64 `json:"max_file_size_bytes"`
}

// Schemas returns the JSON schema for a single resource along with the
// server's upload limits. The frontend uses this to build its client-side
// validator & table, and to reject oversized files before parsing.
func Schemas(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}
	return utils.OK(c, schemaEnvelope{Schema: s, MaxFileSizeBytes: MaxUploadBytes}, "")
}

// ListResources returns every resource's schema, handy for the frontend to
// cache in one shot. Each entry is wrapped with the same limits envelope
// the single-resource endpoint returns.
func ListResources(c *fiber.Ctx) error {
	all := List()
	out := make([]schemaEnvelope, len(all))
	for i, s := range all {
		out[i] = schemaEnvelope{Schema: s, MaxFileSizeBytes: MaxUploadBytes}
	}
	return utils.OK(c, out, "")
}

// DownloadTemplate emits a CSV file containing the header row and a single
// example row so users can fill it in and upload.
func DownloadTemplate(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(s.HeaderRow())
	if len(s.ExampleRows) > 0 {
		for _, r := range s.ExampleRows {
			_ = w.Write(r)
		}
	} else {
		_ = w.Write(s.ExampleRow())
	}
	w.Flush()

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s_template.csv"`, resource))
	return c.Send(buf.Bytes())
}

// DownloadDocs renders a PDF with an overview + one section per field
// describing what to enter and the allowed values. Auto-generated from the
// schema (so it never drifts) using the shared pdf-template renderer.
func DownloadDocs(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}

	pdfBytes, err := pdftemplate.BuildBulkGuidePDF(schemaGuideSpec(s))
	if err != nil {
		return utils.InternalError(c, "Could not render PDF: "+err.Error())
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s_bulk_upload_guide.pdf"`, resource))
	return c.Send(pdfBytes)
}

// schemaGuideSpec maps a registered bulk Schema onto the neutral guide spec the
// pdf-template package consumes.
func schemaGuideSpec(s *Schema) pdftemplate.BulkGuideSpec {
	fields := make([]pdftemplate.BulkGuideField, len(s.Fields))
	for i, f := range s.Fields {
		fields[i] = pdftemplate.BulkGuideField{
			Name:          f.Name,
			TypeLabel:     TypeLabel(f),
			Required:      f.Required,
			Description:   f.Description,
			AllowedValues: f.AllowedValues,
			Example:       f.Example,
		}
	}
	return pdftemplate.BulkGuideSpec{Title: s.Title, Description: s.Description, Fields: fields}
}

// DownloadStarterKit returns a ZIP archive containing:
//   - instructions.txt  — human-readable field guide with allowed values and examples
//   - sample_<resource>.csv — template CSV with headers and one example row
//
// This lets admins download a self-contained starter package in a single click.
func DownloadStarterKit(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}

	asOf := time.Now().Format("2006-01-02")

	// Build instructions.txt.
	var instrBuf bytes.Buffer
	instrBuf.WriteString("CollERP Bulk Upload — " + s.Title + "\n")
	instrBuf.WriteString("As of " + asOf + "\n")
	instrBuf.WriteString(strings.Repeat("=", 60) + "\n\n")
	instrBuf.WriteString(s.Description + "\n\n")
	instrBuf.WriteString("HOW TO USE\n")
	instrBuf.WriteString("----------\n")
	instrBuf.WriteString("1. Open sample_" + resource + ".csv in your spreadsheet app.\n")
	instrBuf.WriteString("2. Fill in rows below the header. Delete the example row when done.\n")
	instrBuf.WriteString("3. Save as CSV (UTF-8).\n")
	instrBuf.WriteString("4. In the ERP, go to Users → Bulk Upload and upload the file.\n\n")
	instrBuf.WriteString("FIELD REFERENCE\n")
	instrBuf.WriteString("---------------\n")
	for _, f := range s.Fields {
		req := "optional"
		if f.Required {
			req = "REQUIRED"
		}
		instrBuf.WriteString("\n[" + f.Name + "] — " + f.Label + " (" + req + ")\n")
		instrBuf.WriteString("  Type   : " + TypeLabel(f) + "\n")
		if f.Description != "" {
			instrBuf.WriteString("  Info   : " + f.Description + "\n")
		}
		if len(f.AllowedValues) > 0 {
			instrBuf.WriteString("  Values : " + strings.Join(f.AllowedValues, ", ") + "\n")
		}
		if f.Example != "" {
			instrBuf.WriteString("  Example: " + f.Example + "\n")
		}
	}
	instrBuf.WriteString("\nNOTES\n")
	instrBuf.WriteString("-----\n")
	instrBuf.WriteString("- Dates must be in YYYY-MM-DD format.\n")
	instrBuf.WriteString("- Boolean fields accept: true, false, yes, no, 1, 0.\n")
	instrBuf.WriteString("- Leave optional fields blank — do NOT delete the column.\n")
	instrBuf.WriteString("- Rows with errors are skipped; successful rows are still saved.\n")
	instrBuf.WriteString("- This file was generated as of " + asOf + ". Re-download for updates.\n")

	// Build sample CSV.
	var csvBuf bytes.Buffer
	w := csv.NewWriter(&csvBuf)
	_ = w.Write(s.HeaderRow())
	_ = w.Write(s.ExampleRow())
	w.Flush()

	// Zip them together.
	var zipBuf bytes.Buffer
	zw := zip.NewWriter(&zipBuf)

	writeZipEntry := func(name string, data []byte) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = f.Write(data)
		return err
	}

	if err := writeZipEntry("instructions.txt", instrBuf.Bytes()); err != nil {
		return utils.InternalError(c, "Could not write instructions: "+err.Error())
	}
	if err := writeZipEntry("sample_"+resource+".csv", csvBuf.Bytes()); err != nil {
		return utils.InternalError(c, "Could not write CSV: "+err.Error())
	}
	if err := zw.Close(); err != nil {
		return utils.InternalError(c, "Could not finalise zip: "+err.Error())
	}

	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s_bulk_upload_starter.zip"`, resource))
	return c.Send(zipBuf.Bytes())
}

// ValidateBody is the JSON payload for /validate and /submit.
type ValidateBody struct {
	Rows []map[string]string `json:"rows"`
}

// ValidateRows runs server-side validation over the submitted rows and
// returns the full list of cell errors without touching the DB. The frontend
// calls this before showing the "ready to submit" state.
func ValidateRows(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}

	var body ValidateBody
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid JSON body")
	}
	if len(body.Rows) == 0 {
		return utils.BadRequest(c, "No rows provided")
	}

	var errors []RowError
	for i, r := range body.Rows {
		errors = append(errors, s.ValidateRow(i, r)...)
	}
	return utils.OK(c, fiber.Map{
		"errors": errors,
		"total":  len(body.Rows),
		"valid":  len(errors) == 0,
	}, "")
}

// SubmitRows validates each row, then invokes the schema's Create function
// per row and reports per-row outcomes. Rows that fail validation are
// reported alongside rows that failed to insert — the frontend renders the
// same success/failure list for both.
func SubmitRows(c *fiber.Ctx) error {
	resource := c.Params("resource")
	s, ok := Get(resource)
	if !ok {
		return utils.NotFound(c, "Unknown bulk resource: "+resource)
	}
	if s.Create == nil {
		return utils.InternalError(c, "Resource is read-only: "+resource)
	}

	var body ValidateBody
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid JSON body")
	}
	if len(body.Rows) == 0 {
		return utils.BadRequest(c, "No rows provided")
	}

	ctx := Ctx{
		TenantID:  middleware.TenantID(c),
		ActorID:   middleware.UserID(c),
		ActorRole: middleware.UserRole(c),
	}

	// Subscription quota: cap how many students/employees a single bulk upload
	// may add. remaining == -1 means no applicable limit (other resources, or an
	// unlimited plan). Rows beyond the limit are reported as failures, mirroring
	// how the GraphQL create resolvers reject over-quota inserts.
	remaining := -1
	if resource == models.QuotaStudents || resource == models.QuotaEmployees {
		if _, current, limit := models.ResourceAtLimit(database.DB, ctx.TenantID, resource); limit > 0 {
			if remaining = limit - current; remaining < 0 {
				remaining = 0
			}
		}
	}

	results := make([]RowResult, 0, len(body.Rows))
	var ok_, failed int

	for i, row := range body.Rows {
		// Re-validate — never trust a client that could have patched its UI.
		if errs := s.ValidateRow(i, row); len(errs) > 0 {
			msgs := make([]string, len(errs))
			for k, e := range errs {
				msgs[k] = e.Field + ": " + e.Error
			}
			results = append(results, RowResult{
				Index:   i,
				Success: false,
				Error:   strings.Join(msgs, "; "),
			})
			failed++
			continue
		}

		// Stop inserting once the subscription limit for this resource is hit.
		if remaining == 0 {
			results = append(results, RowResult{
				Index:   i,
				Success: false,
				Error:   "Subscription limit reached for " + resource + ". Upgrade your plan to add more.",
			})
			failed++
			continue
		}

		id, err := s.Create(ctx, row)
		if err != nil {
			results = append(results, RowResult{Index: i, Success: false, Error: err.Error()})
			failed++
			continue
		}
		results = append(results, RowResult{Index: i, Success: true, ID: id})
		ok_++
		if remaining > 0 {
			remaining--
		}
	}

	// Record the bulk upload in the audit trail, flagged as a bulk upload so it
	// is distinguishable from single-record actions. One summary entry per
	// submission; only logged when at least one row was created.
	if ok_ > 0 {
		audit.Record(audit.Entry{
			TenantID: ctx.TenantID, ActorID: ctx.ActorID, ActorRole: ctx.ActorRole,
			Action: models.AuditCreate, Module: resource, Operation: audit.OpBulkUpload,
			Detail: fmt.Sprintf("Bulk upload: %d created, %d failed (%s)", ok_, failed, resource),
			IP:     c.IP(),
		})
	}

	return utils.OK(c, fiber.Map{
		"results":    results,
		"total":      len(body.Rows),
		"successful": ok_,
		"failed":     failed,
	}, "Bulk upload complete")
}
