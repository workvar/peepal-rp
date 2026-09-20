package handlers

// Shared salary helpers: payroll assignment resolution and the legacy salary-structure mapper.

import (
	"collegeerp/database"
	"collegeerp/models"
	"time"
)

// resolveAssignmentForPayroll looks up which SalaryAssignment should drive
// payroll for a given (employee, month, year). It picks the latest
// assignment whose effective_from is on or before the last day of the
// payroll month (so mid-month changes take effect that month, matching
// the typical HR rule).
func resolveAssignmentForPayroll(tenantID, employeeID string, month, year int) (*models.SalaryAssignment, error) {
	payrollEnd := time.Date(year, time.Month(month)+1, 0, 23, 59, 59, 0, time.UTC)
	var a models.SalaryAssignment
	err := database.DB.Where(
		"tenant_id = ? AND employee_id = ? AND effective_from <= ?",
		tenantID, employeeID, payrollEnd,
	).Preload("TemplateModel").
		Order("effective_from desc").
		First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// assignmentToLegacyStructure builds a SalaryStructure-shaped view from an
// assignment so legacy clients (old frontend payroll page, old GraphQL
// query) keep working without changes.
func assignmentToLegacyStructure(a models.SalaryAssignment) models.SalaryStructure {
	t := a.TemplateModel
	// Extras fold into the "other" buckets so the legacy view still shows
	// the true gross/net without introducing new columns.
	return models.SalaryStructure{
		ID:               a.ID,
		TenantID:         a.TenantID,
		EmployeeID:       a.EmployeeID,
		EmployeeModel:    a.EmployeeModel,
		BasicSalary:      t.BasicSalary,
		HRA:              t.HRA,
		DA:               t.DA,
		TA:               t.TA,
		MedicalAllowance: t.MedicalAllowance,
		OtherAllowances:  t.OtherAllowances + a.ExtraAllowance,
		PF:               t.PF,
		ESI:              t.ESI,
		TDS:              t.TDS,
		OtherDeductions:  t.OtherDeductions + a.ExtraDeduction,
		EffectiveFrom:    a.EffectiveFrom,
		IsActive:         a.IsActive,
		Notes:            a.Notes,
		CreatedAt:        a.CreatedAt,
		UpdatedAt:        a.UpdatedAt,
	}
}
