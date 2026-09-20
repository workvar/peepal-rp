package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ListHolidays returns holidays for the tenant.
// Optional query params:
//   - academic_year_id : filter by academic year ID
//   - year             : filter by calendar year (only used when academic_year_id is absent)
//
// When neither param is provided, all tenant holidays are returned.
func ListHolidays(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	ayID := c.Query("academic_year_id")
	yearStr := c.Query("year")

	holidays := []models.Holiday{}
	switch {
	case ayID != "":
		// Include both AY-specific holidays AND global holidays (academic_year_id = '').
		// Global holidays are created without an academic year and are visible in every AY view.
		database.DB.WithContext(c.Context()).Where("tenant_id = ? AND (academic_year_id = ? OR academic_year_id = '')", tenantID, ayID).
			Order("date asc").Find(&holidays)
	case yearStr != "":
		database.DB.WithContext(c.Context()).Where("tenant_id = ? AND STRFTIME('%Y', date) = ?", tenantID, yearStr).
			Order("date asc").Find(&holidays)
	default:
		// No filter — return all holidays for the tenant.
		database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
			Order("date asc").Find(&holidays)
	}
	return utils.OK(c, holidays, "")
}

// CreateHoliday adds one or more holidays to the calendar (admin only).
// Accepts either a single `date` (YYYY-MM-DD) or a `start_date` + `end_date`
// range. For ranges, one holiday row is created per calendar day.
func CreateHoliday(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	type Req struct {
		Name           string `json:"name"`
		Date           string `json:"date"`       // single-date shorthand
		StartDate      string `json:"start_date"` // range start (inclusive)
		EndDate        string `json:"end_date"`   // range end (inclusive)
		Type           string `json:"type"`
		AcademicYearID string `json:"academic_year_id"` // optional
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" {
		return utils.BadRequest(c, "Name is required")
	}

	t := req.Type
	if t == "" {
		t = "institutional"
	}

	// Resolve the date range.
	var start, end time.Time
	var err error
	if req.StartDate != "" && req.EndDate != "" {
		start, err = time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return utils.BadRequest(c, "Invalid start_date format (use YYYY-MM-DD)")
		}
		end, err = time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return utils.BadRequest(c, "Invalid end_date format (use YYYY-MM-DD)")
		}
		if end.Before(start) {
			return utils.BadRequest(c, "end_date must be on or after start_date")
		}
	} else if req.Date != "" {
		start, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			return utils.BadRequest(c, "Invalid date format (use YYYY-MM-DD)")
		}
		end = start
	} else {
		return utils.BadRequest(c, "Provide date or start_date + end_date")
	}

	created := []models.Holiday{}
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		h := models.Holiday{
			TenantID:       tenantID,
			AcademicYearID: req.AcademicYearID,
			Name:           req.Name,
			Date:           d,
			Type:           t,
		}
		if err := database.DB.WithContext(c.Context()).Create(&h).Error; err != nil {
			continue // skip duplicates silently; partial success is fine for ranges
		}
		created = append(created, h)
	}

	if len(created) == 0 {
		return utils.InternalError(c, "No holidays could be created")
	}
	if len(created) == 1 {
		return utils.Created(c, created[0], "Holiday added")
	}
	return utils.Created(c, created, fmt.Sprintf("%d holidays added", len(created)))
}

// DeleteHoliday removes a holiday (admin only).
func DeleteHoliday(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Holiday{}).Error; err != nil {
		return utils.NotFound(c, "Holiday not found")
	}
	return utils.OK(c, nil, "Holiday removed")
}

// BulkDeleteHolidays deletes multiple holidays by ID (admin only).
func BulkDeleteHolidays(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.BodyParser(&req); err != nil || len(req.IDs) == 0 {
		return utils.BadRequest(c, "Provide at least one ID")
	}
	result := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND id IN ?", tenantID, req.IDs).Delete(&models.Holiday{})
	return utils.OK(c, fiber.Map{"deleted": result.RowsAffected}, fmt.Sprintf("%d holiday(s) removed", result.RowsAffected))
}

// CopyHolidaysToAcademicYear duplicates the given holidays into a target academic year (admin only).
// It skips any holidays that already exist in the target year (same name + date).
func CopyHolidaysToAcademicYear(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req struct {
		IDs                  []string `json:"ids"`
		TargetAcademicYearID string   `json:"target_academic_year_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if len(req.IDs) == 0 || req.TargetAcademicYearID == "" {
		return utils.BadRequest(c, "Provide ids and target_academic_year_id")
	}

	var sources []models.Holiday
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND id IN ?", tenantID, req.IDs).Find(&sources)

	copied := 0
	for _, src := range sources {
		h := models.Holiday{
			TenantID:       tenantID,
			AcademicYearID: req.TargetAcademicYearID,
			Name:           src.Name,
			Date:           src.Date,
			Type:           src.Type,
		}
		// Skip if a holiday with the same name and date already exists in the target AY.
		var existing models.Holiday
		if err := database.DB.WithContext(c.Context()).Where(
			"tenant_id = ? AND academic_year_id = ? AND name = ? AND date = ?",
			tenantID, req.TargetAcademicYearID, h.Name, h.Date,
		).First(&existing).Error; err != nil {
			if err := database.DB.WithContext(c.Context()).Create(&h).Error; err != nil {
				return utils.InternalError(c, "Failed to create record")
			}
			copied++
		}
	}

	return utils.OK(c, fiber.Map{"copied": copied}, fmt.Sprintf("%d holiday(s) copied", copied))
}

// GetAttendanceSettings returns the attendance settings for the tenant.
func GetAttendanceSettings(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var s models.AttendanceSettings
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&s).Error; err != nil {
		// Return defaults
		return utils.OK(c, models.AttendanceSettings{
			TenantID:           tenantID,
			MinAttendancePct:   75,
			GracePeriodMinutes: 10,
			LockAfterHours:     24,
		}, "")
	}
	return utils.OK(c, s, "")
}

// UpdateAttendanceSettings upserts attendance settings for the tenant (admin only).
func UpdateAttendanceSettings(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	type Req struct {
		MinAttendancePct   float64 `json:"min_attendance_pct"`
		GracePeriodMinutes int     `json:"grace_period_minutes"`
		LockAfterHours     int     `json:"lock_after_hours"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var s models.AttendanceSettings
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&s).Error; err != nil {
		s = models.AttendanceSettings{TenantID: tenantID}
	}
	if req.MinAttendancePct > 0 {
		s.MinAttendancePct = req.MinAttendancePct
	}
	if req.GracePeriodMinutes >= 0 {
		s.GracePeriodMinutes = req.GracePeriodMinutes
	}
	if req.LockAfterHours > 0 {
		s.LockAfterHours = req.LockAfterHours
	}
	s.UpdatedAt = time.Now()
	if err := database.DB.WithContext(c.Context()).Save(&s).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, s, "Settings saved")
}
