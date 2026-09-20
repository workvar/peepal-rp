package bulk

import (
	"errors"
	"strings"
	"time"

	"collegeerp/database"
	"collegeerp/models"

	"gorm.io/gorm"
)

var salaryAssignmentsSchema = &Schema{
	Resource:    "salary_assignments",
	Title:       "Salary Assignments",
	Description: "Assign a salary template to employees in bulk. Each row links one employee to a named template from a given date. Any existing active assignment for that employee is automatically closed.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "employee", Label: "Employee (Employee ID or UUID)", Type: FieldString, Required: true,
			Description: "The employee's staff code (e.g. EMP0421) or internal UUID.",
			Example:     "EMP0421",
		},
		{
			Name: "template", Label: "Template (Name or UUID)", Type: FieldString, Required: true,
			Description: "The exact name of the salary template or its internal UUID.",
			Example:     "Assistant Professor - Grade A",
		},
		{
			Name: "effective_from", Label: "Effective From", Type: FieldDate,
			Description: "Date the assignment takes effect (YYYY-MM-DD). Defaults to today.",
			Example:     "2026-06-01",
		},
		{
			Name: "extra_allowance", Label: "Extra Allowance", Type: FieldFloat,
			Description: "One-off or recurring top-up allowance for this employee. Defaults to 0.",
			Example:     "500",
		},
		{
			Name: "extra_deduction", Label: "Extra Deduction", Type: FieldFloat,
			Description: "One-off or recurring extra deduction for this employee. Defaults to 0.",
			Example:     "0",
		},
		{
			Name: "notes", Label: "Notes", Type: FieldString,
			Description: "Optional notes about this assignment.",
			Example:     "Revised scale effective June 2026",
		},
	},
	Create: createSalaryAssignmentRow,
}

func createSalaryAssignmentRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	// Resolve employee by staff code or UUID.
	empRef := strings.TrimSpace(row["employee"])
	var emp models.Employee
	err := database.DB.
		Where("tenant_id = ? AND (id = ? OR employee_id = ?)", ctx.TenantID, empRef, empRef).
		First(&emp).Error
	if err != nil {
		return "", errors.New("employee not found: " + empRef)
	}

	// Resolve template by name or UUID.
	tplRef := strings.TrimSpace(row["template"])
	var tpl models.SalaryTemplate
	err = database.DB.
		Where("tenant_id = ? AND (id = ? OR name = ?)", ctx.TenantID, tplRef, tplRef).
		First(&tpl).Error
	if err != nil {
		return "", errors.New("salary template not found: " + tplRef)
	}

	effectiveFrom := ParseDate(row["effective_from"])
	if effectiveFrom.IsZero() {
		effectiveFrom = time.Now()
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Close any existing active assignment for this employee.
		closedAt := effectiveFrom.Add(-time.Second)
		tx.Model(&models.SalaryAssignment{}).
			Where("tenant_id = ? AND employee_id = ? AND is_active = ?", ctx.TenantID, emp.ID, true).
			Updates(map[string]interface{}{"is_active": false, "effective_to": &closedAt})

		a := models.SalaryAssignment{
			TenantID:       ctx.TenantID,
			EmployeeID:     emp.ID,
			TemplateID:     tpl.ID,
			EffectiveFrom:  effectiveFrom,
			ExtraAllowance: ParseFloat(row["extra_allowance"]),
			ExtraDeduction: ParseFloat(row["extra_deduction"]),
			Notes:          strings.TrimSpace(row["notes"]),
			IsActive:       true,
		}
		return tx.Create(&a).Error
	}); err != nil {
		return "", errors.New("could not create salary assignment")
	}

	// Return composite key as confirmation ID.
	return emp.EmployeeID + ":" + tpl.Name, nil
}

func init() { Register(salaryAssignmentsSchema) }
