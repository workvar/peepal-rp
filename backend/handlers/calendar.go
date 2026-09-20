package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ── Settings ─────────────────────────────────────────────────────────────────

// GetCalendarSettings returns the calendar rules for the tenant. If none exist
// yet, sensible defaults are returned (Sundays off, no Saturday rule).
func GetCalendarSettings(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var s models.CalendarSettings
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&s).Error; err != nil {
		return utils.OK(c, models.CalendarSettings{
			TenantID:      tenantID,
			SundayOff:     true,
			SaturdayRule:  "none",
			SaturdayWeeks: "",
		}, "")
	}
	return utils.OK(c, s, "")
}

// UpdateCalendarSettings upserts calendar rules (admin only).
func UpdateCalendarSettings(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	type Req struct {
		SundayOff      *bool  `json:"sunday_off"`
		SaturdayRule   string `json:"saturday_rule"`
		SaturdayWeeks  string `json:"saturday_weeks"`
		DefaultWorking int    `json:"default_working"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	switch req.SaturdayRule {
	case "", "none", "all", "specific":
	default:
		return utils.BadRequest(c, "Invalid saturday_rule")
	}

	var s models.CalendarSettings
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&s).Error; err != nil {
		s = models.CalendarSettings{TenantID: tenantID, SundayOff: true, SaturdayRule: "none"}
	}
	if req.SundayOff != nil {
		s.SundayOff = *req.SundayOff
	}
	if req.SaturdayRule != "" {
		s.SaturdayRule = req.SaturdayRule
	}
	s.SaturdayWeeks = strings.TrimSpace(req.SaturdayWeeks)
	if req.DefaultWorking >= 0 {
		s.DefaultWorking = req.DefaultWorking
	}
	s.UpdatedAt = time.Now()
	if err := database.DB.WithContext(c.Context()).Save(&s).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, s, "Calendar settings saved")
}

// ── Auto-generate weekend holidays ───────────────────────────────────────────

// GenerateCalendar expands the saved rules into concrete Holiday rows for a
// whole year. Re-running is safe: existing AUTO rows for the year are deleted
// first, but manually-added holidays are preserved.
func GenerateCalendar(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	year := c.QueryInt("year", time.Now().Year())

	var s models.CalendarSettings
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&s).Error; err != nil {
		// No saved settings yet — seed sensible defaults (Sundays off only) so
		// the admin can click "Auto-Generate" without detouring through settings.
		s = models.CalendarSettings{
			TenantID:     tenantID,
			SundayOff:    true,
			SaturdayRule: "none",
		}
		if err := database.DB.WithContext(c.Context()).Create(&s).Error; err != nil {
			return utils.InternalError(c, "Failed to create record")
		}
	}

	// Clear existing auto-generated weekend rows for this year so re-generation
	// reflects updated rules.
	yearStr := strconv.Itoa(year)
	database.DB.WithContext(c.Context()).Where(
		"tenant_id = ? AND auto_gen = ? AND STRFTIME('%Y', date) = ?",
		tenantID, true, yearStr,
	).Delete(&models.Holiday{})

	satWeeks := parseSaturdayWeeks(s.SaturdayWeeks)
	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)

	created := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		isHoliday := false
		name := ""

		switch d.Weekday() {
		case time.Sunday:
			if s.SundayOff {
				isHoliday = true
				name = "Sunday"
			}
		case time.Saturday:
			switch s.SaturdayRule {
			case "all":
				isHoliday = true
				name = "Saturday"
			case "specific":
				if satWeeks[weekOfMonth(d)] {
					isHoliday = true
					name = "Saturday (Week " + strconv.Itoa(weekOfMonth(d)) + ")"
				}
			}
		}

		if !isHoliday {
			continue
		}

		// Skip if a manual holiday already exists on this date — never overwrite.
		var exists int64
		database.DB.WithContext(c.Context()).Model(&models.Holiday{}).
			Where("tenant_id = ? AND date = ?", tenantID, d).
			Count(&exists)
		if exists > 0 {
			continue
		}

		h := models.Holiday{
			TenantID: tenantID,
			Name:     name,
			Date:     d,
			Type:     "weekend",
			AutoGen:  true,
		}
		if err := database.DB.WithContext(c.Context()).Create(&h).Error; err == nil {
			created++
		}
	}

	return utils.OK(c, fiber.Map{"year": year, "created": created}, "Calendar generated")
}

// parseSaturdayWeeks turns "1,3,5" into a set lookup map.
func parseSaturdayWeeks(csv string) map[int]bool {
	out := map[int]bool{}
	for _, tok := range strings.Split(csv, ",") {
		tok = strings.TrimSpace(tok)
		if tok == "" {
			continue
		}
		if n, err := strconv.Atoi(tok); err == nil && n >= 1 && n <= 6 {
			out[n] = true
		}
	}
	return out
}

// weekOfMonth returns the 1-indexed week number that `d` falls in within its
// month (the 1st–7th of the month is week 1, 8th–14th is week 2, etc.).
func weekOfMonth(d time.Time) int {
	return (d.Day()-1)/7 + 1
}

// ── Month view ───────────────────────────────────────────────────────────────

// GetCalendarMonth returns a calendar payload for a given month: every day in
// that month with its holiday status (if any) + a working-day total. This is
// consumed by the admin calendar view.
//
// Weekend rules (sunday_off, saturday_rule) are applied on the fly so that
// the calendar always reflects the current settings even before Auto-Generate
// has been run.
func GetCalendarMonth(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	now := time.Now()
	year := c.QueryInt("year", now.Year())
	month := c.QueryInt("month", int(now.Month()))
	if month < 1 || month > 12 {
		return utils.BadRequest(c, "month must be 1-12")
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1)

	// Load calendar settings to apply weekend rules on the fly.
	var settings models.CalendarSettings
	hasSettings := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&settings).Error == nil
	satWeeks := map[int]bool{}
	if hasSettings && settings.SaturdayRule == "specific" {
		satWeeks = parseSaturdayWeeks(settings.SaturdayWeeks)
	}

	var holidays []models.Holiday
	database.DB.WithContext(c.Context()).Where(
		"tenant_id = ? AND date BETWEEN ? AND ?", tenantID, start, end,
	).Find(&holidays)

	// Group holidays by date — a single date may have multiple holiday rows.
	byDate := map[string][]models.Holiday{}
	for _, h := range holidays {
		key := h.Date.Format("2006-01-02")
		byDate[key] = append(byDate[key], h)
	}

	days := []fiber.Map{}
	working := 0
	halfDays := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")

		// Explicit holiday row(s) take precedence over computed rules.
		// Use the first entry for the cell type/name; all are sent in the
		// "holidays" array so the frontend can render every chip.
		if hs, ok := byDate[key]; ok {
			primary := hs[0]
			hList := make([]fiber.Map, len(hs))
			for i, h := range hs {
				hList[i] = fiber.Map{"id": h.ID, "name": h.Name, "type": h.Type}
			}
			days = append(days, fiber.Map{
				"date":     key,
				"weekday":  int(d.Weekday()),
				"type":     primary.Type,
				"name":     primary.Name,
				"id":       primary.ID,
				"auto_gen": primary.AutoGen,
				"holidays": hList,
			})
			for _, h := range hs {
				if h.Type == "half_day" {
					halfDays++
					working++
				}
			}
			continue
		}

		// Apply weekend rules on the fly for days with no explicit entry.
		if hasSettings {
			isWeekend := false
			weekendName := ""
			switch d.Weekday() {
			case time.Sunday:
				if settings.SundayOff {
					isWeekend = true
					weekendName = "Sunday"
				}
			case time.Saturday:
				switch settings.SaturdayRule {
				case "all":
					isWeekend = true
					weekendName = "Saturday"
				case "specific":
					if satWeeks[weekOfMonth(d)] {
						isWeekend = true
						weekendName = "Saturday"
					}
				}
			}
			if isWeekend {
				days = append(days, fiber.Map{
					"date":     key,
					"weekday":  int(d.Weekday()),
					"type":     "weekend",
					"name":     weekendName,
					"auto_gen": true,
				})
				continue
			}
		}

		days = append(days, fiber.Map{
			"date":    key,
			"weekday": int(d.Weekday()),
			"type":    "working",
			"name":    "",
		})
		working++
	}

	return utils.OK(c, fiber.Map{
		"year":        year,
		"month":       month,
		"days":        days,
		"working":     working,
		"half_days":   halfDays,
		"total_days":  end.Day(),
	}, "")
}

// ── Update / upsert a single calendar day ────────────────────────────────────

// UpsertHoliday creates or updates the calendar entry for a single date.
// Sending type="working" removes any existing holiday (useful to "un-mark" a
// weekend). Admin-only.
func UpsertHoliday(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	type Req struct {
		Name string `json:"name"`
		Date string `json:"date"`
		Type string `json:"type"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Date == "" {
		return utils.BadRequest(c, "date is required")
	}
	d, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return utils.BadRequest(c, "Invalid date format")
	}

	// "working" means: remove any existing holiday on this date.
	if req.Type == "working" {
		if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND date = ?", tenantID, d).Delete(&models.Holiday{}).Error; err != nil {
			return utils.InternalError(c, "Failed to delete record")
		}
		return utils.OK(c, nil, "Day marked as working")
	}

	if !validHolidayType(req.Type) {
		return utils.BadRequest(c, "Invalid holiday type")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = holidayDefaultName(req.Type)
	}

	var existing models.Holiday
	err = database.DB.WithContext(c.Context()).Where("tenant_id = ? AND date = ?", tenantID, d).First(&existing).Error
	if err == nil {
		existing.Name = name
		existing.Type = req.Type
		existing.AutoGen = false // any manual edit loses auto flag
		if err := database.DB.WithContext(c.Context()).Save(&existing).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
		return utils.OK(c, existing, "Calendar day updated")
	}

	h := models.Holiday{
		TenantID: tenantID,
		Name:     name,
		Date:     d,
		Type:     req.Type,
		AutoGen:  false,
	}
	if err := database.DB.WithContext(c.Context()).Create(&h).Error; err != nil {
		return utils.InternalError(c, "Could not save calendar day")
	}
	return utils.Created(c, h, "Calendar day saved")
}

func validHolidayType(t string) bool {
	switch t {
	case "public", "institutional", "mandatory", "optional", "half_day", "weekend":
		return true
	}
	return false
}

func holidayDefaultName(t string) string {
	switch t {
	case "public":
		return "Public Holiday"
	case "institutional":
		return "Institutional Holiday"
	case "mandatory":
		return "Mandatory Holiday"
	case "optional":
		return "Optional Holiday"
	case "half_day":
		return "Half Day"
	case "weekend":
		return "Weekend"
	}
	return "Holiday"
}
