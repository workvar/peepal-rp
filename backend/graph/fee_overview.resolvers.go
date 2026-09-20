package graph

// The fees overview: headline totals plus course, payment-mode, and monthly
// breakdowns, and the most recent payments.

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) FeeOverview(ctx context.Context) (*model.FeeOverview, error) {
	// Tenant-wide collection analytics: fee-office roles only.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}

	summary, err := r.Query().FeeCollectionSummary(ctx)
	if err != nil {
		return nil, err
	}

	// Per-course expected/collected/pending from materialized student fees.
	type courseRow struct {
		CourseID     string
		CourseName   string
		Expected     float64
		Collected    float64
		Pending      float64
		StudentCount int64
	}
	var courseRows []courseRow
	r.DB.WithContext(ctx).Model(&models.StudentFee{}).
		Joins("JOIN students ON students.id = student_fees.student_id").
		Joins("JOIN courses ON courses.id = students.course_id").
		Where("student_fees.tenant_id = ?", auth.TenantID).
		Select("courses.id as course_id, courses.name as course_name, " +
			"COALESCE(SUM(student_fees.net_amount), 0) as expected, " +
			"COALESCE(SUM(student_fees.paid_amount), 0) as collected, " +
			"COALESCE(SUM(student_fees.net_amount - student_fees.paid_amount), 0) as pending, " +
			"COUNT(DISTINCT student_fees.student_id) as student_count").
		Group("courses.id, courses.name").
		Order("expected DESC").
		Scan(&courseRows)
	byCourse := make([]*model.FeeCourseRow, len(courseRows))
	for i, c := range courseRows {
		byCourse[i] = &model.FeeCourseRow{
			CourseID:     c.CourseID,
			CourseName:   c.CourseName,
			Expected:     c.Expected,
			Collected:    c.Collected,
			Pending:      c.Pending,
			StudentCount: int(c.StudentCount),
		}
	}

	type aggRow struct {
		Key    string
		Amount float64
		Count  int64
	}
	var modeRows []aggRow
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("tenant_id = ? AND status = ?", auth.TenantID, "paid").
		Select("payment_mode as key, SUM(amount) as amount, COUNT(*) as count").
		Group("payment_mode").Scan(&modeRows)
	byMode := make([]*model.FeeModeRow, len(modeRows))
	for i, m := range modeRows {
		byMode[i] = &model.FeeModeRow{Mode: m.Key, Amount: m.Amount, Count: int(m.Count)}
	}

	var monthRows []aggRow
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("tenant_id = ? AND status = ?", auth.TenantID, "paid").
		Select("TO_CHAR(payment_date, 'YYYY-MM') as key, SUM(amount) as amount, COUNT(*) as count").
		Group("TO_CHAR(payment_date, 'YYYY-MM')").Order("key ASC").Scan(&monthRows)
	byMonth := make([]*model.FeeMonthRow, len(monthRows))
	for i, m := range monthRows {
		byMonth[i] = &model.FeeMonthRow{Month: m.Key, Amount: m.Amount, Count: int(m.Count)}
	}

	var payments []models.FeePayment
	r.DB.WithContext(ctx).Where("tenant_id = ? AND status = ?", auth.TenantID, "paid").
		Preload("Student").Preload("Student.User").
		Order("created_at DESC").Limit(10).Find(&payments)
	recent := make([]*model.FeePayment, len(payments))
	for i, p := range payments {
		recent[i] = feePaymentToModel(p)
	}

	return &model.FeeOverview{
		Summary:        summary,
		ByCourse:       byCourse,
		ByMode:         byMode,
		ByMonth:        byMonth,
		RecentPayments: recent,
	}, nil
}
