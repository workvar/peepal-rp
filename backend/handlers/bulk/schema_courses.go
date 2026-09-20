package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
)

var coursesSchema = &Schema{
	Resource:    "courses",
	Title:       "Courses",
	Description: "Create programmes/courses in bulk. Each row becomes one course. Duplicate codes within the same organisation are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Course Name", Type: FieldString, Required: true,
			Description: "Full name of the course or programme.",
			Example:     "Bachelor of Technology – Computer Science",
		},
		{
			Name: "code", Label: "Course Code", Type: FieldString, Required: true,
			Description: "Short unique code for the course. Must be unique within the organisation.",
			Example:     "BTCSE",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional short description of the course.",
			Example:     "Four-year undergraduate engineering programme in Computer Science.",
		},
		{
			Name: "duration_years", Label: "Duration (Years)", Type: FieldInt,
			Description: "Total duration of the course in years.",
			Example:     "4",
		},
		{
			Name: "total_semesters", Label: "Total Semesters", Type: FieldInt,
			Description: "Total number of semesters in the course.",
			Example:     "8",
		},
		{
			Name: "department_id", Label: "Department", Type: FieldString,
			Description: "Department UUID or exact department name. Optional. The row is rejected if a department is given but does not exist.",
			Example:     "School of Computer Engineering",
		},
		{
			Name:        "batches",
			Label:       "Batches (Start Years)",
			Type:        FieldString,
			Description: "Comma-separated list of batch start years. End year and name are auto-calculated from the course duration. Optional.",
			Example:     "2022,2023,2024",
		},
	},
	Create: createCourseRow,
}

func createCourseRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	code := strings.TrimSpace(row["code"])

	if name == "" {
		return "", errors.New("name is required")
	}
	if code == "" {
		return "", errors.New("code is required")
	}

	// Resolve department: accept UUID or department name. Optional, but a given
	// yet unknown department fails the row instead of being stored verbatim as a
	// dangling reference (there are no DB foreign-key constraints).
	deptID, err := resolveDepartmentID(ctx.TenantID, row["department_id"])
	if err != nil {
		return "", err
	}

	// If the course already exists, reuse it (idempotent re-upload support).
	var c models.Course
	existingErr := database.DB.Where("tenant_id = ? AND code = ?", ctx.TenantID, code).First(&c).Error
	if existingErr != nil {
		// Course does not exist — create it.
		c = models.Course{
			TenantID:       ctx.TenantID,
			Name:           name,
			Code:           code,
			Description:    strings.TrimSpace(row["description"]),
			DurationYears:  ParseInt(row["duration_years"]),
			TotalSemesters: ParseInt(row["total_semesters"]),
			DepartmentID:   deptID,
		}
		if err := database.DB.Create(&c).Error; err != nil {
			return "", errors.New("could not create course — code may already exist")
		}
	}

	// Create batches if provided, skipping any that already exist.
	batchesRaw := strings.TrimSpace(row["batches"])
	if batchesRaw != "" {
		duration := c.DurationYears
		if duration <= 0 {
			duration = 4
		}
		for _, part := range strings.Split(batchesRaw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			startYear, err := strconv.Atoi(part)
			if err != nil || startYear < 1900 || startYear > 2100 {
				continue
			}
			// Skip if this batch already exists.
			var existing models.CourseBatch
			if database.DB.Where("course_id = ? AND start_year = ?", c.ID, startYear).First(&existing).Error == nil {
				continue
			}
			endYear := startYear + duration
			batch := models.CourseBatch{
				TenantID:  ctx.TenantID,
				CourseID:  c.ID,
				StartYear: startYear,
				EndYear:   endYear,
				Name:      fmt.Sprintf("%d-%d", startYear, endYear),
			}
			if err := database.DB.Create(&batch).Error; err != nil {
				log.Printf("bulk courses: failed to create batch %d for course %s: %v", startYear, c.Code, err)
			}
		}
	}

	return c.ID, nil
}

func init() { Register(coursesSchema) }
