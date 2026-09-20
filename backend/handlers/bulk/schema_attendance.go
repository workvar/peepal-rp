package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

var attendanceSchema = &Schema{
	Resource:    "attendance",
	Title:       "Attendance",
	Description: "Mark daily attendance in bulk for students or employees. entity_type selects which register is used; entity_id is the UUID of that student or employee. The date column accepts a single day OR a range, so one row can cover many days at once.",
	RequireRole: []string{"admin", "teacher"},
	Fields: []Field{
		{
			Name: "entity_type", Label: "Entity Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"student", "employee"},
			Description:   "Whether this row is for a student or an employee.",
			Example:       "student",
		},
		{
			Name: "entity_id", Label: "Entity ID", Type: FieldString, Required: true,
			Description: "UUID of the student or employee, or the student's roll number / employee's staff code. The row is rejected if no such person exists.",
		},
		{
			Name: "date", Label: "Date(s)", Type: FieldDateRange, Required: true,
			Description: "A single day (2026-04-20) OR a range to mark many days in one row. " +
				"Separate the start and end with '..' or the word 'to' — e.g. 2026-01-25..2026-02-10 " +
				"or 2026-01-25 to 2026-02-10. A comma also works but must be inside one quoted cell " +
				"(spreadsheets do this automatically). A range creates one entry per day.",
			Example: "2026-01-25..2026-02-10",
		},
		{
			Name: "status", Label: "Status", Type: FieldEnum, Required: true,
			AllowedValues: []string{"present", "absent", "late"},
			Example:       "present",
		},
		{
			Name: "subject_id", Label: "Subject ID", Type: FieldString,
			Description: "Optional — link this entry to a specific subject's class (UUID or code). The row is rejected if a subject is given but does not exist.",
		},
		{
			Name: "remarks", Label: "Remarks", Type: FieldString,
			Example: "On school trip",
		},
	},
	// Two example rows so the template shows both a single date and a range.
	ExampleRows: [][]string{
		{"student", "PASTE-STUDENT-UUID", "2026-04-20", "present", "", "Single day"},
		{"student", "PASTE-STUDENT-UUID", "2026-01-25..2026-02-10", "present", "", "Whole range in one row"},
	},
	Create: createAttendanceRow,
}

// createAttendanceRow inserts one attendance entry per day. When the date cell
// is a range, every day in the range gets its own row, so a single CSV line can
// cover an entire week or month. Returns the first created ID.
func createAttendanceRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleTeacher) {
		return "", errors.New("admin or teacher role required")
	}

	days, err := ExpandDateRange(row["date"])
	if err != nil {
		return "", err
	}

	entityType := strings.ToLower(strings.TrimSpace(row["entity_type"]))

	// Reject the row when the student/employee (or an optionally named subject)
	// does not exist — there are no DB foreign-key constraints, so a bad id would
	// persist as an orphan attendance record. entity_id accepts a UUID, a roll
	// number (students), or a staff code (employees).
	entityID, err := resolveAttendanceEntityID(ctx.TenantID, entityType, row["entity_id"])
	if err != nil {
		return "", err
	}
	subjectID, err := resolveSubjectID(ctx.TenantID, row["subject_id"])
	if err != nil {
		return "", err
	}

	status := models.AttendanceStatus(strings.ToLower(strings.TrimSpace(row["status"])))
	remarks := strings.TrimSpace(row["remarks"])

	var firstID string
	for _, day := range days {
		a := models.Attendance{
			TenantID:   ctx.TenantID,
			EntityID:   entityID,
			EntityType: entityType,
			Date:       day,
			Status:     status,
			SubjectID:  subjectID,
			MarkedBy:   ctx.ActorID,
			Remarks:    remarks,
		}
		if err := database.DB.Create(&a).Error; err != nil {
			return "", err
		}
		if firstID == "" {
			firstID = a.ID
		}
	}
	return firstID, nil
}

func init() { Register(attendanceSchema) }
