package handlers

// Shared helpers for the PDF-download handlers (payslip, fee schedule, fee
// receipts, grade report). All PDFs are generated on the backend and streamed
// as a file download; the templates live in the pdf-template package.

import (
	"bytes"
	"collegeerp/database"
	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// streamPDF sends raw PDF bytes as a browser download with the given filename.
func streamPDF(c *fiber.Ctx, filename string, pdfBytes []byte) error {
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.SendStream(bytes.NewReader(pdfBytes))
}

// tenantName looks up a tenant's display name for PDF headers (non-fatal).
func tenantName(c *fiber.Ctx, tenantID string) string {
	var t models.Tenant
	_ = database.DB.WithContext(c.Context()).Where("id = ?", tenantID).First(&t).Error
	return t.Name
}

// feeMetaFor builds the identity header block from a student row + tenant name.
func feeMetaFor(student models.Student, institute string) pdftemplate.FeeMeta {
	name := "-"
	if student.User.ID != "" && student.User.Name != "" {
		name = student.User.Name
	}
	course := "-"
	if student.Course.ID != "" && student.Course.Name != "" {
		course = student.Course.Name
	}
	roll := student.RollNumber
	if roll == "" {
		roll = "-"
	}
	return pdftemplate.FeeMeta{
		Institute:   institute,
		StudentName: name,
		RollNumber:  roll,
		CourseName:  course,
		TenantID:    student.TenantID,
	}
}

// rollOrMe returns a filename-safe roll number, defaulting to "me".
func rollOrMe(student models.Student) string {
	if student.RollNumber == "" {
		return "me"
	}
	return student.RollNumber
}
