# Batch 6: Reports + Dashboard Charts Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GraphQL types/queries for Reports (attendance, marks, leave, fee, payroll) and Dashboard stats; migrate all report sub-pages and the dashboard page from Redux/REST to Apollo/GraphQL.

**Architecture:** Schema-first gqlgen. New `reports.resolvers.go` domain file. No mutations — all report queries are read-only. Dashboard also has no mutations.

**Tech Stack:** Go/gqlgen/GORM (backend), Next.js/Apollo Client/TypeScript (frontend)

---

## Critical Context

### gqlgen conventions
- Schema file: `backend/graph/schema.graphqls`
- After editing schema: `cd backend && go generate ./...`
- New stubs in `schema.resolvers.go` → implement in `reports.resolvers.go` → delete stubs from `schema.resolvers.go`

### Auth context
```go
auth := AuthFromCtx(ctx)
```

### Dashboard handler (backend/handlers/reports.go)
- `GetDashboardStats` → counts students, employees, teachers, users, pending leaves, pending payrolls, today present/absent
- `GetAttendanceReport` → daily rows with date/present/absent/late/total, filtered by entity_type and date range
- `GetMarksReport` → grade distribution rows + subject average rows
- `GetLeaveReport` → total/approved + status_breakdown + monthly_trend + by_department (uses STRFTIME for SQLite)
- `GetFeeReport` → total collected/count + monthly trend + by_payment_mode + by_category
- `GetPayrollReport` → total gross/net/employees + monthly trend

### IMPORTANT: DB dialect
The existing handlers use `STRFTIME('%Y', from_date)` (SQLite syntax). The DB is now PostgreSQL (Aiven). Use `EXTRACT(YEAR FROM from_date)::text` instead of `STRFTIME`. Or use `DATE_PART`. Confirm which functions work with the current DB driver (GORM with pgx).

**PostgreSQL equivalents:**
- `STRFTIME('%Y', date_col)` → `TO_CHAR(date_col, 'YYYY')`
- `STRFTIME('%m', date_col)` → `TO_CHAR(date_col, 'MM')`
- `STRFTIME('%Y-%m', date_col)` → `TO_CHAR(date_col, 'YYYY-MM')`
- `DATE(date_col)` → `date_col::date` or `DATE(date_col)` (both work in PG)
- `PRINTF('%02d', month)` → `LPAD(month::text, 2, '0')`

### Payroll model
`models.Payroll` has `Month int` and `Year int` fields (not date strings).

### Dashboard page context
The existing `dashboard/page.tsx` uses:
- `reportSlice.fetchDashboardStats` — returns counts
- `reportSlice.fetchDashboardCharts` — returns chart data (monthly attendance percentages, monthly payroll totals)
- `notificationSlice.fetchAnnouncements` — returns published announcements

For simplicity, migrate dashboard stats + charts using the `dashboardStats` query. For announcements on the dashboard, use `LIST_ANNOUNCEMENTS` query (created in Batch 7) with a skip fallback — OR keep announcements as-is and migrate them in Batch 7. **Decision: migrate dashboard stats/charts in Batch 6; leave announcement fetch on dashboard untouched (will be fixed in Batch 7).**

### Frontend field mapping (REST → GraphQL)
Report pages use `useAppSelector(s => s.report)` — replace with `useQuery`. Key field renames:
- `attendanceReport?.daily` → `data?.attendanceReport?.daily`
- `leaveReport?.monthly_trend` → `data?.leaveReport?.monthlyTrend`
- `leaveReport?.status_breakdown` → `data?.leaveReport?.statusBreakdown`
- `leaveReport?.by_department` → `data?.leaveReport?.byDepartment`
- `feeReport?.monthly_trend` → `data?.feeReport?.monthlyTrend`
- `feeReport?.by_payment_mode` → `data?.feeReport?.byPaymentMode`
- `feeReport?.by_category` → `data?.feeReport?.byCategory`
- `feeReport?.total_collected` → `data?.feeReport?.totalCollected`
- `feeReport?.payment_count` → `data?.feeReport?.paymentCount`
- `marksReport?.grade_distribution` → `data?.marksReport?.gradeDistribution`
- `marksReport?.subject_averages` → `data?.marksReport?.subjectAverages`
- `payrollReport?.monthly_trend` → `data?.payrollReport?.monthlyTrend`
- `payrollReport?.total_gross` → `data?.payrollReport?.totalGross`
- `payrollReport?.total_net` → `data?.payrollReport?.totalNet`
- `payrollReport?.total_employees` → `data?.payrollReport?.totalEmployees`
- `r.subject_name` → `r.subjectName`
- `r.avg_marks` → `r.avgMarks`
- `r.max_marks` → `r.maxMarks`
- `r.pass_count` → `r.passCount`
- `r.fail_count` → `r.failCount`
- `r.total_count` → `r.totalCount`
- `r.gross_salary` → `r.grossSalary`
- `r.net_salary` → `r.netSalary`
- `r.total_deductions` → `r.totalDeductions`
- `r.employee_count` → `r.employeeCount`
- Stats: `stats.pending_leaves` → `stats.pendingLeaves`, `stats.pending_payrolls` → `stats.pendingPayrolls`, `stats.today_present` → `stats.todayPresent`, `stats.today_absent` → `stats.todayAbsent`

---

## File Structure

**Create:**
- `backend/graph/reports.resolvers.go`
- `frontend/graphql/queries/reports.ts`

**Modify:**
- `backend/graph/schema.graphqls`
- `backend/graph/schema.resolvers.go` (remove stubs)
- `frontend/app/[tenant]/(dashboard)/reports/attendance/page.tsx`
- `frontend/app/[tenant]/(dashboard)/reports/fees/page.tsx`
- `frontend/app/[tenant]/(dashboard)/reports/leaves/page.tsx`
- `frontend/app/[tenant]/(dashboard)/reports/marks/page.tsx`
- `frontend/app/[tenant]/(dashboard)/reports/payroll/page.tsx`
- `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx`

---

### Task 1: Schema additions for Reports + Dashboard

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Add types to schema.graphqls**

Append after existing type blocks:

```graphql
type DashboardStats {
  students: Int!
  employees: Int!
  teachers: Int!
  users: Int!
  pendingLeaves: Int!
  pendingPayrolls: Int!
  todayPresent: Int!
  todayAbsent: Int!
}

type DailyAttendanceRow {
  date: String!
  present: Int!
  absent: Int!
  late: Int!
  total: Int!
}

type AttendanceReportResult {
  fromDate: String!
  toDate: String!
  entityType: String!
  daily: [DailyAttendanceRow!]!
}

type GradeRow {
  grade: String!
  count: Int!
}

type SubjectAvgRow {
  subjectId: String!
  subjectName: String!
  avgMarks: Float!
  maxMarks: Float!
  passCount: Int!
  failCount: Int!
  totalCount: Int!
}

type MarksReportResult {
  gradeDistribution: [GradeRow!]!
  subjectAverages: [SubjectAvgRow!]!
}

type LeaveStatusRow {
  status: String!
  count: Int!
}

type LeaveMonthRow {
  month: String!
  count: Int!
}

type LeaveDeptRow {
  department: String!
  count: Int!
}

type LeaveReportResult {
  year: String!
  total: Int!
  approved: Int!
  statusBreakdown: [LeaveStatusRow!]!
  monthlyTrend: [LeaveMonthRow!]!
  byDepartment: [LeaveDeptRow!]!
}

type FeeMonthRow {
  month: String!
  amount: Float!
  count: Int!
}

type FeeModeRow {
  mode: String!
  amount: Float!
  count: Int!
}

type FeeCategoryReportRow {
  category: String!
  amount: Float!
  count: Int!
}

type FeeReportResult {
  totalCollected: Float!
  paymentCount: Int!
  monthlyTrend: [FeeMonthRow!]!
  byPaymentMode: [FeeModeRow!]!
  byCategory: [FeeCategoryReportRow!]!
}

type PayrollMonthRow {
  month: String!
  grossSalary: Float!
  netSalary: Float!
  totalDeductions: Float!
  employeeCount: Int!
}

type PayrollReportResult {
  year: String!
  totalGross: Float!
  totalNet: Float!
  totalEmployees: Int!
  monthlyTrend: [PayrollMonthRow!]!
}
```

- [ ] **Step 2: Add queries**

In the `Query` type block, add:
```graphql
  dashboardStats: DashboardStats!
  attendanceReport(fromDate: String, toDate: String, entityType: String, subjectId: String): AttendanceReportResult!
  marksReport(courseId: String, semesterNumber: String, academicYearId: String, assessmentType: String): MarksReportResult!
  leaveReport(year: String, department: String): LeaveReportResult!
  feeReport(academicYearId: String): FeeReportResult!
  payrollReport(year: String): PayrollReportResult!
```

- [ ] **Step 3: Run gqlgen + build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go generate ./... && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/schema.graphqls backend/graph/schema.resolvers.go backend/graph/model/models_gen.go
git commit -m "feat(batch6): add reports+dashboard GraphQL schema types and stubs"
```

---

### Task 2: Backend — reports.resolvers.go

**Files:**
- Create: `backend/graph/reports.resolvers.go`
- Modify: `backend/graph/schema.resolvers.go` (remove stubs)

- [ ] **Step 1: Create backend/graph/reports.resolvers.go**

```go
package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) DashboardStats(ctx context.Context) (*model.DashboardStats, error) {
	auth := AuthFromCtx(ctx)

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
	auth := AuthFromCtx(ctx)

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
		Date    string `json:"date"`
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
	auth := AuthFromCtx(ctx)

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
	auth := AuthFromCtx(ctx)

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
	auth := AuthFromCtx(ctx)

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
	type CategoryRow struct {
		Category string
		Amount   float64
		Count    int64
	}

	base := r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid")
	if academicYearID != nil && *academicYearID != "" {
		base = base.Where("fee_payments.academic_year_id = ?", *academicYearID)
	}

	var monthRows []MonthRow
	base.Select("TO_CHAR(payment_date, 'YYYY-MM') as month, SUM(total_amount) as amount, COUNT(*) as count").
		Group("TO_CHAR(payment_date, 'YYYY-MM')").Order("month ASC").Scan(&monthRows)

	var modeRows []ModeRow
	base.Select("payment_mode as mode, SUM(total_amount) as amount, COUNT(*) as count").
		Group("payment_mode").Scan(&modeRows)

	var categoryRows []CategoryRow
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Joins("JOIN fee_structures ON fee_structures.id = fee_payments.fee_structure_id").
		Joins("JOIN fee_categories ON fee_categories.id = fee_structures.fee_category_id").
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid").
		Select("fee_categories.name as category, SUM(fee_payments.total_amount) as amount, COUNT(*) as count").
		Group("fee_categories.name").Scan(&categoryRows)

	var totalCollected float64
	var totalCount int64
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid").
		Select("COALESCE(SUM(total_amount), 0)").Scan(&totalCollected)
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid").
		Count(&totalCount)

	months := make([]*model.FeeMonthRow, len(monthRows))
	for i, m := range monthRows {
		months[i] = &model.FeeMonthRow{Month: m.Month, Amount: m.Amount, Count: int(m.Count)}
	}
	modes := make([]*model.FeeModeRow, len(modeRows))
	for i, m := range modeRows {
		modes[i] = &model.FeeModeRow{Mode: m.Mode, Amount: m.Amount, Count: int(m.Count)}
	}
	cats := make([]*model.FeeCategoryReportRow, len(categoryRows))
	for i, c := range categoryRows {
		cats[i] = &model.FeeCategoryReportRow{Category: c.Category, Amount: c.Amount, Count: int(c.Count)}
	}
	if months == nil { months = []*model.FeeMonthRow{} }
	if modes == nil { modes = []*model.FeeModeRow{} }
	if cats == nil { cats = []*model.FeeCategoryReportRow{} }
	return &model.FeeReportResult{
		TotalCollected: totalCollected,
		PaymentCount:   int(totalCount),
		MonthlyTrend:   months,
		ByPaymentMode:  modes,
		ByCategory:     cats,
	}, nil
}

func (r *queryResolver) PayrollReport(ctx context.Context, year *string) (*model.PayrollReportResult, error) {
	auth := AuthFromCtx(ctx)

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
```

- [ ] **Step 2: Remove batch 6 stubs from schema.resolvers.go**

Delete stubs for: `DashboardStats`, `AttendanceReport`, `MarksReport`, `LeaveReport`, `FeeReport`, `PayrollReport`.

- [ ] **Step 3: Build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/reports.resolvers.go backend/graph/schema.resolvers.go
git commit -m "feat(batch6): implement reports+dashboard resolvers"
```

---

### Task 3: Frontend GraphQL files for reports

**Files:**
- Create: `frontend/graphql/queries/reports.ts`

- [ ] **Step 1: Create frontend/graphql/queries/reports.ts**

```typescript
import { gql } from "@apollo/client";

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats {
      students
      employees
      teachers
      users
      pendingLeaves
      pendingPayrolls
      todayPresent
      todayAbsent
    }
  }
`;

export const ATTENDANCE_REPORT = gql`
  query AttendanceReport($fromDate: String, $toDate: String, $entityType: String, $subjectId: String) {
    attendanceReport(fromDate: $fromDate, toDate: $toDate, entityType: $entityType, subjectId: $subjectId) {
      fromDate
      toDate
      entityType
      daily {
        date
        present
        absent
        late
        total
      }
    }
  }
`;

export const MARKS_REPORT = gql`
  query MarksReport($courseId: String, $semesterNumber: String, $academicYearId: String, $assessmentType: String) {
    marksReport(courseId: $courseId, semesterNumber: $semesterNumber, academicYearId: $academicYearId, assessmentType: $assessmentType) {
      gradeDistribution {
        grade
        count
      }
      subjectAverages {
        subjectId
        subjectName
        avgMarks
        maxMarks
        passCount
        failCount
        totalCount
      }
    }
  }
`;

export const LEAVE_REPORT = gql`
  query LeaveReport($year: String, $department: String) {
    leaveReport(year: $year, department: $department) {
      year
      total
      approved
      statusBreakdown { status count }
      monthlyTrend { month count }
      byDepartment { department count }
    }
  }
`;

export const FEE_REPORT = gql`
  query FeeReport($academicYearId: String) {
    feeReport(academicYearId: $academicYearId) {
      totalCollected
      paymentCount
      monthlyTrend { month amount count }
      byPaymentMode { mode amount count }
      byCategory { category amount count }
    }
  }
`;

export const PAYROLL_REPORT = gql`
  query PayrollReport($year: String) {
    payrollReport(year: $year) {
      year
      totalGross
      totalNet
      totalEmployees
      monthlyTrend {
        month
        grossSalary
        netSalary
        totalDeductions
        employeeCount
      }
    }
  }
`;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/graphql/queries/reports.ts
git commit -m "feat(batch6): add reports GraphQL query documents"
```

---

### Task 4: Frontend — migrate report pages (5 pages)

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/reports/attendance/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/reports/fees/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/reports/leaves/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/reports/marks/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/reports/payroll/page.tsx`

For each page, read the current file and apply the same migration pattern.

**Pattern for each report page:**
1. Remove: `useAppDispatch`, `useAppSelector` (from report/student slices), `useEffect` that called dispatch
2. Add: `useQuery` from Apollo
3. Replace `dispatch(fetchXxxReport({ params }))` with `useQuery(XXX_REPORT, { variables })`
4. For lazy re-fetch on filter change (e.g. when user clicks "Apply" button), use Apollo's `refetch` function:
   ```typescript
   const { data, loading, refetch } = useQuery(XXX_REPORT, { variables: { fromDate, toDate } })
   function handleFilter() { refetch({ fromDate, toDate, entityType }) }
   ```
5. Rename all field accesses to camelCase (see field mapping table above)

- [ ] **Step 1: Migrate attendance report page**

Replace Redux with Apollo in `reports/attendance/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { ATTENDANCE_REPORT } from '@/graphql/queries/reports'

export default function AttendanceReportPage() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const [fromDate, setFromDate] = useState(monthAgo.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10))
  const [entityType, setEntityType] = useState('student')

  const { data, loading, refetch } = useQuery(ATTENDANCE_REPORT, {
    variables: { fromDate, toDate, entityType },
  })

  function handleFilter() {
    refetch({ fromDate, toDate, entityType })
  }

  const daily = data?.attendanceReport?.daily ?? []
  const totalPresent = daily.reduce((s: number, r: any) => s + r.present, 0)
  const totalAbsent = daily.reduce((s: number, r: any) => s + r.absent, 0)
  const totalLate = daily.reduce((s: number, r: any) => s + r.late, 0)
  const overallTotal = daily.reduce((s: number, r: any) => s + r.total, 0)
  const attendancePct = overallTotal > 0 ? Math.round((totalPresent / overallTotal) * 100) : 0

  return (
    // Keep existing JSX structure unchanged — just update data access
    // Replace: attendanceReport?.daily with daily
    // Replace: loading state with { loading } from useQuery
    // Replace handleFilter dispatch with refetch call (already done above)
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily attendance trends over a date range</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
          <select value={entityType} onChange={e => setEntityType(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="student">Students</option>
            <option value="employee">Employees</option>
          </select>
        </div>
        <button onClick={handleFilter}
          className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium">Apply</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: overallTotal, color: 'text-foreground' },
          { label: 'Present', value: totalPresent, color: 'text-green-600' },
          { label: 'Absent', value: totalAbsent, color: 'text-red-600' },
          { label: 'Attendance %', value: `${attendancePct}%`, color: attendancePct >= 75 ? 'text-green-600' : 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">Daily Breakdown</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground/70">Loading...</div>
        ) : daily.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No data for selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Present</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Absent</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Late</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {daily.map((row: any) => {
                const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0
                return (
                  <tr key={row.date} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 text-foreground/80">{new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-2.5 text-center text-green-600 font-medium">{row.present}</td>
                    <td className="px-4 py-2.5 text-center text-red-500">{row.absent}</td>
                    <td className="px-4 py-2.5 text-center text-orange-500">{row.late}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{row.total}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 60 ? 'text-orange-500' : 'text-red-600'}`}>{pct}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Migrate fees report page**

Read `frontend/app/[tenant]/(dashboard)/reports/fees/page.tsx`. Replace Redux with:
```typescript
const { data, loading } = useQuery(FEE_REPORT)
const monthly = data?.feeReport?.monthlyTrend ?? []
const modes = data?.feeReport?.byPaymentMode ?? []
const categories = data?.feeReport?.byCategory ?? []
// summary:
const totalCollected = data?.feeReport?.totalCollected ?? 0
const paymentCount = data?.feeReport?.paymentCount ?? 0
```
Remove `useAppDispatch`, `useEffect`, Redux imports.

- [ ] **Step 3: Migrate leaves report page**

Read `frontend/app/[tenant]/(dashboard)/reports/leaves/page.tsx`. Replace Redux with:
```typescript
const [year, setYear] = useState(String(currentYear))
const { data, loading, refetch } = useQuery(LEAVE_REPORT, { variables: { year } })
function handleFilter() { refetch({ year }) }
const monthly = data?.leaveReport?.monthlyTrend ?? []
const statuses = data?.leaveReport?.statusBreakdown ?? []
const departments = data?.leaveReport?.byDepartment ?? []
// totals:
const total = data?.leaveReport?.total ?? 0
const approved = data?.leaveReport?.approved ?? 0
```

- [ ] **Step 4: Migrate marks report page**

Read `frontend/app/[tenant]/(dashboard)/reports/marks/page.tsx`. Replace Redux with:
```typescript
const [courseId, setCourseId] = useState('')
const [semesterNumber, setSemesterNumber] = useState('')
const { data: coursesData } = useQuery(LIST_COURSES) // import from students queries
const { data, loading, refetch } = useQuery(MARKS_REPORT, { variables: {} })
function handleFilter() { refetch({ courseId: courseId || undefined, semesterNumber: semesterNumber || undefined }) }
const grades = data?.marksReport?.gradeDistribution ?? []
const subjects = data?.marksReport?.subjectAverages ?? []
```
Import `LIST_COURSES` from `@/graphql/queries/students`.

- [ ] **Step 5: Migrate payroll report page**

Read `frontend/app/[tenant]/(dashboard)/reports/payroll/page.tsx`. Replace Redux with:
```typescript
const [year, setYear] = useState(String(currentYear))
const { data, loading, refetch } = useQuery(PAYROLL_REPORT, { variables: { year } })
function handleFilter() { refetch({ year }) }
const monthly = data?.payrollReport?.monthlyTrend ?? []
// totals:
const totalGross = data?.payrollReport?.totalGross ?? 0
const totalNet = data?.payrollReport?.totalNet ?? 0
const totalEmployees = data?.payrollReport?.totalEmployees ?? 0
```

- [ ] **Step 6: Commit all report pages**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/reports/"
git commit -m "feat(batch6): migrate all report pages to Apollo GraphQL"
```

---

### Task 5: Frontend — dashboard/page.tsx stats migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx`

Migrate dashboard stats from Redux `reportSlice.fetchDashboardStats`. Keep announcements fetch as-is (will be migrated in Batch 7). Keep chart data (`fetchDashboardCharts`) as-is or replace with `dashboardStats` query data.

- [ ] **Step 1: Read the full dashboard page**

Read the current file at `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx`.

- [ ] **Step 2: Replace dashboard stats Redux with Apollo**

Remove `fetchDashboardStats` and `fetchDashboardCharts` dispatch calls. Add:
```typescript
import { useQuery } from "@apollo/client";
import { DASHBOARD_STATS } from "@/graphql/queries/reports";

const { data: statsData, loading: statsLoading } = useQuery(DASHBOARD_STATS);
const stats = statsData?.dashboardStats;
```

Replace all `stats.pending_leaves` with `stats?.pendingLeaves`, etc. (see field mapping above).

Keep `fetchAnnouncements` Redux slice call untouched — it will be replaced in Batch 7.

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/dashboard/page.tsx"
git commit -m "feat(batch6): migrate dashboard stats to Apollo GraphQL"
```
