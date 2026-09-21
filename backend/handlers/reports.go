package handlers

import (
	"time"

	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// ─── Dashboard Overview ───────────────────────────────────────────────────────

// GetDashboardStats returns top-level counts for the admin dashboard
func GetDashboardStats(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var studentCount, employeeCount, teacherCount, userCount int64
	var pendingLeaves, pendingPayrolls int64
	var todayPresent, todayAbsent int64
	var patientCount, todayAppointments, todayOpd, openOpd int64
	var activeAdmissions, occupiedBeds, availableBeds int64

	database.DB.WithContext(c.Context()).Model(&models.Student{}).Where("tenant_id = ?", tenantID).Count(&studentCount)
	database.DB.WithContext(c.Context()).Model(&models.Employee{}).
		Joins("JOIN users ON users.id = employees.user_id").
		Where("employees.tenant_id = ? AND users.role = ?", tenantID, string(models.RoleTeacher)).
		Count(&teacherCount)
	database.DB.WithContext(c.Context()).Model(&models.Employee{}).Where("tenant_id = ?", tenantID).Count(&employeeCount)
	database.DB.WithContext(c.Context()).Model(&models.User{}).Where("tenant_id = ?", tenantID).Count(&userCount)
	database.DB.WithContext(c.Context()).Model(&models.Leave{}).Where("tenant_id = ? AND status = ?", tenantID, "pending").Count(&pendingLeaves)
	database.DB.WithContext(c.Context()).Model(&models.Payroll{}).Where("tenant_id = ? AND status = ?", tenantID, "draft").Count(&pendingPayrolls)

	today := time.Now().Format("2006-01-02")
	database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("tenant_id = ? AND DATE(date) = ? AND status = ?", tenantID, today, "present").
		Count(&todayPresent)
	database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("tenant_id = ? AND DATE(date) = ? AND status = ?", tenantID, today, "absent").
		Count(&todayAbsent)

	database.DB.WithContext(c.Context()).Model(&models.Patient{}).Where("tenant_id = ?", tenantID).Count(&patientCount)
	database.DB.WithContext(c.Context()).Model(&models.Appointment{}).
		Where("tenant_id = ? AND date = ? AND status <> ?", tenantID, today, models.AppointmentCancelled).
		Count(&todayAppointments)
	database.DB.WithContext(c.Context()).Model(&models.Encounter{}).
		Where("tenant_id = ? AND visit_date = ? AND visit_type = ?", tenantID, today, models.VisitOPD).
		Count(&todayOpd)
	database.DB.WithContext(c.Context()).Model(&models.Encounter{}).
		Where("tenant_id = ? AND visit_type = ? AND status = ?", tenantID, models.VisitOPD, models.EncounterOpen).
		Count(&openOpd)
	database.DB.WithContext(c.Context()).Model(&models.Admission{}).
		Where("tenant_id = ? AND status = ?", tenantID, models.AdmissionAdmitted).
		Count(&activeAdmissions)
	database.DB.WithContext(c.Context()).Model(&models.Bed{}).
		Where("tenant_id = ? AND status = ?", tenantID, models.BedOccupied).
		Count(&occupiedBeds)
	database.DB.WithContext(c.Context()).Model(&models.Bed{}).
		Where("tenant_id = ? AND status = ?", tenantID, models.BedAvailable).
		Count(&availableBeds)

	return utils.OK(c, fiber.Map{
		"students":            studentCount,
		"employees":           employeeCount,
		"teachers":            teacherCount,
		"users":               userCount,
		"pending_leaves":      pendingLeaves,
		"pending_payrolls":    pendingPayrolls,
		"today_present":       todayPresent,
		"today_absent":        todayAbsent,
		"patients":            patientCount,
		"today_appointments":  todayAppointments,
		"today_opd":           todayOpd,
		"open_opd":            openOpd,
		"active_admissions":   activeAdmissions,
		"occupied_beds":       occupiedBeds,
		"available_beds":      availableBeds,
	}, "")
}

// ─── Attendance Reports ───────────────────────────────────────────────────────

// GetAttendanceReport returns attendance data grouped by date for a given range
func GetAttendanceReport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	entityType := c.Query("entity_type", "student") // student | employee
	subjectID := c.Query("subject_id")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	type DailyRow struct {
		Date    string `json:"date"`
		Present int64  `json:"present"`
		Absent  int64  `json:"absent"`
		Late    int64  `json:"late"`
		Total   int64  `json:"total"`
	}

	query := database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("tenant_id = ? AND entity_type = ? AND DATE(date) BETWEEN ? AND ?",
			tenantID, entityType, fromDate, toDate)
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

	var rows []DailyRow
	query.Select("DATE(date) as date, " +
		"SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present, " +
		"SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent, " +
		"SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late, " +
		"COUNT(*) as total").
		Group("DATE(date)").
		Order("DATE(date) ASC").
		Scan(&rows)

	if rows == nil {
		rows = []DailyRow{}
	}

	return utils.OK(c, fiber.Map{
		"from_date":   fromDate,
		"to_date":     toDate,
		"entity_type": entityType,
		"daily":       rows,
	}, "")
}

// ─── Marks / Grade Reports ────────────────────────────────────────────────────

// GetMarksReport returns grade distribution for a course/semester
func GetMarksReport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	courseID := c.Query("course_id")
	semesterNumber := c.Query("semester_number")
	academicYearID := c.Query("academic_year_id")
	assessmentType := c.Query("assessment_type")

	type GradeRow struct {
		Grade string `json:"grade"`
		Count int64  `json:"count"`
	}

	type SubjectAvg struct {
		SubjectID   string  `json:"subject_id"`
		SubjectName string  `json:"subject_name"`
		AvgMarks    float64 `json:"avg_marks"`
		MaxMarks    float64 `json:"max_marks"`
		PassCount   int64   `json:"pass_count"`
		FailCount   int64   `json:"fail_count"`
		TotalCount  int64   `json:"total_count"`
	}

	gradeQuery := database.DB.WithContext(c.Context()).Model(&models.Mark{}).
		Where("marks.tenant_id = ?", tenantID)

	if courseID != "" {
		gradeQuery = gradeQuery.Joins("JOIN students ON students.id = marks.student_id").
			Where("students.course_id = ?", courseID)
	}
	if semesterNumber != "" {
		gradeQuery = gradeQuery.Where("marks.semester = ?", semesterNumber)
	}
	if academicYearID != "" {
		gradeQuery = gradeQuery.Where("marks.academic_year_id = ?", academicYearID)
	}
	if assessmentType != "" {
		gradeQuery = gradeQuery.Where("marks.assessment_type = ?", assessmentType)
	}

	var gradeRows []GradeRow
	gradeQuery.Select("grade, COUNT(*) as count").
		Where("grade != ''").
		Group("grade").
		Order("grade ASC").
		Scan(&gradeRows)

	// Subject-wise averages
	subjectQuery := database.DB.WithContext(c.Context()).Model(&models.Mark{}).
		Joins("LEFT JOIN subjects ON subjects.id = marks.subject_id").
		Where("marks.tenant_id = ?", tenantID)

	if courseID != "" {
		subjectQuery = subjectQuery.Joins("JOIN students ON students.id = marks.student_id").
			Where("students.course_id = ?", courseID)
	}
	if semesterNumber != "" {
		subjectQuery = subjectQuery.Where("marks.semester = ?", semesterNumber)
	}
	if academicYearID != "" {
		subjectQuery = subjectQuery.Where("marks.academic_year_id = ?", academicYearID)
	}

	var subjectRows []SubjectAvg
	subjectQuery.Select("marks.subject_id, subjects.name as subject_name, " +
		"AVG(marks.marks_obtained) as avg_marks, MAX(marks.max_marks) as max_marks, " +
		"SUM(CASE WHEN marks.grade NOT IN ('F','') THEN 1 ELSE 0 END) as pass_count, " +
		"SUM(CASE WHEN marks.grade = 'F' THEN 1 ELSE 0 END) as fail_count, " +
		"COUNT(*) as total_count").
		Group("marks.subject_id").
		Scan(&subjectRows)

	if gradeRows == nil {
		gradeRows = []GradeRow{}
	}
	if subjectRows == nil {
		subjectRows = []SubjectAvg{}
	}

	return utils.OK(c, fiber.Map{
		"grade_distribution": gradeRows,
		"subject_averages":   subjectRows,
	}, "")
}

// ─── Leave Reports ────────────────────────────────────────────────────────────

// GetLeaveReport returns leave usage statistics
func GetLeaveReport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	year := c.Query("year", time.Now().Format("2006"))
	department := c.Query("department")

	type StatusRow struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	type MonthRow struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	type DeptRow struct {
		Department string `json:"department"`
		Count      int64  `json:"count"`
	}

	base := database.DB.WithContext(c.Context()).Model(&models.Leave{}).
		Where("tenant_id = ? AND STRFTIME('%Y', from_date) = ?", tenantID, year)

	if department != "" {
		base = base.Joins("JOIN employees ON employees.user_id = leaves.applicant_id").
			Where("employees.department_id = ?", department)
	}

	var statusRows []StatusRow
	database.DB.WithContext(c.Context()).Model(&models.Leave{}).
		Where("tenant_id = ? AND STRFTIME('%Y', from_date) = ?", tenantID, year).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusRows)

	var monthRows []MonthRow
	database.DB.WithContext(c.Context()).Model(&models.Leave{}).
		Where("tenant_id = ? AND STRFTIME('%Y', from_date) = ?", tenantID, year).
		Select("STRFTIME('%m', from_date) as month, COUNT(*) as count").
		Group("STRFTIME('%m', from_date)").
		Order("month ASC").
		Scan(&monthRows)

	var deptRows []DeptRow
	database.DB.WithContext(c.Context()).Model(&models.Leave{}).
		Joins("JOIN employees ON employees.user_id = leaves.applicant_id").
		Where("leaves.tenant_id = ? AND STRFTIME('%Y', leaves.from_date) = ?", tenantID, year).
		Select("employees.department_id as department, COUNT(*) as count").
		Group("employees.department_id").
		Scan(&deptRows)

	var totalLeaves, approvedLeaves int64
	base.Count(&totalLeaves)
	database.DB.WithContext(c.Context()).Model(&models.Leave{}).
		Where("tenant_id = ? AND status = ? AND STRFTIME('%Y', from_date) = ?", tenantID, "approved", year).
		Count(&approvedLeaves)

	if statusRows == nil {
		statusRows = []StatusRow{}
	}
	if monthRows == nil {
		monthRows = []MonthRow{}
	}
	if deptRows == nil {
		deptRows = []DeptRow{}
	}

	return utils.OK(c, fiber.Map{
		"year":              year,
		"total":             totalLeaves,
		"approved":          approvedLeaves,
		"status_breakdown":  statusRows,
		"monthly_trend":     monthRows,
		"by_department":     deptRows,
	}, "")
}

// ─── Payroll Reports ──────────────────────────────────────────────────────────

// GetPayrollReport returns payroll analytics
func GetPayrollReport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	year := c.Query("year", time.Now().Format("2006"))

	type MonthRow struct {
		Month             string  `json:"month"`
		GrossSalary       float64 `json:"gross_salary"`
		NetSalary         float64 `json:"net_salary"`
		TotalDeductions   float64 `json:"total_deductions"`
		EmployeeCount     int64   `json:"employee_count"`
	}

	var monthRows []MonthRow
	database.DB.WithContext(c.Context()).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year = ? AND status = ?", tenantID, year, "paid").
		Select("PRINTF('%02d', month) as month, " +
			"SUM(gross_salary) as gross_salary, " +
			"SUM(net_salary) as net_salary, " +
			"SUM(total_deductions) as total_deductions, " +
			"COUNT(DISTINCT employee_id) as employee_count").
		Group("month").
		Order("month ASC").
		Scan(&monthRows)

	var totalGross, totalNet float64
	var totalEmployees int64
	database.DB.WithContext(c.Context()).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year = ? AND status = ?", tenantID, year, "paid").
		Select("COALESCE(SUM(gross_salary),0)").Scan(&totalGross)
	database.DB.WithContext(c.Context()).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year = ? AND status = ?", tenantID, year, "paid").
		Select("COALESCE(SUM(net_salary),0)").Scan(&totalNet)
	database.DB.WithContext(c.Context()).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year = ?", tenantID, year).
		Select("COUNT(DISTINCT employee_id)").Scan(&totalEmployees)

	if monthRows == nil {
		monthRows = []MonthRow{}
	}

	return utils.OK(c, fiber.Map{
		"year":             year,
		"total_gross":      totalGross,
		"total_net":        totalNet,
		"total_employees":  totalEmployees,
		"monthly_trend":    monthRows,
	}, "")
}
