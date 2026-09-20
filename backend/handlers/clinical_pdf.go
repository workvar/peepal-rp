package handlers

// Clinical invoice PDF download (healthcare industry). Billing CRUD is
// GraphQL; only the binary PDF streams over REST, like the other document
// downloads. Patients have no login, so downloads are staff-side only.

import (
	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/middleware"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// DownloadInvoicePDF streams one invoice (with payment history) as a PDF.
// Route-guarded to admin/staff; the invoice is always scoped to the caller's
// tenant so cross-tenant ids simply 404.
func DownloadInvoicePDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if id == "" {
		return utils.BadRequest(c, "Invoice id is required")
	}

	inv, err := graph.InvoiceForPDF(c.Context(), database.DB, tenantID, id)
	if err != nil {
		return utils.NotFound(c, "Invoice not found")
	}

	pdfBytes, err := pdftemplate.BuildInvoicePDF(tenantName(c, tenantID), inv)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the invoice PDF")
	}
	return streamPDF(c, fmt.Sprintf("%s.pdf", safeReceiptName(inv.InvoiceNo)), pdfBytes)
}

// DownloadDischargeSummaryPDF streams a discharged admission's summary as a PDF.
// Route-guarded to admin/staff; the admission is scoped to the caller's tenant.
func DownloadDischargeSummaryPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if id == "" {
		return utils.BadRequest(c, "Admission id is required")
	}

	adm, err := graph.AdmissionForPDF(c.Context(), database.DB, tenantID, id)
	if err != nil {
		return utils.NotFound(c, "Admission not found")
	}

	pdfBytes, err := pdftemplate.BuildDischargeSummaryPDF(tenantName(c, tenantID), adm)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the discharge summary PDF")
	}
	return streamPDF(c, fmt.Sprintf("discharge-%s.pdf", safeReceiptName(adm.PatientMrn)), pdfBytes)
}
