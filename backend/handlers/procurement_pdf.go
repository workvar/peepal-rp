package handlers

// Purchase order PDF download. Procurement CRUD is GraphQL; only the binary PDF
// streams over REST. Guarded to admin/staff; the PO is scoped to the caller's
// tenant so cross-tenant ids simply 404.

import (
	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/middleware"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// DownloadPurchaseOrderPDF streams one purchase order as a PDF.
func DownloadPurchaseOrderPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if id == "" {
		return utils.BadRequest(c, "Purchase order id is required")
	}
	po, err := graph.PurchaseOrderForPDF(c.Context(), database.DB, tenantID, id)
	if err != nil {
		return utils.NotFound(c, "Purchase order not found")
	}
	pdfBytes, err := pdftemplate.BuildPurchaseOrderPDF(tenantName(c, tenantID), tenantID, po)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the purchase order PDF")
	}
	return streamPDF(c, fmt.Sprintf("%s.pdf", safeReceiptName(po.PoNumber)), pdfBytes)
}
