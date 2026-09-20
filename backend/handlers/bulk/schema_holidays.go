package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"strings"
	"time"
)

// resolveAcademicYear looks up an academic year by name for the given tenant.
// Returns "" without error when ayName is blank — callers treat "" as "no year".
func resolveAcademicYear(tenantID, ayName string) (string, error) {
	ayName = strings.TrimSpace(ayName)
	if isBlankOrNA(ayName) {
		return "", nil
	}
	var ay models.AcademicYear
	if err := database.DB.
		Where("tenant_id = ? AND name = ?", tenantID, ayName).
		First(&ay).Error; err != nil {
		return "", fmt.Errorf("academic year %q not found", ayName)
	}
	return ay.ID, nil
}

var holidaysSchema = &Schema{
	Resource: "holidays",
	Title:    "Holidays",
	Description: "Bulk-create holidays in the institutional calendar.\n\n" +
		"Each row represents one holiday (or a date range) with a name, date, type, and an optional academic year. " +
		"If a holiday already exists for the same date it is updated in place. " +
		"Dates must be YYYY-MM-DD. " +
		"Type must be one of: public, institutional, mandatory, optional, half_day.\n\n" +
		"Academic year behaviour:\n" +
		"- Leave academic_year BLANK to create a GLOBAL holiday. Global holidays are automatically visible " +
		"in every academic year's calendar view (past, present, and future) without needing to be re-entered. " +
		"Use this for recurring national/public holidays such as Republic Day or Independence Day.\n" +
		"- Enter an exact academic year name (e.g. '2024-25') to restrict the holiday to that year only. " +
		"Use this for semester breaks, exam holidays, or one-off institutional events.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name:        "name",
			Label:       "Name",
			Type:        FieldString,
			Required:    true,
			Description: "Display name of the holiday.",
			Example:     "Independence Day",
		},
		{
			Name:        "date",
			Label:       "Date",
			Type:        FieldDate,
			Required:    true,
			Description: "Date of the holiday (YYYY-MM-DD). Used as both the start and end date when end_date is blank.",
			Example:     "2025-08-15",
		},
		{
			Name:        "end_date",
			Label:       "End Date",
			Type:        FieldDate,
			Required:    false,
			Description: "Optional. If provided, one holiday row is created for every day from date through end_date (inclusive). Leave blank for a single-day holiday.",
			Example:     "",
		},
		{
			Name:          "type",
			Label:         "Type",
			Type:          FieldEnum,
			Required:      true,
			AllowedValues: []string{"public", "institutional", "mandatory", "optional", "half_day"},
			Description:   "Category of the holiday.",
			Example:       "public",
		},
		{
			Name:     "academic_year",
			Label:    "Academic Year",
			Type:     FieldString,
			Required: false,
			Description: "Optional. Controls visibility across academic years:\n" +
				"  BLANK — creates a GLOBAL holiday visible in ALL academic year views (present and future). " +
				"Ideal for national/public holidays that repeat every year.\n" +
				"  FILLED — enter the exact academic year name (e.g. '2024-25') to attach the holiday to that year only. " +
				"Ideal for semester breaks, exams, or one-off institutional events. " +
				"The academic year must already exist in the system.",
			Example: "2024-25",
		},
	},
	ExampleRows: [][]string{
		// name, date, end_date, type, academic_year
		// Leave academic_year blank → global holiday (visible in ALL academic years)
		{"Republic Day", "2025-01-26", "", "public", ""},
		{"Independence Day", "2025-08-15", "", "public", ""},
		// Fill academic_year → holiday only in that academic year
		{"Founder's Day", "2025-09-10", "", "institutional", "2024-25"},
		{"Summer Break", "2025-05-01", "2025-05-31", "institutional", "2024-25"},
	},
	Create: createHolidayRow,
}

func createHolidayRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	dateStr := strings.TrimSpace(row["date"])
	startDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", errors.New("date must be YYYY-MM-DD")
	}

	// Optional end_date — if blank, treat as single-day holiday.
	endDate := startDate
	if endStr := strings.TrimSpace(row["end_date"]); endStr != "" && !isBlankOrNA(endStr) {
		endDate, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			return "", errors.New("end_date must be YYYY-MM-DD")
		}
		if endDate.Before(startDate) {
			return "", errors.New("end_date must be on or after date")
		}
	}

	holidayType := strings.TrimSpace(row["type"])
	allowed := map[string]bool{
		"public": true, "institutional": true,
		"mandatory": true, "optional": true, "half_day": true,
	}
	if !allowed[holidayType] {
		return "", fmt.Errorf("type must be one of: public, institutional, mandatory, optional, half_day")
	}

	ayID, err := resolveAcademicYear(ctx.TenantID, row["academic_year"])
	if err != nil {
		return "", err
	}

	// Upsert each day in the range.
	lastID := ""
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		var existing models.Holiday
		found := database.DB.
			Where("tenant_id = ? AND date = ?", ctx.TenantID, d).
			First(&existing).Error == nil

		if found {
			existing.Name = name
			existing.Type = holidayType
			existing.AutoGen = false
			existing.AcademicYearID = ayID
			if saveErr := database.DB.Save(&existing).Error; saveErr != nil {
				return "", saveErr
			}
			lastID = existing.ID
		} else {
			h := models.Holiday{
				TenantID:       ctx.TenantID,
				AcademicYearID: ayID,
				Name:           name,
				Date:           d,
				Type:           holidayType,
				AutoGen:        false,
			}
			if createErr := database.DB.Create(&h).Error; createErr != nil {
				return "", createErr
			}
			lastID = h.ID
		}
	}
	return lastID, nil
}

func init() { Register(holidaysSchema) }
