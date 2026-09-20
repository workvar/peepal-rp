package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// Bulk upload for clinician consulting windows (the Schedules page). One CSV
// row = one weekly window; appointment booking validates against these.

var clinicianSchedulesSchema = &Schema{
	Resource:    "clinician_schedules",
	Title:       "Clinician Schedules",
	Description: "Create weekly consulting windows in bulk. Each row is one clinician's availability on one weekday (for example Dr. Rao, Monday 09:00–13:00, 15-minute slots). A clinician with no window at all stays freely bookable; once any active window exists, bookings outside it are rejected.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "clinician", Label: "Clinician", Type: FieldString, Required: true,
			Description: "The clinician's Employee ID (staff code) or internal UUID. Must already exist under Employees.",
			Example:     "EMP001",
		},
		{
			Name: "day_of_week", Label: "Day", Type: FieldString, Required: true,
			Description: "Weekday name (sunday…saturday, or the 3-letter short form) or the number 0=Sunday through 6=Saturday.",
			Example:     "monday",
		},
		{
			Name: "start_time", Label: "Start Time", Type: FieldString, Required: true,
			Description: "Window start in 24-hour HH:MM. Must be earlier than the end time.",
			Example:     "09:00",
		},
		{
			Name: "end_time", Label: "End Time", Type: FieldString, Required: true,
			Description: "Window end in 24-hour HH:MM.",
			Example:     "13:00",
		},
		{
			Name: "slot_minutes", Label: "Slot (minutes)", Type: FieldInt,
			Description: "Default consultation length used to suggest slots. Defaults to 15 when blank.",
			Example:     "15",
		},
		{
			Name: "active", Label: "Active", Type: FieldBool,
			Description: "Whether the window is enforced when booking. Defaults to true when blank.",
			Example:     "true",
		},
	},
	ExampleRows: [][]string{
		{"EMP001", "monday", "09:00", "13:00", "15", "true"},
		{"EMP001", "wednesday", "14:00", "17:30", "20", "true"},
	},
	Create: createClinicianScheduleRow,
}

func createClinicianScheduleRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}

	clinicianID, err := resolveEmployeeID(ctx.TenantID, row["clinician"])
	if err != nil {
		return "", err
	}
	if clinicianID == "" {
		return "", errors.New("clinician is required")
	}

	day, err := parseWeekday(row["day_of_week"])
	if err != nil {
		return "", err
	}

	start := strings.TrimSpace(row["start_time"])
	end := strings.TrimSpace(row["end_time"])
	if !isHHMM(start) || !isHHMM(end) {
		return "", errors.New("start_time and end_time must be HH:MM in 24-hour form")
	}
	if start >= end {
		return "", errors.New("start_time must be earlier than end_time")
	}

	slot := 15
	if v := strings.TrimSpace(row["slot_minutes"]); v != "" {
		n := ParseInt(v)
		if n <= 0 {
			return "", errors.New("slot_minutes must be a positive whole number")
		}
		slot = n
	}

	active := true
	if v := strings.TrimSpace(row["active"]); v != "" {
		active = ParseBool(v)
	}

	// Re-running an upload should not pile up duplicate windows.
	var existing models.ClinicianSchedule
	if err := database.DB.
		Where("tenant_id = ? AND clinician_id = ? AND day_of_week = ? AND start_time = ?",
			ctx.TenantID, clinicianID, day, start).
		First(&existing).Error; err == nil {
		return "", errors.New("this clinician already has a window starting at " + start + " on that day")
	}

	s := models.ClinicianSchedule{
		TenantID:    ctx.TenantID,
		ClinicianID: clinicianID,
		DayOfWeek:   day,
		StartTime:   start,
		EndTime:     end,
		SlotMinutes: slot,
		Active:      active,
	}
	if err := database.DB.Create(&s).Error; err != nil {
		return "", err
	}
	return s.ID, nil
}

func init() { Register(clinicianSchedulesSchema) }
