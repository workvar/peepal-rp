package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func (r *queryResolver) DashboardStats(ctx context.Context) (*model.DashboardStats, error) {
	// Aggregate counts only; shown on the shared dashboard for all roles.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var studentCount, employeeCount, teacherCount, userCount int64
	var pendingLeaves, pendingPayrolls int64
	var todayPresent, todayAbsent int64

	r.DB.WithContext(ctx).Model(&models.Student{}).Where("tenant_id = ?", auth.TenantID).Count(&studentCount)
	r.DB.WithContext(ctx).Model(&models.Employee{}).
		Joins("JOIN users ON users.id = employees.user_id").
		Where("employees.tenant_id = ? AND users.role = ?", auth.TenantID, "teacher").
		Count(&teacherCount)
	r.DB.WithContext(ctx).Model(&models.Employee{}).Where("tenant_id = ?", auth.TenantID).Count(&employeeCount)
	r.DB.WithContext(ctx).Model(&models.User{}).Where("tenant_id = ?", auth.TenantID).Count(&userCount)
	r.DB.WithContext(ctx).Model(&models.Leave{}).Where("tenant_id = ? AND status = ?", auth.TenantID, "pending").Count(&pendingLeaves)
	r.DB.WithContext(ctx).Model(&models.Payroll{}).Where("tenant_id = ? AND status = ?", auth.TenantID, "draft").Count(&pendingPayrolls)

	today := time.Now().Format("2006-01-02")
	r.DB.WithContext(ctx).Model(&models.Attendance{}).
		Where("tenant_id = ? AND DATE(date) = ? AND status = ?", auth.TenantID, today, "present").
		Count(&todayPresent)
	r.DB.WithContext(ctx).Model(&models.Attendance{}).
		Where("tenant_id = ? AND DATE(date) = ? AND status = ?", auth.TenantID, today, "absent").
		Count(&todayAbsent)

	return &model.DashboardStats{
		Students:        int(studentCount),
		Employees:       int(employeeCount),
		Teachers:        int(teacherCount),
		Users:           int(userCount),
		PendingLeaves:   int(pendingLeaves),
		PendingPayrolls: int(pendingPayrolls),
		TodayPresent:    int(todayPresent),
		TodayAbsent:     int(todayAbsent),
	}, nil
}

func (r *queryResolver) AttendanceReport(ctx context.Context, fromDate *string, toDate *string, entityType *string, subjectID *string) (*model.AttendanceReportResult, error) {
	// Cross-entity attendance report: staff-facing.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}

	from := time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	to := time.Now().Format("2006-01-02")
	et := "student"
	if fromDate != nil && *fromDate != "" {
		from = *fromDate
	}
	if toDate != nil && *toDate != "" {
		to = *toDate
	}
	if entityType != nil && *entityType != "" {
		et = *entityType
	}

	type DailyRow struct {
		Date    string
		Present int64
		Absent  int64
		Late    int64
		Total   int64
	}

	q := r.DB.WithContext(ctx).Model(&models.Attendance{}).
		Where("tenant_id = ? AND entity_type = ? AND DATE(date) BETWEEN ? AND ?", auth.TenantID, et, from, to)
	if subjectID != nil && *subjectID != "" {
		q = q.Where("subject_id = ?", *subjectID)
	}

	var rows []DailyRow
	q.Select("DATE(date) as date, " +
		"SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present, " +
		"SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent, " +
		"SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late, " +
		"COUNT(*) as total").
		Group("DATE(date)").
		Order("DATE(date) ASC").
		Scan(&rows)

	daily := make([]*model.DailyAttendanceRow, len(rows))
	for i, row := range rows {
		daily[i] = &model.DailyAttendanceRow{
			Date:    row.Date,
			Present: int(row.Present),
			Absent:  int(row.Absent),
			Late:    int(row.Late),
			Total:   int(row.Total),
		}
	}
	return &model.AttendanceReportResult{
		FromDate:   from,
		ToDate:     to,
		EntityType: et,
		Daily:      daily,
	}, nil
}

func (r *queryResolver) MarksReport(ctx context.Context, courseID *string, semesterNumber *string, academicYearID *string, assessmentType *string) (*model.MarksReportResult, error) {
	// Cross-student marks report: staff-facing.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}

	type GradeRow struct {
		Grade string
		Count int64
	}
	type SubjectAvg struct {
		SubjectID   string
		SubjectName string
		AvgMarks    float64
		MaxMarks    float64
		PassCount   int64
		FailCount   int64
		TotalCount  int64
	}

	gradeQ := r.DB.WithContext(ctx).Model(&models.Mark{}).Where("marks.tenant_id = ?", auth.TenantID)
	if courseID != nil && *courseID != "" {
		gradeQ = gradeQ.Joins("JOIN students ON students.id = marks.student_id").
			Where("students.course_id = ?", *courseID)
	}
	if semesterNumber != nil && *semesterNumber != "" {
		gradeQ = gradeQ.Where("marks.semester = ?", *semesterNumber)
	}
	if academicYearID != nil && *academicYearID != "" {
		gradeQ = gradeQ.Where("marks.academic_year_id = ?", *academicYearID)
	}
	if assessmentType != nil && *assessmentType != "" {
		gradeQ = gradeQ.Where("marks.assessment_type = ?", *assessmentType)
	}

	var gradeRows []GradeRow
	gradeQ.Select("grade, COUNT(*) as count").
		Where("grade != ''").Group("grade").Order("grade ASC").Scan(&gradeRows)

	subjectQ := r.DB.WithContext(ctx).Model(&models.Mark{}).
		Joins("LEFT JOIN subjects ON subjects.id = marks.subject_id").
		Where("marks.tenant_id = ?", auth.TenantID)
	if courseID != nil && *courseID != "" {
		subjectQ = subjectQ.Joins("JOIN students ON students.id = marks.student_id").
			Where("students.course_id = ?", *courseID)
	}
	if semesterNumber != nil && *semesterNumber != "" {
		subjectQ = subjectQ.Where("marks.semester = ?", *semesterNumber)
	}
	if academicYearID != nil && *academicYearID != "" {
		subjectQ = subjectQ.Where("marks.academic_year_id = ?", *academicYearID)
	}

	var subjectRows []SubjectAvg
	subjectQ.Select("marks.subject_id, subjects.name as subject_name, " +
		"AVG(marks.marks_obtained) as avg_marks, MAX(marks.max_marks) as max_marks, " +
		"SUM(CASE WHEN marks.grade NOT IN ('F','') THEN 1 ELSE 0 END) as pass_count, " +
		"SUM(CASE WHEN marks.grade = 'F' THEN 1 ELSE 0 END) as fail_count, " +
		"COUNT(*) as total_count").
		Group("marks.subject_id, subjects.name").Scan(&subjectRows)

	grades := make([]*model.GradeRow, len(gradeRows))
	for i, g := range gradeRows {
		grades[i] = &model.GradeRow{Grade: g.Grade, Count: int(g.Count)}
	}
	subjects := make([]*model.SubjectAvgRow, len(subjectRows))
	for i, s := range subjectRows {
		subjects[i] = &model.SubjectAvgRow{
			SubjectID:   s.SubjectID,
			SubjectName: s.SubjectName,
			AvgMarks:    s.AvgMarks,
			MaxMarks:    s.MaxMarks,
			PassCount:   int(s.PassCount),
			FailCount:   int(s.FailCount),
			TotalCount:  int(s.TotalCount),
		}
	}
	if grades == nil {
		grades = []*model.GradeRow{}
	}
	if subjects == nil {
		subjects = []*model.SubjectAvgRow{}
	}
	return &model.MarksReportResult{
		GradeDistribution: grades,
		SubjectAverages:   subjects,
	}, nil
}

func (r *queryResolver) LeaveReport(ctx context.Context, year *string, department *string) (*model.LeaveReportResult, error) {
	// Tenant-wide leave analytics: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	yr := time.Now().Format("2006")
	if year != nil && *year != "" {
		yr = *year
	}

	type StatusRow struct {
		Status string
		Count  int64
	}
	type MonthRow struct {
		Month string
		Count int64
	}
	type DeptRow struct {
		Department string
		Count      int64
	}

	var statusRows []StatusRow
	r.DB.WithContext(ctx).Model(&models.Leave{}).
		Where("tenant_id = ? AND TO_CHAR(from_date, 'YYYY') = ?", auth.TenantID, yr).
		Select("status, COUNT(*) as count").Group("status").Scan(&statusRows)

	var monthRows []MonthRow
	r.DB.WithContext(ctx).Model(&models.Leave{}).
		Where("tenant_id = ? AND TO_CHAR(from_date, 'YYYY') = ?", auth.TenantID, yr).
		Select("TO_CHAR(from_date, 'MM') as month, COUNT(*) as count").
		Group("TO_CHAR(from_date, 'MM')").Order("month ASC").Scan(&monthRows)

	var deptRows []DeptRow
	r.DB.WithContext(ctx).Model(&models.Leave{}).
		Joins("JOIN employees ON employees.user_id = leaves.applicant_id").
		Where("leaves.tenant_id = ? AND TO_CHAR(leaves.from_date, 'YYYY') = ?", auth.TenantID, yr).
		Select("employees.department_id as department, COUNT(*) as count").
		Group("employees.department_id").Scan(&deptRows)

	var totalLeaves, approvedLeaves int64
	r.DB.WithContext(ctx).Model(&models.Leave{}).
		Where("tenant_id = ? AND TO_CHAR(from_date, 'YYYY') = ?", auth.TenantID, yr).
		Count(&totalLeaves)
	r.DB.WithContext(ctx).Model(&models.Leave{}).
		Where("tenant_id = ? AND status = ? AND TO_CHAR(from_date, 'YYYY') = ?", auth.TenantID, "approved", yr).
		Count(&approvedLeaves)

	statuses := make([]*model.LeaveStatusRow, len(statusRows))
	for i, s := range statusRows {
		statuses[i] = &model.LeaveStatusRow{Status: s.Status, Count: int(s.Count)}
	}
	months := make([]*model.LeaveMonthRow, len(monthRows))
	for i, m := range monthRows {
		months[i] = &model.LeaveMonthRow{Month: m.Month, Count: int(m.Count)}
	}
	depts := make([]*model.LeaveDeptRow, len(deptRows))
	for i, d := range deptRows {
		depts[i] = &model.LeaveDeptRow{Department: d.Department, Count: int(d.Count)}
	}
	if statuses == nil {
		statuses = []*model.LeaveStatusRow{}
	}
	if months == nil {
		months = []*model.LeaveMonthRow{}
	}
	if depts == nil {
		depts = []*model.LeaveDeptRow{}
	}
	return &model.LeaveReportResult{
		Year:            yr,
		Total:           int(totalLeaves),
		Approved:        int(approvedLeaves),
		StatusBreakdown: statuses,
		MonthlyTrend:    months,
		ByDepartment:    depts,
	}, nil
}

func (r *queryResolver) FeeReport(ctx context.Context, academicYearID *string) (*model.FeeReportResult, error) {
	// Tenant-wide fee analytics: fee-office roles only.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}

	type MonthRow struct {
		Month  string
		Amount float64
		Count  int64
	}
	type ModeRow struct {
		Mode   string
		Amount float64
		Count  int64
	}
	type PlanRow struct {
		Plan   string
		Amount float64
		Count  int64
	}

	base := func() *gorm.DB {
		q := r.DB.WithContext(ctx).Model(&models.FeePayment{}).
			Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid")
		// Structures are course-scoped now, so an academic-year filter means
		// "payments dated within that year".
		if academicYearID != nil && *academicYearID != "" {
			var ay models.AcademicYear
			if err := r.DB.WithContext(ctx).
				Where("id = ? AND tenant_id = ?", *academicYearID, auth.TenantID).
				First(&ay).Error; err == nil {
				q = q.Where("fee_payments.payment_date BETWEEN ? AND ?", ay.StartDate, ay.EndDate)
			}
		}
		return q
	}

	var monthRows []MonthRow
	base().Select("TO_CHAR(fee_payments.payment_date, 'YYYY-MM') as month, SUM(fee_payments.amount) as amount, COUNT(*) as count").
		Group("TO_CHAR(fee_payments.payment_date, 'YYYY-MM')").Order("month ASC").Scan(&monthRows)

	var modeRows []ModeRow
	base().Select("fee_payments.payment_mode as mode, SUM(fee_payments.amount) as amount, COUNT(*) as count").
		Group("fee_payments.payment_mode").Scan(&modeRows)

	var planRows []PlanRow
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Joins("JOIN student_fees ON student_fees.id = fee_payments.student_fee_id").
		Joins("JOIN fee_allocations ON fee_allocations.id = student_fees.fee_allocation_id").
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid").
		Select("fee_allocations.name as plan, SUM(fee_payments.amount) as amount, COUNT(*) as count").
		Group("fee_allocations.name").Scan(&planRows)

	var totalCollected float64
	var totalCount int64
	base().Select("COALESCE(SUM(fee_payments.amount), 0)").Scan(&totalCollected)
	base().Count(&totalCount)

	months := make([]*model.FeeMonthRow, len(monthRows))
	for i, m := range monthRows {
		months[i] = &model.FeeMonthRow{Month: m.Month, Amount: m.Amount, Count: int(m.Count)}
	}
	modes := make([]*model.FeeModeRow, len(modeRows))
	for i, m := range modeRows {
		modes[i] = &model.FeeModeRow{Mode: m.Mode, Amount: m.Amount, Count: int(m.Count)}
	}
	plans := make([]*model.FeePlanReportRow, len(planRows))
	for i, p := range planRows {
		plans[i] = &model.FeePlanReportRow{Plan: p.Plan, Amount: p.Amount, Count: int(p.Count)}
	}
	if months == nil {
		months = []*model.FeeMonthRow{}
	}
	if modes == nil {
		modes = []*model.FeeModeRow{}
	}
	if plans == nil {
		plans = []*model.FeePlanReportRow{}
	}
	return &model.FeeReportResult{
		TotalCollected: totalCollected,
		PaymentCount:   int(totalCount),
		MonthlyTrend:   months,
		ByPaymentMode:  modes,
		ByPlan:         plans,
	}, nil
}

func (r *queryResolver) PayrollReport(ctx context.Context, year *string) (*model.PayrollReportResult, error) {
	// Tenant-wide payroll analytics: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	yr := time.Now().Format("2006")
	if year != nil && *year != "" {
		yr = *year
	}

	type MonthRow struct {
		Month           string
		GrossSalary     float64
		NetSalary       float64
		TotalDeductions float64
		EmployeeCount   int64
	}

	var monthRows []MonthRow
	r.DB.WithContext(ctx).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year::text = ? AND status = ?", auth.TenantID, yr, "paid").
		Select("LPAD(month::text, 2, '0') as month, " +
			"SUM(gross_salary) as gross_salary, " +
			"SUM(net_salary) as net_salary, " +
			"SUM(total_deductions) as total_deductions, " +
			"COUNT(DISTINCT employee_id) as employee_count").
		Group("month").Order("month ASC").Scan(&monthRows)

	var totalGross, totalNet float64
	var totalEmployees int64
	r.DB.WithContext(ctx).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year::text = ? AND status = ?", auth.TenantID, yr, "paid").
		Select("COALESCE(SUM(gross_salary),0)").Scan(&totalGross)
	r.DB.WithContext(ctx).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year::text = ? AND status = ?", auth.TenantID, yr, "paid").
		Select("COALESCE(SUM(net_salary),0)").Scan(&totalNet)
	r.DB.WithContext(ctx).Model(&models.Payroll{}).
		Where("tenant_id = ? AND year::text = ?", auth.TenantID, yr).
		Select("COUNT(DISTINCT employee_id)").Scan(&totalEmployees)

	months := make([]*model.PayrollMonthRow, len(monthRows))
	for i, m := range monthRows {
		months[i] = &model.PayrollMonthRow{
			Month:           m.Month,
			GrossSalary:     m.GrossSalary,
			NetSalary:       m.NetSalary,
			TotalDeductions: m.TotalDeductions,
			EmployeeCount:   int(m.EmployeeCount),
		}
	}
	if months == nil {
		months = []*model.PayrollMonthRow{}
	}
	return &model.PayrollReportResult{
		Year:           yr,
		TotalGross:     totalGross,
		TotalNet:       totalNet,
		TotalEmployees: int(totalEmployees),
		MonthlyTrend:   months,
	}, nil
}
