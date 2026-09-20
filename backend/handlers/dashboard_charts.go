package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AttendanceTrendData struct {
	Date         string `json:"date"`
	PresentCount int    `json:"present_count"`
	AbsentCount  int    `json:"absent_count"`
	Percentage   float64 `json:"percentage"`
}

type EnrollmentByCourse struct {
	CourseName string `json:"course_name"`
	Count      int    `json:"count"`
}

type LeaveStatusBreakdown struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MarksDistribution struct {
	Grade string `json:"grade"`
	Count int    `json:"count"`
}

type MonthlyFeeCollection struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type DashboardChartsResponse struct {
	AttendanceTrend    []AttendanceTrendData   `json:"attendance_trend"`
	EnrollmentByCourse []EnrollmentByCourse    `json:"enrollment_by_course"`
	LeaveStatusBreakdown []LeaveStatusBreakdown `json:"leave_status_breakdown"`
	MarksDistribution  []MarksDistribution     `json:"marks_distribution"`
	MonthlyFeeCollection []MonthlyFeeCollection `json:"monthly_fee_collection"`
}

// GetDashboardCharts returns aggregated data for dashboard charts
func GetDashboardCharts(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	charts := DashboardChartsResponse{
		AttendanceTrend:       getAttendanceTrend(tenantID),
		EnrollmentByCourse:    getEnrollmentByCourse(tenantID),
		LeaveStatusBreakdown:  getLeaveStatusBreakdown(tenantID),
		MarksDistribution:     getMarksDistribution(tenantID),
		MonthlyFeeCollection:  getMonthlyFeeCollection(tenantID),
	}

	return utils.OK(c, charts, "")
}

func getAttendanceTrend(tenantID string) []AttendanceTrendData {
	var trends []AttendanceTrendData

	// Get last 7 days
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")

		var presentCount, absentCount int64
		database.DB.
			Where("tenant_id = ? AND date = ? AND status = ?", tenantID, date, "present").
			Model(&models.Attendance{}).
			Count(&presentCount)

		database.DB.
			Where("tenant_id = ? AND date = ? AND status = ?", tenantID, date, "absent").
			Model(&models.Attendance{}).
			Count(&absentCount)

		total := presentCount + absentCount
		percentage := 0.0
		if total > 0 {
			percentage = float64(presentCount) / float64(total) * 100
		}

		trends = append(trends, AttendanceTrendData{
			Date:         dateStr,
			PresentCount: int(presentCount),
			AbsentCount:  int(absentCount),
			Percentage:   percentage,
		})
	}

	return trends
}

func getEnrollmentByCourse(tenantID string) []EnrollmentByCourse {
	var enrollments []EnrollmentByCourse

	type Result struct {
		CourseName string
		Count      int64
	}
	var results []Result

	database.DB.
		Joins("JOIN courses ON students.course_id = courses.id").
		Where("students.tenant_id = ?", tenantID).
		Group("courses.name").
		Select("courses.name as course_name, COUNT(students.id) as count").
		Scan(&results)

	for _, r := range results {
		enrollments = append(enrollments, EnrollmentByCourse{
			CourseName: r.CourseName,
			Count:      int(r.Count),
		})
	}

	return enrollments
}

func getLeaveStatusBreakdown(tenantID string) []LeaveStatusBreakdown {
	var breakdown []LeaveStatusBreakdown

	type Result struct {
		Status string
		Count  int64
	}
	var results []Result

	database.DB.
		Where("tenant_id = ?", tenantID).
		Group("status").
		Select("status, COUNT(id) as count").
		Model(&models.Leave{}).
		Scan(&results)

	for _, r := range results {
		breakdown = append(breakdown, LeaveStatusBreakdown{
			Status: r.Status,
			Count:  int(r.Count),
		})
	}

	return breakdown
}

func getMarksDistribution(tenantID string) []MarksDistribution {
	var distribution []MarksDistribution

	type Result struct {
		Grade string
		Count int64
	}
	var results []Result

	database.DB.
		Where("tenant_id = ?", tenantID).
		Group("grade").
		Select("grade, COUNT(id) as count").
		Model(&models.Mark{}).
		Scan(&results)

	gradeOrder := map[string]int{"O": 1, "A+": 2, "A": 3, "B+": 4, "B": 5, "C": 6, "F": 7}

	for _, r := range results {
		if r.Grade != "" {
			distribution = append(distribution, MarksDistribution{
				Grade: r.Grade,
				Count: int(r.Count),
			})
		}
	}

	// Sort by grade order
	for i := 0; i < len(distribution); i++ {
		for j := i + 1; j < len(distribution); j++ {
			if gradeOrder[distribution[i].Grade] > gradeOrder[distribution[j].Grade] {
				distribution[i], distribution[j] = distribution[j], distribution[i]
			}
		}
	}

	return distribution
}

func getMonthlyFeeCollection(tenantID string) []MonthlyFeeCollection {
	var collections []MonthlyFeeCollection

	// Get last 6 months
	for i := 5; i >= 0; i-- {
		date := time.Now().AddDate(0, -i, 0)
		monthStart := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, time.UTC)
		nextMonthStart := monthStart.AddDate(0, 1, 0)
		monthStr := date.Format("2006-01")

		var totalAmount float64
		database.DB.
			Where("tenant_id = ? AND payment_date >= ? AND payment_date < ? AND status = ?",
				tenantID, monthStart, nextMonthStart, "paid").
			Model(&models.FeePayment{}).
			Select("COALESCE(SUM(amount), 0) as total").
			Row().
			Scan(&totalAmount)

		collections = append(collections, MonthlyFeeCollection{
			Month:  monthStr,
			Amount: totalAmount,
		})
	}

	return collections
}
