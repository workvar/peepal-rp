package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ── Subject Handlers ──────────────────────────────────────────

type CreateSubjectRequest struct {
	DepartmentID   string `json:"department_id"`
	Name           string `json:"name"`
	Code           string `json:"code"`
	Credits        int    `json:"credits"`
	TeachingHours  int    `json:"teaching_hours"`
	LabHours       int    `json:"lab_hours"`
	SemesterNumber int    `json:"semester_number"`
	Description    string `json:"description"`
	SyllabusURL    string `json:"syllabus_url"`
}

// ListSubjects returns all subjects for the authenticated tenant.
func ListSubjects(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	deptID := c.Query("department_id")
	semNum := c.QueryInt("semester_number", 0)

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Department")
	if deptID != "" {
		query = query.Where("department_id = ?", deptID)
	}
	if semNum > 0 {
		query = query.Where("semester_number = ?", semNum)
	}

	var subjects []models.Subject
	query.Find(&subjects)
	return utils.OK(c, subjects, "")
}

// CreateSubject creates a new subject (admin only).
func CreateSubject(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateSubjectRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.Code == "" {
		return utils.BadRequest(c, "Name and code are required")
	}

	subject := models.Subject{
		TenantID:       tenantID,
		DepartmentID:   req.DepartmentID,
		Name:           req.Name,
		Code:           req.Code,
		Credits:        req.Credits,
		TeachingHours:  req.TeachingHours,
		LabHours:       req.LabHours,
		SemesterNumber: req.SemesterNumber,
		Description:    req.Description,
		SyllabusURL:    req.SyllabusURL,
	}

	if err := database.DB.WithContext(c.Context()).Create(&subject).Error; err != nil {
		return utils.BadRequest(c, "Subject code already exists")
	}

	database.DB.WithContext(c.Context()).Preload("Department").First(&subject, "id = ?", subject.ID)
	return utils.Created(c, subject, "Subject created")
}

// UpdateSubject updates a subject (admin only).
func UpdateSubject(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var subject models.Subject
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&subject).Error; err != nil {
		return utils.NotFound(c, "Subject not found")
	}

	var req CreateSubjectRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		subject.Name = req.Name
	}
	if req.Code != "" {
		subject.Code = req.Code
	}
	if req.DepartmentID != "" {
		subject.DepartmentID = req.DepartmentID
	}
	if req.Credits > 0 {
		subject.Credits = req.Credits
	}
	if req.TeachingHours > 0 {
		subject.TeachingHours = req.TeachingHours
	}
	if req.LabHours >= 0 {
		subject.LabHours = req.LabHours
	}
	if req.SemesterNumber > 0 {
		subject.SemesterNumber = req.SemesterNumber
	}
	if req.Description != "" {
		subject.Description = req.Description
	}
	if req.SyllabusURL != "" {
		subject.SyllabusURL = req.SyllabusURL
	}
	subject.UpdatedAt = time.Now()

	if err := database.DB.WithContext(c.Context()).Save(&subject).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	database.DB.WithContext(c.Context()).Preload("Department").First(&subject, "id = ?", subject.ID)
	return utils.OK(c, subject, "Subject updated")
}

// DeleteSubject removes a subject (admin only).
func DeleteSubject(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Subject{}).Error; err != nil {
		return utils.NotFound(c, "Subject not found")
	}
	return utils.OK(c, nil, "Subject deleted")
}

// ── ExamSchedule Handlers ────────────────────────────────────

type CreateExamScheduleRequest struct {
	AcademicYearID string `json:"academic_year_id"`
	Name           string `json:"name"`
	ExamType       string `json:"exam_type"`
	SemesterNumber int    `json:"semester_number"`
	StartDate      string `json:"start_date"`
	EndDate        string `json:"end_date"`
	Instructions   string `json:"instructions"`
}

// ListExamSchedules returns exam schedules for the tenant.
func ListExamSchedules(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	yearID := c.Query("academic_year_id")
	published := c.Query("published")

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID)
	if yearID != "" {
		query = query.Where("academic_year_id = ?", yearID)
	}
	if published == "true" {
		query = query.Where("published = ?", true)
	}

	var exams []models.ExamSchedule
	query.Order("start_date asc").Find(&exams)
	return utils.OK(c, exams, "")
}

// CreateExamSchedule creates a new exam schedule (admin only).
func CreateExamSchedule(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateExamScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.ExamType == "" {
		return utils.BadRequest(c, "Name and exam_type are required")
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	exam := models.ExamSchedule{
		TenantID:       tenantID,
		AcademicYearID: req.AcademicYearID,
		Name:           req.Name,
		ExamType:       req.ExamType,
		SemesterNumber: req.SemesterNumber,
		StartDate:      startDate,
		EndDate:        endDate,
		Instructions:   req.Instructions,
	}

	if err := database.DB.WithContext(c.Context()).Create(&exam).Error; err != nil {
		return utils.InternalError(c, "Could not create exam schedule")
	}
	return utils.Created(c, exam, "Exam schedule created")
}

// UpdateExamSchedule updates an exam schedule (admin only).
func UpdateExamSchedule(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var exam models.ExamSchedule
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&exam).Error; err != nil {
		return utils.NotFound(c, "Exam schedule not found")
	}

	var req CreateExamScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		exam.Name = req.Name
	}
	if req.ExamType != "" {
		exam.ExamType = req.ExamType
	}
	if req.SemesterNumber > 0 {
		exam.SemesterNumber = req.SemesterNumber
	}
	if req.StartDate != "" {
		if d, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			exam.StartDate = d
		}
	}
	if req.EndDate != "" {
		if d, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			exam.EndDate = d
		}
	}
	if req.Instructions != "" {
		exam.Instructions = req.Instructions
	}
	if req.AcademicYearID != "" {
		exam.AcademicYearID = req.AcademicYearID
	}
	exam.UpdatedAt = time.Now()

	if err := database.DB.WithContext(c.Context()).Save(&exam).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, exam, "Exam schedule updated")
}

// PublishExamSchedule toggles published state (admin only).
func PublishExamSchedule(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var exam models.ExamSchedule
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&exam).Error; err != nil {
		return utils.NotFound(c, "Exam schedule not found")
	}

	exam.Published = !exam.Published
	exam.UpdatedAt = time.Now()
	if err := database.DB.WithContext(c.Context()).Save(&exam).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	msg := "Exam schedule published"
	if !exam.Published {
		msg = "Exam schedule unpublished"
	}
	return utils.OK(c, exam, msg)
}

// DeleteExamSchedule deletes an exam schedule (admin only).
func DeleteExamSchedule(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.ExamSchedule{}).Error; err != nil {
		return utils.NotFound(c, "Exam schedule not found")
	}
	return utils.OK(c, nil, "Exam schedule deleted")
}
