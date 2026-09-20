package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type MarkAttendanceRequest struct {
	EntityID   string `json:"entity_id"`
	EntityType string `json:"entity_type"` // "student" | "employee"
	Date       string `json:"date"`        // "2006-01-02"
	Status     string `json:"status"`      // "present" | "absent" | "late"
	Remarks    string `json:"remarks"`
	SubjectID  string `json:"subject_id"`
}

// MarkAttendance records attendance for a student or employee for the authenticated tenant.
func MarkAttendance(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req MarkAttendanceRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.EntityID == "" || req.EntityType == "" || req.Date == "" {
		return utils.BadRequest(c, "entity_id, entity_type, and date are required")
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return utils.BadRequest(c, "Invalid date format — use YYYY-MM-DD")
	}

	markedBy := c.Locals("userID").(string)

	attendance := models.Attendance{
		TenantID:   tenantID,
		EntityID:   req.EntityID,
		EntityType: req.EntityType,
		Date:       date,
		Status:     models.AttendanceStatus(req.Status),
		MarkedBy:   markedBy,
		Remarks:    req.Remarks,
		SubjectID:  req.SubjectID,
	}

	if err := database.DB.WithContext(c.Context()).Create(&attendance).Error; err != nil {
		return utils.InternalError(c, "Could not mark attendance")
	}
	return utils.Created(c, attendance, "Attendance marked")
}

// ListAttendance returns attendance records for the authenticated tenant.
func ListAttendance(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	entityID := c.Query("entity_id")
	entityType := c.Query("entity_type")
	subjectID := c.Query("subject_id")
	date := c.Query("date")

	query := database.DB.WithContext(c.Context()).Model(&models.Attendance{}).Where("tenant_id = ?", tenantID)
	if entityID != "" {
		query = query.Where("entity_id = ?", entityID)
	}
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}
	if date != "" {
		query = query.Where("date = ?", date)
	}

	var records []models.Attendance
	query.Order("date desc").Find(&records)
	return utils.OK(c, records, "")
}

// BulkMarkAttendance marks attendance for multiple entities for the authenticated tenant.
func BulkMarkAttendance(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var requests []MarkAttendanceRequest
	if err := c.BodyParser(&requests); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	markedBy := c.Locals("userID").(string)
	var records []models.Attendance

	for _, req := range requests {
		date, _ := time.Parse("2006-01-02", req.Date)
		records = append(records, models.Attendance{
			TenantID:   tenantID,
			EntityID:   req.EntityID,
			EntityType: req.EntityType,
			Date:       date,
			Status:     models.AttendanceStatus(req.Status),
			MarkedBy:   markedBy,
			Remarks:    req.Remarks,
			SubjectID:  req.SubjectID,
		})
	}

	if err := database.DB.WithContext(c.Context()).Create(&records).Error; err != nil {
		return utils.InternalError(c, "Could not mark bulk attendance")
	}
	return utils.Created(c, records, "Bulk attendance marked")
}

// GetAttendanceSummary returns per-student attendance statistics for the tenant.
// Query params: entity_type (default: student), subject_id (optional), from_date, to_date
func GetAttendanceSummary(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	entityType := c.Query("entity_type", "student")
	subjectID := c.Query("subject_id")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	type SummaryRow struct {
		EntityID string  `json:"entity_id"`
		Total    int64   `json:"total"`
		Present  int64   `json:"present"`
		Absent   int64   `json:"absent"`
		Late     int64   `json:"late"`
		Pct      float64 `json:"attendance_pct"`
	}

	// Get all distinct entity IDs for this tenant
	var entityIDs []string
	query := database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("tenant_id = ? AND entity_type = ?", tenantID, entityType).
		Distinct("entity_id").
		Pluck("entity_id", &entityIDs)
	_ = query

	if subjectID != "" {
		database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_type = ? AND subject_id = ?", tenantID, entityType, subjectID).
			Distinct("entity_id").
			Pluck("entity_id", &entityIDs)
	}

	var summaries []SummaryRow
	for _, eid := range entityIDs {
		base := database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", tenantID, entityType, eid)
		if subjectID != "" {
			base = base.Where("subject_id = ?", subjectID)
		}
		if fromDate != "" {
			base = base.Where("date >= ?", fromDate)
		}
		if toDate != "" {
			base = base.Where("date <= ?", toDate)
		}

		var total, present, absent, late int64
		base.Count(&total)
		base.Where("status = ?", "present").Count(&present)
		base.Where("status = ?", "absent").Count(&absent)
		base.Where("status = ?", "late").Count(&late)

		pct := 0.0
		if total > 0 {
			pct = float64(present+late) / float64(total) * 100
		}

		summaries = append(summaries, SummaryRow{
			EntityID: eid,
			Total:    total,
			Present:  present,
			Absent:   absent,
			Late:     late,
			Pct:      pct,
		})
	}

	return utils.OK(c, summaries, "")
}

// GetShortageList returns students whose attendance is below the configured threshold.
func GetShortageList(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	// Get configured threshold (default 75%)
	var settings models.AttendanceSettings
	threshold := 75.0
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&settings).Error; err == nil {
		threshold = settings.MinAttendancePct
	}

	// Get all students for this tenant
	var students []models.Student
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("User").Preload("Course").Find(&students)

	type ShortageItem struct {
		Student models.Student `json:"student"`
		Total   int64          `json:"total"`
		Present int64          `json:"present"`
		Pct     float64        `json:"attendance_pct"`
	}

	var result []ShortageItem
	for _, s := range students {
		var total, present int64
		database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student'", tenantID, s.ID).
			Count(&total)
		database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student' AND status IN ?", tenantID, s.ID, []string{"present", "late"}).
			Count(&present)

		if total == 0 {
			continue
		}
		pct := float64(present) / float64(total) * 100
		if pct < threshold {
			result = append(result, ShortageItem{Student: s, Total: total, Present: present, Pct: pct})
		}
	}

	return utils.OK(c, fiber.Map{
		"threshold": threshold,
		"students":  result,
		"count":     len(result),
	}, "")
}
