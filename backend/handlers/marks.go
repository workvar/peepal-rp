package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

func calculateGrade(obtained, max float64) string {
	if max == 0 {
		return "N/A"
	}
	pct := (obtained / max) * 100
	switch {
	case pct >= 90:
		return "O"
	case pct >= 80:
		return "A+"
	case pct >= 70:
		return "A"
	case pct >= 60:
		return "B+"
	case pct >= 50:
		return "B"
	case pct >= 40:
		return "C"
	default:
		return "F"
	}
}

// ListMarks returns marks for the authenticated tenant.
func ListMarks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	studentID := c.Query("student_id")
	subjectID := c.Query("subject_id")
	assessmentType := c.Query("assessment_type")
	semester := c.QueryInt("semester", 0)

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Student").Preload("Student.User")
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}
	if assessmentType != "" {
		query = query.Where("assessment_type = ?", assessmentType)
	}
	if semester > 0 {
		query = query.Where("semester = ?", semester)
	}

	// Students can only see their own marks
	role := c.Locals("role").(string)
	if role == string(models.RoleStudent) {
		userID := c.Locals("userID").(string)
		var student models.Student
		if err := database.DB.WithContext(c.Context()).Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&student).Error; err == nil {
			query = query.Where("student_id = ?", student.ID)
		}
	}

	var marks []models.Mark
	query.Order("created_at desc").Find(&marks)
	return utils.OK(c, marks, "")
}

type CreateMarkRequest struct {
	StudentID      string  `json:"student_id"`
	SubjectID      string  `json:"subject_id"`
	Subject        string  `json:"subject"` // fallback text if no SubjectID
	ExamType       string  `json:"exam_type"`
	AssessmentType string  `json:"assessment_type"`
	Semester       int     `json:"semester"`
	MarksObtained  float64 `json:"marks_obtained"`
	MaxMarks       float64 `json:"max_marks"`
	AcademicYearID string  `json:"academic_year_id"`
	Status         string  `json:"status"`
}

// CreateMark creates a new mark entry.
func CreateMark(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	var req CreateMarkRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.StudentID == "" {
		return utils.BadRequest(c, "student_id is required")
	}
	if req.MaxMarks <= 0 {
		return utils.BadRequest(c, "max_marks must be greater than 0")
	}
	if req.MarksObtained > req.MaxMarks {
		return utils.BadRequest(c, "marks_obtained cannot exceed max_marks")
	}

	// Use exam_type as assessment_type if assessment_type not provided
	assessmentType := req.AssessmentType
	if assessmentType == "" {
		assessmentType = req.ExamType
	}

	subjectText := req.Subject
	if subjectText == "" {
		subjectText = assessmentType
	}

	status := req.Status
	if status == "" {
		status = "draft"
	}

	mark := models.Mark{
		TenantID:       tenantID,
		StudentID:      req.StudentID,
		SubjectID:      req.SubjectID,
		Subject:        subjectText,
		ExamType:       req.ExamType,
		AssessmentType: assessmentType,
		Semester:       req.Semester,
		MarksObtained:  req.MarksObtained,
		MaxMarks:       req.MaxMarks,
		Grade:          calculateGrade(req.MarksObtained, req.MaxMarks),
		EnteredBy:      userID,
		AcademicYearID: req.AcademicYearID,
		Status:         status,
	}

	if err := database.DB.WithContext(c.Context()).Create(&mark).Error; err != nil {
		return utils.InternalError(c, "Could not save mark")
	}

	database.DB.WithContext(c.Context()).Preload("Student").Preload("Student.User").First(&mark, "id = ?", mark.ID)
	return utils.Created(c, mark, "Mark saved")
}

// UpdateMark updates an existing mark entry.
func UpdateMark(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var mark models.Mark
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&mark).Error; err != nil {
		return utils.NotFound(c, "Mark not found")
	}

	// Only admin can update approved marks
	role := c.Locals("role").(string)
	if mark.Status == "approved" && role != string(models.RoleAdmin) {
		return utils.BadRequest(c, "Cannot edit an approved mark")
	}

	var req CreateMarkRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.MarksObtained > 0 {
		mark.MarksObtained = req.MarksObtained
	}
	if req.MaxMarks > 0 {
		mark.MaxMarks = req.MaxMarks
	}
	if req.SubjectID != "" {
		mark.SubjectID = req.SubjectID
	}
	if req.Subject != "" {
		mark.Subject = req.Subject
	}
	if req.AssessmentType != "" {
		mark.AssessmentType = req.AssessmentType
	}
	if req.Status != "" {
		mark.Status = req.Status
	}
	if req.AcademicYearID != "" {
		mark.AcademicYearID = req.AcademicYearID
	}
	mark.Grade = calculateGrade(mark.MarksObtained, mark.MaxMarks)
	mark.UpdatedAt = time.Now()

	if err := database.DB.WithContext(c.Context()).Save(&mark).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	database.DB.WithContext(c.Context()).Preload("Student").Preload("Student.User").First(&mark, "id = ?", mark.ID)
	return utils.OK(c, mark, "Mark updated")
}
