package handlers

// Fee PDF downloads: a student's full payment schedule, all of their paid
// receipts in one file, and a single payment receipt. Students download their
// own; admins/staff can download any payment's receipt. The fee maths and
// preloads are reused from the GraphQL resolver layer (graph.* loaders).

import (
	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/middleware"
	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// DownloadMyFeeSchedulePDF streams the caller's own fee schedule.
func DownloadMyFeeSchedulePDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	student, err := graph.LoadStudentByUser(c.Context(), database.DB, tenantID, userID)
	if err != nil {
		return utils.NotFound(c, "No student profile linked to this account")
	}
	fees, err := graph.StudentFeesForStudent(c.Context(), database.DB, tenantID, student.ID)
	if err != nil {
		return utils.InternalError(c, "Failed to load your fees")
	}

	meta := feeMetaFor(student, tenantName(c, tenantID))
	pdfBytes, err := pdftemplate.BuildFeeSchedulePDF(meta, fees)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the fee schedule PDF")
	}
	return streamPDF(c, fmt.Sprintf("fee_schedule_%s.pdf", rollOrMe(student)), pdfBytes)
}

// DownloadMyFeeReceiptsPDF streams all of the caller's paid receipts, one per page.
func DownloadMyFeeReceiptsPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	student, err := graph.LoadStudentByUser(c.Context(), database.DB, tenantID, userID)
	if err != nil {
		return utils.NotFound(c, "No student profile linked to this account")
	}
	payments, err := graph.FeePaymentsForStudent(c.Context(), database.DB, tenantID, student.ID)
	if err != nil {
		return utils.InternalError(c, "Failed to load your payments")
	}
	labels := graph.InstallmentLabelsForStudent(c.Context(), database.DB, tenantID, student.ID)

	meta := feeMetaFor(student, tenantName(c, tenantID))
	pdfBytes, err := pdftemplate.BuildAllReceiptsPDF(meta, payments, labels)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the receipts PDF")
	}
	return streamPDF(c, fmt.Sprintf("fee_receipts_%s.pdf", rollOrMe(student)), pdfBytes)
}

// DownloadFeeReceiptPDF streams a single payment receipt by payment id.
// Admins/staff may download any; everyone else only their own.
func DownloadFeeReceiptPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	role := middleware.UserRole(c)
	id := c.Params("id")
	if id == "" {
		return utils.BadRequest(c, "Payment id is required")
	}

	payment, err := graph.FeePaymentByID(c.Context(), database.DB, tenantID, id)
	if err != nil {
		return utils.NotFound(c, "Payment not found")
	}

	privileged := role == string(models.RoleAdmin) ||
		role == string(models.RoleStaff) ||
		role == string(models.RoleSuperAdmin)

	// Resolve the student the receipt belongs to (for the identity header) and
	// enforce ownership for non-privileged callers.
	var student models.Student
	if privileged {
		student, _ = graph.LoadStudentByID(c.Context(), database.DB, tenantID, payment.StudentID)
	} else {
		student, err = graph.LoadStudentByUser(c.Context(), database.DB, tenantID, userID)
		if err != nil {
			return utils.Forbidden(c, "No student profile linked to this account")
		}
		if student.ID != payment.StudentID {
			return utils.Forbidden(c, "You can only download your own receipts")
		}
	}

	label := ""
	if payment.InstallmentID != nil {
		labels := graph.InstallmentLabelsForStudent(c.Context(), database.DB, tenantID, payment.StudentID)
		label = labels[*payment.InstallmentID]
	}

	meta := feeMetaFor(student, tenantName(c, tenantID))
	pdfBytes, err := pdftemplate.BuildFeeReceiptPDF(meta, payment, label)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the receipt PDF")
	}
	return streamPDF(c, fmt.Sprintf("receipt_%s.pdf", safeReceiptName(payment.ReceiptNumber)), pdfBytes)
}

// safeReceiptName strips characters that don't belong in a filename.
func safeReceiptName(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '.':
			out = append(out, r)
		default:
			out = append(out, '_')
		}
	}
	if len(out) == 0 {
		return "receipt"
	}
	return string(out)
}
