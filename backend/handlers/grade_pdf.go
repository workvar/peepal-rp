package handlers

// Grade report PDF download. Students get their own transcript; admins and
// teachers may download any student's via ?studentId=. The grade maths is
// reused from the GraphQL resolver layer (graph.AcademicResultForStudent).

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

func DownloadGradeReportPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	role := middleware.UserRole(c)

	var (
		student models.Student
		err     error
	)
	switch role {
	case string(models.RoleStudent):
		student, err = graph.LoadStudentByUser(c.Context(), database.DB, tenantID, userID)
	case string(models.RoleAdmin), string(models.RoleTeacher), string(models.RoleSuperAdmin):
		sid := c.Query("studentId")
		if sid == "" {
			return utils.BadRequest(c, "studentId is required")
		}
		student, err = graph.LoadStudentByID(c.Context(), database.DB, tenantID, sid)
	default:
		return utils.Forbidden(c, "You cannot download grade reports")
	}
	if err != nil {
		return utils.NotFound(c, "Student not found")
	}

	result, err := graph.AcademicResultForStudent(c.Context(), database.DB, tenantID, student)
	if err != nil {
		return utils.InternalError(c, "Failed to compute the grade report")
	}

	pdfBytes, err := pdftemplate.BuildGradeReportPDF(result)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the grade report PDF")
	}

	return streamPDF(c, fmt.Sprintf("grade-report-%s.pdf", rollOrMe(student)), pdfBytes)
}
