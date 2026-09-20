package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var academicYearsSchema = &Schema{
	Resource: "academic_years",
	Title:    "Academic Years & Semesters",
	Description: "Create academic years and semesters together in one CSV. " +
		"Each row has a 'type' column set to either 'academic_year' or 'semester'. " +
		"For academic_year rows, leave 'number' and 'academic_year' blank. " +
		"For semester rows, set 'academic_year' to the exact name of the parent year " +
		"(the year must already exist in the system or appear earlier in this CSV). " +
		"Only one year may be marked is_current=true. Dates must be YYYY-MM-DD.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "type", Label: "Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"academic_year", "semester"},
			Description:   "Whether this row is an academic year or a semester.",
			Example:       "academic_year",
		},
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Display name for the academic year or semester.",
			Example:     "2024-25",
		},
		{
			Name: "start_date", Label: "Start Date", Type: FieldDate, Required: true,
			Description: "First day (YYYY-MM-DD).",
			Example:     "2024-06-01",
		},
		{
			Name: "end_date", Label: "End Date", Type: FieldDate, Required: true,
			Description: "Last day (YYYY-MM-DD). Must be after start_date.",
			Example:     "2025-05-31",
		},
		{
			Name: "is_current", Label: "Is Current", Type: FieldBool, Required: false,
			Description: "academic_year rows only. Mark this as the active year. Accepts true/false, yes/no, 1/0. Defaults to false.",
			Example:     "true",
		},
		{
			Name: "number", Label: "Semester Number", Type: FieldInt, Required: false,
			Description: "semester rows only. Ordering number for the semester (e.g. 1, 2, 3…). Leave blank for academic_year rows.",
			Example:     "",
		},
		{
			Name: "academic_year", Label: "Academic Year", Type: FieldString, Required: false,
			Description: "semester rows only. Exact name of the parent academic year. Leave blank (or use - / NA) for academic_year rows.",
			Example:     "",
		},
	},
	// ExampleRows shows both row types in the downloaded template so users
	// understand the format at a glance.
	ExampleRows: [][]string{
		// type, name, start_date, end_date, is_current, number, academic_year
		{"academic_year", "2024-25", "2024-06-01", "2025-05-31", "true", "", ""},
		{"semester", "Odd Semester", "2024-06-01", "2024-11-30", "", "1", "2024-25"},
		{"semester", "Even Semester", "2025-01-01", "2025-04-30", "", "2", "2024-25"},
	},
	Create: createAcademicYearOrSemesterRow,
}

// isBlankOrNA returns true for cells that mean "not applicable" for this row type.
func isBlankOrNA(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "", "-", "na", "n/a":
		return true
	}
	return false
}

func createAcademicYearOrSemesterRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	rowType := strings.ToLower(strings.TrimSpace(row["type"]))

	switch rowType {
	case "academic_year":
		return createYearRow(ctx, row)
	case "semester":
		return createSemesterRow(ctx, row)
	default:
		return "", fmt.Errorf("type must be 'academic_year' or 'semester', got %q", row["type"])
	}
}

func createYearRow(ctx Ctx, row map[string]string) (string, error) {
	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	startDate, err := time.Parse("2006-01-02", strings.TrimSpace(row["start_date"]))
	if err != nil {
		return "", errors.New("start_date must be YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", strings.TrimSpace(row["end_date"]))
	if err != nil {
		return "", errors.New("end_date must be YYYY-MM-DD")
	}
	if !endDate.After(startDate) {
		return "", errors.New("end_date must be after start_date")
	}

	isCurrent := false
	if v := strings.TrimSpace(row["is_current"]); v != "" {
		isCurrent = ParseBool(v)
	}

	// Check if this year already exists — if so, update it in place rather
	// than creating a duplicate. This makes the CSV idempotent.
	var existing models.AcademicYear
	found := database.DB.
		Where("tenant_id = ? AND name = ?", ctx.TenantID, name).
		First(&existing).Error == nil

	if isCurrent {
		database.DB.Model(&models.AcademicYear{}).
			Where("tenant_id = ? AND is_current = ?", ctx.TenantID, true).
			Update("is_current", false)
	}

	if found {
		existing.StartDate = startDate
		existing.EndDate = endDate
		existing.IsCurrent = isCurrent
		if err := database.DB.Save(&existing).Error; err != nil {
			return "", err
		}
		return existing.ID, nil
	}

	ay := models.AcademicYear{
		TenantID:  ctx.TenantID,
		Name:      name,
		StartDate: startDate,
		EndDate:   endDate,
		IsCurrent: isCurrent,
	}
	if err := database.DB.Create(&ay).Error; err != nil {
		return "", err
	}
	return ay.ID, nil
}

func createSemesterRow(ctx Ctx, row map[string]string) (string, error) {
	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	startDate, err := time.Parse("2006-01-02", strings.TrimSpace(row["start_date"]))
	if err != nil {
		return "", errors.New("start_date must be YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", strings.TrimSpace(row["end_date"]))
	if err != nil {
		return "", errors.New("end_date must be YYYY-MM-DD")
	}
	if !endDate.After(startDate) {
		return "", errors.New("end_date must be after start_date")
	}

	numberRaw := strings.TrimSpace(row["number"])
	number := 0
	if numberRaw != "" {
		number, err = strconv.Atoi(numberRaw)
		if err != nil || number < 1 {
			return "", errors.New("number must be a positive integer")
		}
	}

	ayName := strings.TrimSpace(row["academic_year"])
	if isBlankOrNA(ayName) {
		return "", errors.New("academic_year is required for semester rows")
	}

	// Look up the parent year by name within this tenant.
	var ay models.AcademicYear
	if err := database.DB.
		Where("tenant_id = ? AND name = ?", ctx.TenantID, ayName).
		First(&ay).Error; err != nil {
		return "", fmt.Errorf("academic year %q not found — create it first or list it earlier in this CSV", ayName)
	}

	sem := models.Semester{
		TenantID:       ctx.TenantID,
		AcademicYearID: ay.ID,
		Number:         number,
		Name:           name,
		StartDate:      startDate,
		EndDate:        endDate,
	}
	if err := database.DB.Create(&sem).Error; err != nil {
		return "", err
	}
	return sem.ID, nil
}

func init() { Register(academicYearsSchema) }
