package handlers

import (
	"bytes"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ExportAttendanceCSV exports attendance records as CSV.
// Accepts query params: from_date, to_date, course_id, batch, type.
func ExportAttendanceCSV(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	courseID := c.Query("course_id")
	batch := c.Query("batch")
	entityType := c.Query("type", "student")

	if fromDate == "" || toDate == "" {
		return utils.BadRequest(c, "from_date and to_date are required")
	}

	startDate, err := time.Parse("2006-01-02", fromDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid from_date — use YYYY-MM-DD")
	}

	endDate, err := time.Parse("2006-01-02", toDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid to_date — use YYYY-MM-DD")
	}

	_ = entityType // employee export can be added later

	type attendanceRow struct {
		RollNumber string
		Name       string
		Date       time.Time
		Status     models.AttendanceStatus
	}

	// Query attendance records by joining students/users via entity_id
	query := database.DB.WithContext(c.Context()).
		Table("attendances").
		Joins("JOIN students ON attendances.entity_id = students.id AND attendances.entity_type = 'student'").
		Joins("JOIN users ON students.user_id = users.id").
		Where("attendances.tenant_id = ? AND attendances.date >= ? AND attendances.date <= ?",
			tenantID, startDate, endDate).
		Select("students.roll_number, users.name, attendances.date, attendances.status")

	if courseID != "" {
		query = query.Where("students.course_id = ?", courseID)
	}

	if batch != "" {
		query = query.Where("students.batch = ?", batch)
	}

	var rows []attendanceRow
	query.Order("attendances.date, students.roll_number").Scan(&rows)

	// Build CSV
	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Write header
	header := []string{"Roll Number", "Name", "Date", "Status"}
	writer.Write(header)

	// Write data rows
	for _, att := range rows {
		row := []string{
			att.RollNumber,
			att.Name,
			att.Date.Format("2006-01-02"),
			string(att.Status),
		}
		writer.Write(row)
	}

	writer.Flush()

	// Set response headers
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=attendance_%s_%s.csv", fromDate, toDate))

	return c.SendStream(bytes.NewReader(buf.Bytes()))
}
