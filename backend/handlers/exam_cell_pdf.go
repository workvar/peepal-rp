package handlers

// Exam-cell PDF downloads: question papers and hall tickets. CRUD for both is
// GraphQL; only the binary streams live here. The loaders come from the graph
// package so a printed document is built from exactly the same shape the page
// renders.

import (
	"fmt"

	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/middleware"
	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// DownloadQuestionPaperPDF streams a generated paper. Drafts carry a DRAFT
// watermark, applied by the template from the paper's own status.
func DownloadQuestionPaperPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	paper, err := graph.QuestionPaperForPDF(c.Context(), database.DB, tenantID, c.Params("id"))
	if err != nil {
		return utils.NotFound(c, "Question paper not found")
	}

	pdfBytes, err := pdftemplate.BuildQuestionPaperPDF(tenantName(c, tenantID), paper)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the question paper PDF")
	}
	return streamPDF(c, fmt.Sprintf("question-paper-%s.pdf", paper.ID), pdfBytes)
}

// DownloadHallTicketPDF streams one student's admit card for the exam office.
func DownloadHallTicketPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	ticket, err := graph.HallTicketForPDF(c.Context(), database.DB, tenantID, c.Params("id"))
	if err != nil {
		return utils.NotFound(c, "Hall ticket not found")
	}

	pdfBytes, err := pdftemplate.BuildHallTicketPDF(tenantName(c, tenantID), tenantID, ticket)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the hall ticket PDF")
	}
	return streamPDF(c, fmt.Sprintf("hall-ticket-%s.pdf", ticket.TicketNumber), pdfBytes)
}

// DownloadMyHallTicketPDF is the student self-service download. The ticket is
// resolved from the caller's own student row, never from a client-supplied id,
// so one student can never pull another's card.
func DownloadMyHallTicketPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	if middleware.UserRole(c) != string(models.RoleStudent) {
		return utils.Forbidden(c, "Only students can download their own hall ticket")
	}
	examScheduleID := c.Query("examScheduleId")
	if examScheduleID == "" {
		return utils.BadRequest(c, "examScheduleId is required")
	}

	student, err := graph.LoadStudentByUser(c.Context(), database.DB, tenantID, userID)
	if err != nil {
		return utils.NotFound(c, "Student not found")
	}
	ticket, err := graph.HallTicketForStudent(c.Context(), database.DB, tenantID, student.ID, examScheduleID)
	if err != nil {
		return utils.NotFound(c, "No hall ticket has been issued to you for this exam")
	}
	// A held or revoked card is deliberately not downloadable — the student
	// should clear the hold with the office rather than print an invalid pass.
	if !ticket.Eligible || ticket.Status != models.HallTicketIssued {
		return utils.Forbidden(c, "Your hall ticket is on hold. Please contact the exam office.")
	}

	pdfBytes, err := pdftemplate.BuildHallTicketPDF(tenantName(c, tenantID), tenantID, ticket)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the hall ticket PDF")
	}
	return streamPDF(c, fmt.Sprintf("hall-ticket-%s.pdf", ticket.TicketNumber), pdfBytes)
}
