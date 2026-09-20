package graph

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Salary Structure (read-only compatibility layer) ─────────────────
// The `SalaryStructure` GraphQL type is retained for backward compatibility
// with older clients. Under the hood it now reads from the new
// SalaryTemplate + SalaryAssignment tables. Writes through this type have
// been turned into errors — callers should use the REST /salary-templates
// and /salary-assignments endpoints instead.

func (r *queryResolver) SalaryStructures(ctx context.Context, employeeID *string) ([]*model.SalaryStructure, error) {
	// Salary data across employees: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Preload("TemplateModel").
		Order("effective_from desc")
	if employeeID != nil {
		q = q.Where("employee_id = ?", *employeeID)
	}
	var list []models.SalaryAssignment
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.SalaryStructure, len(list))
	for i, a := range list {
		out[i] = assignmentToSalaryStructureModel(a)
	}
	return out, nil
}

// ── Payroll Queries ──────────────────────────────────────────

func (r *queryResolver) Payrolls(ctx context.Context, month *int, year *int, employeeID *string, status *string) ([]*model.Payroll, error) {
	// Payroll data across employees: admin only (self-service uses myPayrolls).
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Order("year desc, month desc")
	if month != nil {
		q = q.Where("month = ?", *month)
	}
	if year != nil {
		q = q.Where("year = ?", *year)
	}
	if employeeID != nil {
		q = q.Where("employee_id = ?", *employeeID)
	}
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	var list []models.Payroll
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Payroll, len(list))
	for i, p := range list {
		out[i] = enrichPayrollForDisplay(r.DB, auth.TenantID, p)
	}
	return out, nil
}

func (r *queryResolver) MyPayrolls(ctx context.Context) ([]*model.Payroll, error) {
	// Self-service: scoped to the caller's own employee record below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var employee models.Employee
	if err := r.DB.Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
		First(&employee).Error; err != nil {
		return nil, ErrNotFound
	}
	var list []models.Payroll
	if err := r.DB.Where("tenant_id = ? AND employee_id = ?", auth.TenantID, employee.ID).
		Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		Order("year desc, month desc").Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Payroll, len(list))
	for i, p := range list {
		out[i] = enrichPayrollForDisplay(r.DB, auth.TenantID, p)
	}
	return out, nil
}

func (r *queryResolver) PayrollSummary(ctx context.Context, month *int, year *int) (*model.PayrollSummary, error) {
	// Tenant-wide payroll totals: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	if month != nil {
		q = q.Where("month = ?", *month)
	}
	if year != nil {
		q = q.Where("year = ?", *year)
	}
	var list []models.Payroll
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}

	summary := &model.PayrollSummary{TotalEmployees: len(list)}
	for _, p := range list {
		summary.TotalGross += p.GrossSalary
		summary.TotalDeductions += p.TotalDeductions
		summary.TotalNet += p.NetSalary
		switch p.Status {
		case "draft":
			summary.DraftCount++
		case "approved":
			summary.ApprovedCount++
		case "paid":
			summary.PaidCount++
		}
	}
	return summary, nil
}

// ── Salary Structure Mutations (deprecated) ─────────────────────
// These now return ErrValidation with a message pointing callers at the
// new template + assignment flow. Kept only so the generated.go scaffold
// compiles — the actual flow has moved to REST.

var errSalaryStructureRetired = fmt.Errorf("%w: salary-structure GraphQL mutations are retired; use /salary-templates and /salary-assignments REST endpoints", ErrValidation)

func (r *mutationResolver) CreateSalaryStructure(ctx context.Context, input model.CreateSalaryStructureInput) (*model.SalaryStructure, error) {
	return nil, errSalaryStructureRetired
}

func (r *mutationResolver) UpdateSalaryStructure(ctx context.Context, id string, input model.UpdateSalaryStructureInput) (*model.SalaryStructure, error) {
	return nil, errSalaryStructureRetired
}

func (r *mutationResolver) DeleteSalaryStructure(ctx context.Context, id string) (bool, error) {
	return false, errSalaryStructureRetired
}

// ── Payroll Mutations ──────────────────────────────────────────

func (r *mutationResolver) GeneratePayroll(ctx context.Context, input model.GeneratePayrollInput) (*model.Payroll, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Month < 1 || input.Month > 12 {
		return nil, ErrValidation
	}

	// Duplicate check.
	var existing models.Payroll
	res := r.DB.Where("tenant_id = ? AND employee_id = ? AND month = ? AND year = ?",
		auth.TenantID, input.EmployeeID, input.Month, input.Year).Limit(1).Find(&existing)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected > 0 {
		return nil, ErrValidation
	}

	// Resolve the assignment → template for the payroll period.
	payrollPeriodEnd := time.Date(input.Year, time.Month(input.Month)+1, 0, 23, 59, 59, 0, time.UTC)
	var assignment models.SalaryAssignment
	if err := r.DB.Where(
		"tenant_id = ? AND employee_id = ? AND effective_from <= ?",
		auth.TenantID, input.EmployeeID, payrollPeriodEnd,
	).Preload("TemplateModel").
		Order("effective_from desc").
		First(&assignment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: no salary template assigned to this employee effective on or before %s", ErrValidation, payrollPeriodEnd.Format("2006-01-02"))
		}
		return nil, err
	}
	tpl := assignment.TemplateModel

	ratio := 1.0
	if input.WorkingDays > 0 {
		ratio = float64(input.PresentDays+input.LeaveDays) / float64(input.WorkingDays)
		if ratio > 1.0 {
			ratio = 1.0
		}
		if ratio < 0 {
			ratio = 0
		}
	}

	basic := tpl.BasicSalary * ratio
	hra := tpl.HRA * ratio
	da := tpl.DA * ratio
	ta := tpl.TA * ratio
	medical := tpl.MedicalAllowance * ratio
	other := tpl.OtherAllowances * ratio
	extraAllow := assignment.ExtraAllowance * ratio
	gross := basic + hra + da + ta + medical + other + extraAllow
	totalDed := tpl.PF + tpl.ESI + tpl.TDS + tpl.OtherDeductions + assignment.ExtraDeduction
	net := gross - totalDed
	if net < 0 {
		net = 0
	}

	p := models.Payroll{
		TenantID:         auth.TenantID,
		EmployeeID:       input.EmployeeID,
		TemplateID:       tpl.ID,
		TemplateName:     tpl.Name,
		Month:            input.Month,
		Year:             input.Year,
		BasicSalary:      basic,
		HRA:              hra,
		DA:               da,
		TA:               ta,
		MedicalAllowance: medical,
		OtherAllowances:  other,
		ExtraAllowance:   extraAllow,
		GrossSalary:      gross,
		PF:               tpl.PF,
		ESI:              tpl.ESI,
		TDS:              tpl.TDS,
		OtherDeductions:  tpl.OtherDeductions,
		ExtraDeduction:   assignment.ExtraDeduction,
		TotalDeductions:  totalDed,
		NetSalary:        net,
		WorkingDays:      input.WorkingDays,
		PresentDays:      input.PresentDays,
		LeaveDays:        input.LeaveDays,
		Status:           "draft",
		ProcessedBy:      auth.UserID,
		Notes:            strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		// GL (cash-basis expense): salary expense incurred, cash paid out (net).
		return postBatch(tx, auth.TenantID, payrollPeriodEnd.Format("2006-01-02"),
			fmt.Sprintf("Payroll %02d/%d", p.Month, p.Year), models.LedgerSourcePayroll, p.ID,
			[]postLine{
				{AccountKey: "salary_expense", Debit: p.NetSalary},
				{AccountKey: "cash", Credit: p.NetSalary},
			})
	}); err != nil {
		return nil, err
	}
	if err := r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&p, "id = ?", p.ID).Error; err != nil {
		return nil, err
	}
	return payrollToModel(p), nil
}

func (r *mutationResolver) UpdatePayrollStatus(ctx context.Context, id string, input model.UpdatePayrollStatusInput) (*model.Payroll, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var p models.Payroll
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	validStatuses := map[string]bool{"draft": true, "approved": true, "paid": true}
	if !validStatuses[input.Status] {
		return nil, ErrValidation
	}
	p.Status = input.Status
	if input.PaymentDate != nil && *input.PaymentDate != "" {
		// The frontend's Mark-Paid modal sends a full RFC3339 timestamp
		// ("2026-04-21T00:00:00.000Z") while older callers send date-only
		// ("2026-04-21"). Try both so whichever the client picked works
		// — previously the RFC3339 input silently failed here and the
		// Paid-On column ended up empty in the table.
		if t, err := parseFlexibleDate(*input.PaymentDate); err == nil {
			p.PaymentDate = &t
		} else {
			return nil, fmt.Errorf("%w: paymentDate must be YYYY-MM-DD or RFC3339", ErrValidation)
		}
	}
	if input.PaymentMode != nil {
		p.PaymentMode = *input.PaymentMode
	}
	if err := r.DB.Save(&p).Error; err != nil {
		return nil, err
	}
	if err := r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&p, "id = ?", p.ID).Error; err != nil {
		return nil, err
	}
	return payrollToModel(p), nil
}

func (r *mutationResolver) DeletePayroll(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var p models.Payroll
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	if p.Status == "paid" {
		return false, ErrValidation
	}
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&p).Error; err != nil {
			return err
		}
		// GL: unwind the payroll posting.
		return reverseBatch(tx, auth.TenantID, models.LedgerSourcePayroll, p.ID)
	}); err != nil {
		return false, err
	}
	return true, nil
}

// ── Model conversion helpers ──────────────────────────────────

// assignmentToSalaryStructureModel maps a (assignment, template) pair into
// the legacy GraphQL SalaryStructure shape. Extra allowance/deduction
// overrides are folded into the "other" buckets so old consumers still see
// correct totals.
func assignmentToSalaryStructureModel(a models.SalaryAssignment) *model.SalaryStructure {
	t := a.TemplateModel
	ss := &model.SalaryStructure{
		ID:               a.ID,
		EmployeeID:       a.EmployeeID,
		BasicSalary:      t.BasicSalary,
		Hra:              t.HRA,
		Da:               t.DA,
		Ta:               t.TA,
		MedicalAllowance: t.MedicalAllowance,
		OtherAllowances:  t.OtherAllowances + a.ExtraAllowance,
		Pf:               t.PF,
		Esi:              t.ESI,
		Tds:              t.TDS,
		OtherDeductions:  t.OtherDeductions + a.ExtraDeduction,
		EffectiveFrom:    a.EffectiveFrom.Format("2006-01-02"),
		IsActive:         a.IsActive,
		Notes:            toStrPtr(a.Notes),
	}
	if a.EmployeeModel.ID != "" {
		ss.Employee = employeeToModel(a.EmployeeModel)
	}
	return ss
}

// parseFlexibleDate accepts either a date-only "2006-01-02" string or an
// RFC3339 timestamp. Any client that uses an <input type="date"> produces
// the former, while some modal flows append "T00:00:00.000Z" to produce the
// latter — both should be treated as the same wall-clock date.
func parseFlexibleDate(s string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("unrecognised date: %q", s)
}

// enrichPayrollForDisplay runs payrollToModel but also fills in anything the
// preload chain left empty, so the payroll list table always shows the
// employee name, department, and template it was generated against. It
// guards against three failure modes we've seen in production:
//
//  1. EmployeeModel preload returned an empty struct (FK mismatch, orphan,
//     stale cache). The Employee column in the UI shows "—" even though
//     the employee exists.
//  2. EmployeeModel was populated but its nested User was not — GORM's
//     multi-level Preload silently drops the nested record in some edge
//     cases (e.g. mismatched tenant scoping on the user row). The row's
//     name/email come back blank.
//  3. TemplateName was never snapshotted on the payroll (older rows
//     created before the template system existed).
//
// We fix each by refetching directly. The extra query per row is cheap
// relative to the UX cost of a blank Employee column.
func enrichPayrollForDisplay(db *gorm.DB, tenantID string, p models.Payroll) *model.Payroll {
	needsEmployeeRefetch := p.EmployeeModel.ID == "" ||
		p.EmployeeModel.User.ID == "" ||
		p.EmployeeModel.User.Name == ""

	if needsEmployeeRefetch && p.EmployeeID != "" {
		var emp models.Employee
		if err := db.Where("id = ?", p.EmployeeID).
			Preload("User").Preload("Department").First(&emp).Error; err != nil {
			log.Printf(
				"enrichPayrollForDisplay: employee refetch failed payroll=%s emp=%s tenant=%s err=%v",
				p.ID, p.EmployeeID, tenantID, err,
			)
		} else {
			// If the user row is still blank, make one more direct attempt —
			// some installs have an inconsistency where User is scoped
			// differently than Employee.
			if emp.User.ID == "" && emp.UserID != "" {
				var u models.User
				if err := db.Where("id = ?", emp.UserID).First(&u).Error; err == nil {
					emp.User = u
				} else {
					log.Printf(
						"enrichPayrollForDisplay: user refetch failed payroll=%s user=%s err=%v",
						p.ID, emp.UserID, err,
					)
				}
			}
			p.EmployeeModel = emp
		}
	}

	// Fall back to the active salary assignment's template name when the
	// snapshotted name on the payroll row is empty. Old rows won't have it.
	if p.TemplateName == "" && p.EmployeeID != "" {
		var assignment models.SalaryAssignment
		if err := db.Where(
			"tenant_id = ? AND employee_id = ? AND is_active = ?",
			tenantID, p.EmployeeID, true,
		).Preload("TemplateModel").First(&assignment).Error; err == nil {
			p.TemplateName = assignment.TemplateModel.Name
		}
	}
	return payrollToModel(p)
}

func payrollToModel(p models.Payroll) *model.Payroll {
	pm := &model.Payroll{
		ID:               p.ID,
		EmployeeID:       p.EmployeeID,
		Month:            p.Month,
		Year:             p.Year,
		BasicSalary:      p.BasicSalary,
		Hra:              p.HRA,
		Da:               p.DA,
		Ta:               p.TA,
		MedicalAllowance: p.MedicalAllowance,
		OtherAllowances:  p.OtherAllowances,
		ExtraAllowance:   p.ExtraAllowance,
		GrossSalary:      p.GrossSalary,
		Pf:               p.PF,
		Esi:              p.ESI,
		Tds:              p.TDS,
		OtherDeductions:  p.OtherDeductions,
		ExtraDeduction:   p.ExtraDeduction,
		TotalDeductions:  p.TotalDeductions,
		NetSalary:        p.NetSalary,
		WorkingDays:      p.WorkingDays,
		PresentDays:      p.PresentDays,
		LeaveDays:        p.LeaveDays,
		Status:           p.Status,
		PaymentMode:      toStrPtr(p.PaymentMode),
		Notes:            toStrPtr(p.Notes),
		ProcessedBy:      toStrPtr(p.ProcessedBy),
		TemplateName:     toStrPtr(p.TemplateName),
	}
	if p.PaymentDate != nil {
		s := p.PaymentDate.Format("2006-01-02")
		pm.PaymentDate = &s
	}
	if p.EmployeeModel.ID != "" {
		pm.Employee = employeeToModel(p.EmployeeModel)
	}
	return pm
}
