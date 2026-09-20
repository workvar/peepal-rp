package graph

import (
	"context"
	"strconv"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) CalendarSettings(ctx context.Context) (*model.CalendarSettings, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var s models.CalendarSettings
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&s).Error; err != nil {
		return &model.CalendarSettings{
			ID:             auth.TenantID,
			SundayOff:      true,
			SaturdayRule:   "none",
			SaturdayWeeks:  "",
			DefaultWorking: 0,
		}, nil
	}
	return calendarSettingsToModel(s), nil
}

func (r *queryResolver) CalendarMonth(ctx context.Context, year int, month int) (*model.CalendarMonth, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if month < 1 || month > 12 {
		return nil, GQLErr("month must be 1-12")
	}
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1)

	var settings models.CalendarSettings
	hasSettings := r.DB.Where("tenant_id = ?", auth.TenantID).First(&settings).Error == nil
	satWeeks := map[int]bool{}
	if hasSettings && settings.SaturdayRule == "specific" {
		satWeeks = parseSatWeeks(settings.SaturdayWeeks)
	}

	var holidays []models.Holiday
	r.DB.Where("tenant_id = ? AND date BETWEEN ? AND ?", auth.TenantID, start, end).Find(&holidays)

	byDate := map[string]models.Holiday{}
	for _, h := range holidays {
		key := h.Date.Format("2006-01-02")
		byDate[key] = h
	}

	days := []*model.CalendarDay{}
	working := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		if h, ok := byDate[key]; ok {
			autoGen := h.AutoGen
			days = append(days, &model.CalendarDay{
				Date:    key,
				Weekday: int(d.Weekday()),
				Type:    h.Type,
				Name:    h.Name,
				AutoGen: autoGen,
			})
			if h.Type == "half_day" {
				working++
			}
			continue
		}
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
					if satWeeks[weekOfMon(d)] {
						isWeekend = true
						weekendName = "Saturday"
					}
				}
			}
			if isWeekend {
				days = append(days, &model.CalendarDay{
					Date:    key,
					Weekday: int(d.Weekday()),
					Type:    "weekend",
					Name:    weekendName,
					AutoGen: true,
				})
				continue
			}
		}
		days = append(days, &model.CalendarDay{
			Date:    key,
			Weekday: int(d.Weekday()),
			Type:    "working",
			Name:    "",
			AutoGen: false,
		})
		working++
	}

	return &model.CalendarMonth{
		Year:      year,
		Month:     month,
		Days:      days,
		Working:   working,
		TotalDays: end.Day(),
	}, nil
}

func (r *mutationResolver) UpdateCalendarSettings(ctx context.Context, input model.UpdateCalendarSettingsInput) (*model.CalendarSettings, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.CalendarSettings
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&s).Error; err != nil {
		s = models.CalendarSettings{TenantID: auth.TenantID, SundayOff: true, SaturdayRule: "none"}
	}
	if input.SundayOff != nil {
		s.SundayOff = *input.SundayOff
	}
	if input.SaturdayRule != nil {
		switch *input.SaturdayRule {
		case "none", "all", "specific":
			s.SaturdayRule = *input.SaturdayRule
		default:
			return nil, GQLErr("invalid saturday_rule")
		}
	}
	if input.SaturdayWeeks != nil {
		s.SaturdayWeeks = strings.TrimSpace(*input.SaturdayWeeks)
	}
	if input.DefaultWorking != nil {
		s.DefaultWorking = *input.DefaultWorking
	}
	s.UpdatedAt = time.Now()
	r.DB.Save(&s)
	return calendarSettingsToModel(s), nil
}

func (r *mutationResolver) GenerateCalendar(ctx context.Context, year int) (*model.GenerateCalendarResult, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.CalendarSettings
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&s).Error; err != nil {
		s = models.CalendarSettings{TenantID: auth.TenantID, SundayOff: true, SaturdayRule: "none"}
		r.DB.Create(&s)
	}
	yearStr := strconv.Itoa(year)
	r.DB.Where("tenant_id = ? AND auto_gen = ? AND STRFTIME('%Y', date) = ?", auth.TenantID, true, yearStr).
		Delete(&models.Holiday{})

	satWeeks := parseSatWeeks(s.SaturdayWeeks)
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
				if satWeeks[weekOfMon(d)] {
					isHoliday = true
					name = "Saturday (Week " + strconv.Itoa(weekOfMon(d)) + ")"
				}
			}
		}
		if !isHoliday {
			continue
		}
		var exists int64
		r.DB.Model(&models.Holiday{}).Where("tenant_id = ? AND date = ?", auth.TenantID, d).Count(&exists)
		if exists > 0 {
			continue
		}
		h := models.Holiday{TenantID: auth.TenantID, Name: name, Date: d, Type: "weekend", AutoGen: true}
		if err := r.DB.Create(&h).Error; err == nil {
			created++
		}
	}
	return &model.GenerateCalendarResult{Year: year, Created: created}, nil
}

func (r *mutationResolver) UpsertCalendarDay(ctx context.Context, input model.UpsertCalendarDayInput) (*model.Holiday, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	d, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return nil, GQLErr("invalid date format")
	}
	if input.Type == "working" {
		r.DB.Where("tenant_id = ? AND date = ?", auth.TenantID, d).Delete(&models.Holiday{})
		return nil, nil
	}
	name := ""
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	if name == "" {
		name = calendarHolidayDefaultName(input.Type)
	}
	var existing models.Holiday
	if err := r.DB.Where("tenant_id = ? AND date = ?", auth.TenantID, d).First(&existing).Error; err == nil {
		existing.Name = name
		existing.Type = input.Type
		existing.AutoGen = false
		r.DB.Save(&existing)
		return holidayToModel(existing), nil
	}
	h := models.Holiday{TenantID: auth.TenantID, Name: name, Date: d, Type: input.Type, AutoGen: false}
	if err := r.DB.Create(&h).Error; err != nil {
		return nil, err
	}
	return holidayToModel(h), nil
}

// ── Attendance Settings ───────────────────────────────────────────────────────

func (r *queryResolver) AttendanceSettings(ctx context.Context) (*model.AttendanceSettings, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var s models.AttendanceSettings
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&s).Error; err != nil {
		return &model.AttendanceSettings{
			ID:                 auth.TenantID,
			MinAttendancePct:   75,
			GracePeriodMinutes: 10,
			LockAfterHours:     24,
		}, nil
	}
	return attendanceSettingsToModel(s), nil
}

func (r *mutationResolver) UpdateAttendanceSettings(ctx context.Context, input model.UpdateAttendanceSettingsInput) (*model.AttendanceSettings, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.AttendanceSettings
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&s).Error; err != nil {
		s = models.AttendanceSettings{TenantID: auth.TenantID}
	}
	if input.MinAttendancePct != nil && *input.MinAttendancePct > 0 {
		s.MinAttendancePct = *input.MinAttendancePct
	}
	if input.GracePeriodMinutes != nil {
		s.GracePeriodMinutes = *input.GracePeriodMinutes
	}
	if input.LockAfterHours != nil && *input.LockAfterHours > 0 {
		s.LockAfterHours = *input.LockAfterHours
	}
	s.UpdatedAt = time.Now()
	r.DB.Save(&s)
	return attendanceSettingsToModel(s), nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func parseSatWeeks(csv string) map[int]bool {
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

func weekOfMon(d time.Time) int {
	return (d.Day()-1)/7 + 1
}

func calendarHolidayDefaultName(t string) string {
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

func calendarSettingsToModel(s models.CalendarSettings) *model.CalendarSettings {
	return &model.CalendarSettings{
		ID:             s.ID,
		SundayOff:      s.SundayOff,
		SaturdayRule:   s.SaturdayRule,
		SaturdayWeeks:  s.SaturdayWeeks,
		DefaultWorking: s.DefaultWorking,
	}
}

func attendanceSettingsToModel(s models.AttendanceSettings) *model.AttendanceSettings {
	return &model.AttendanceSettings{
		ID:                 s.ID,
		MinAttendancePct:   s.MinAttendancePct,
		GracePeriodMinutes: s.GracePeriodMinutes,
		LockAfterHours:     s.LockAfterHours,
	}
}
