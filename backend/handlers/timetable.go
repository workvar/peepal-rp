package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// ListTimetable returns all slots for the caller's tenant, with optional
// filters for course_id, semester, section, day_of_week, and academic_year_id.
func ListTimetable(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	query := database.DB.WithContext(c.Context()).
		Preload("Course").
		Preload("Subject").
		Where("tenant_id = ?", tenantID)

	if v := c.Query("academic_year_id"); v != "" {
		query = query.Where("academic_year_id = ?", v)
	}
	if v := c.Query("course_id"); v != "" {
		query = query.Where("course_id = ?", v)
	}
	if v := c.Query("semester"); v != "" {
		query = query.Where("semester = ?", v)
	}
	if v := c.Query("section"); v != "" {
		query = query.Where("section = ?", v)
	}
	if v := c.Query("day_of_week"); v != "" {
		query = query.Where("day_of_week = ?", v)
	}
	if v := c.Query("employee_id"); v != "" {
		query = query.Where("employee_id = ?", v)
	}

	var slots []models.TimetableSlot
	query.Order("day_of_week, period_number").Find(&slots)

	return utils.OK(c, slots, "")
}

type CreateTimetableSlotRequest struct {
	AcademicYearID string `json:"academic_year_id"`
	CourseID       string `json:"course_id"`
	SubjectID      string `json:"subject_id"`
	EmployeeID     string `json:"employee_id"`
	DayOfWeek      string `json:"day_of_week"`
	PeriodNumber   int    `json:"period_number"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	Semester       int    `json:"semester"`
	Section        string `json:"section"`
	Room           string `json:"room"`
}

// CreateTimetableSlot adds a new slot. Admins only.
func CreateTimetableSlot(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateTimetableSlotRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.CourseID == "" || req.SubjectID == "" || req.DayOfWeek == "" || req.StartTime == "" || req.EndTime == "" || req.Semester == 0 {
		return utils.BadRequest(c, "course_id, subject_id, day_of_week, start_time, end_time, and semester are required")
	}

	slot := models.TimetableSlot{
		TenantID:       tenantID,
		AcademicYearID: req.AcademicYearID,
		CourseID:       req.CourseID,
		SubjectID:      req.SubjectID,
		EmployeeID:     req.EmployeeID,
		DayOfWeek:      models.DayOfWeek(req.DayOfWeek),
		PeriodNumber:   req.PeriodNumber,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		Semester:       req.Semester,
		Section:        req.Section,
		Room:           req.Room,
	}

	if err := database.DB.WithContext(c.Context()).Create(&slot).Error; err != nil {
		return utils.InternalError(c, "Failed to create timetable slot")
	}

	// Reload with associations
	database.DB.WithContext(c.Context()).Preload("Course").Preload("Subject").First(&slot, "id = ?", slot.ID)
	return utils.Created(c, slot, "Timetable slot created")
}

// UpdateTimetableSlot updates an existing slot. Admins only.
func UpdateTimetableSlot(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var slot models.TimetableSlot
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&slot).Error; err != nil {
		return utils.NotFound(c, "Timetable slot not found")
	}

	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if v, ok := body["subject_id"].(string); ok && v != "" {
		slot.SubjectID = v
	}
	if v, ok := body["employee_id"].(string); ok {
		slot.EmployeeID = v
	}
	if v, ok := body["day_of_week"].(string); ok && v != "" {
		slot.DayOfWeek = models.DayOfWeek(v)
	}
	if v, ok := body["period_number"].(float64); ok {
		slot.PeriodNumber = int(v)
	}
	if v, ok := body["start_time"].(string); ok && v != "" {
		slot.StartTime = v
	}
	if v, ok := body["end_time"].(string); ok && v != "" {
		slot.EndTime = v
	}
	if v, ok := body["semester"].(float64); ok {
		slot.Semester = int(v)
	}
	if v, ok := body["section"].(string); ok {
		slot.Section = v
	}
	if v, ok := body["room"].(string); ok {
		slot.Room = v
	}

	if err := database.DB.WithContext(c.Context()).Save(&slot).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	database.DB.WithContext(c.Context()).Preload("Course").Preload("Subject").First(&slot, "id = ?", slot.ID)
	return utils.OK(c, slot, "Timetable slot updated")
}

// DeleteTimetableSlot removes a slot. Admins only.
func DeleteTimetableSlot(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	result := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.TimetableSlot{})
	if result.RowsAffected == 0 {
		return utils.NotFound(c, "Timetable slot not found")
	}
	return utils.OK(c, nil, "Timetable slot deleted")
}

// BulkCreateTimetableSlots replaces all slots for a given course+semester+section.
// This is the "save whole timetable" endpoint.
func BulkCreateTimetableSlots(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req struct {
		CourseID       string                       `json:"course_id"`
		AcademicYearID string                       `json:"academic_year_id"`
		Semester       int                          `json:"semester"`
		Section        string                       `json:"section"`
		Slots          []CreateTimetableSlotRequest `json:"slots"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.CourseID == "" || req.Semester == 0 {
		return utils.BadRequest(c, "course_id and semester are required")
	}

	// Delete existing slots for this course/semester/section
	database.DB.WithContext(c.Context()).Where(
		"tenant_id = ? AND course_id = ? AND semester = ? AND section = ?",
		tenantID, req.CourseID, req.Semester, req.Section,
	).Delete(&models.TimetableSlot{})

	if len(req.Slots) == 0 {
		return utils.OK(c, []interface{}{}, "Timetable cleared")
	}

	slots := make([]models.TimetableSlot, 0, len(req.Slots))
	for _, s := range req.Slots {
		slots = append(slots, models.TimetableSlot{
			TenantID:       tenantID,
			AcademicYearID: req.AcademicYearID,
			CourseID:       req.CourseID,
			SubjectID:      s.SubjectID,
			EmployeeID:     s.EmployeeID,
			DayOfWeek:      models.DayOfWeek(s.DayOfWeek),
			PeriodNumber:   s.PeriodNumber,
			StartTime:      s.StartTime,
			EndTime:        s.EndTime,
			Semester:       req.Semester,
			Section:        req.Section,
			Room:           s.Room,
		})
	}

	if err := database.DB.WithContext(c.Context()).Create(&slots).Error; err != nil {
		return utils.InternalError(c, "Failed to save timetable")
	}

	return utils.Created(c, slots, "Timetable saved successfully")
}
