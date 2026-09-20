package handlers

// Generic bulk-upload guide PDF endpoint. The GraphQL-loop bulk dialogs
// (events, timetable, subjects, curriculum, exam-types, exam schedules,
// manager) define their field schemas on the frontend, so they POST the schema
// here and the backend renders the PDF. This keeps all PDF generation on the
// server (template lives in the pdf-template package) without duplicating those
// schemas in Go.

import (
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

type bulkGuideFieldReq struct {
	Name          string   `json:"name"`
	TypeLabel     string   `json:"typeLabel"`
	Required      bool     `json:"required"`
	Description   string   `json:"description"`
	AllowedValues []string `json:"allowedValues"`
	Example       string   `json:"example"`
}

type bulkGuideReq struct {
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Fields      []bulkGuideFieldReq `json:"fields"`
}

// BulkGuidePDF renders a posted field-guide spec to a PDF download.
func BulkGuidePDF(c *fiber.Ctx) error {
	var body bulkGuideReq
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid JSON body")
	}
	if body.Title == "" {
		return utils.BadRequest(c, "title is required")
	}

	fields := make([]pdftemplate.BulkGuideField, len(body.Fields))
	for i, f := range body.Fields {
		fields[i] = pdftemplate.BulkGuideField{
			Name:          f.Name,
			TypeLabel:     f.TypeLabel,
			Required:      f.Required,
			Description:   f.Description,
			AllowedValues: f.AllowedValues,
			Example:       f.Example,
		}
	}

	pdfBytes, err := pdftemplate.BuildBulkGuidePDF(pdftemplate.BulkGuideSpec{
		Title:       body.Title,
		Description: body.Description,
		Fields:      fields,
	})
	if err != nil {
		return utils.InternalError(c, "Failed to generate the guide PDF")
	}
	return streamPDF(c, "bulk_upload_guide.pdf", pdfBytes)
}
