package bulk

import (
	"errors"
	"fmt"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var payrollSchema = &Schema{
	Resource:    "payroll",
	Title:       "Payroll",
	Description: "Import historical or pre-computed payroll records in bulk. Each row creates one payroll entry for an employee for the given month and year. Totals (gross, deductions, net) are computed automatically from the provided components.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "employee", Label: "Employee (Employee ID or UUID)", Type: FieldString, Required: true,
			Description: "The employee's staff code (e.g. EMP0421) or internal UUID.",
			Example:     "EMP0421",
		},
		{
			Name: "month", Label: "Month", Type: FieldInt, Required: true,
			Description: "Payroll month as a number (1 = January … 12 = December).",
			Example:     "6",
		},
		{
			Name: "year", Label: "Year", Type: FieldInt, Required: true,
			Description: "Four-digit payroll year.",
			Example:     "2026",
		},
		{
			Name: "basic_salary", Label: "Basic Salary", Type: FieldFloat, Required: true,
			Description: "Basic salary component for this month.",
			Example:     "45000",
		},
		{
			Name: "hra", Label: "HRA", Type: FieldFloat,
			Description: "House Rent Allowance. Defaults to 0.",
			Example:     "9000",
		},
		{
			Name: "da", Label: "DA", Type: FieldFloat,
			Description: "Dearness Allowance. Defaults to 0.",
			Example:     "6750",
		},
		{
			Name: "ta", Label: "TA", Type: FieldFloat,
			Description: "Travel Allowance. Defaults to 0.",
			Example:     "1500",
		},
		{
			Name: "medical_allowance", Label: "Medical Allowance", Type: FieldFloat,
			Description: "Medical allowance. Defaults to 0.",
			Example:     "1250",
		},
		{
			Name: "other_allowances", Label: "Other Allowances", Type: FieldFloat,
			Description: "Any other allowances. Defaults to 0.",
			Example:     "500",
		},
		{
			Name: "extra_allowance", Label: "Extra Allowance", Type: FieldFloat,
			Description: "One-off extra allowance for this month (bonus, etc.). Defaults to 0.",
			Example:     "0",
		},
		{
			Name: "pf", Label: "PF", Type: FieldFloat,
			Description: "Provident Fund deduction. Defaults to 0.",
			Example:     "5400",
		},
		{
			Name: "esi", Label: "ESI", Type: FieldFloat,
			Description: "ESI deduction. Defaults to 0.",
			Example:     "750",
		},
		{
			Name: "tds", Label: "TDS", Type: FieldFloat,
			Description: "Tax Deducted at Source. Defaults to 0.",
			Example:     "2000",
		},
		{
			Name: "other_deductions", Label: "Other Deductions", Type: FieldFloat,
			Description: "Any other deductions. Defaults to 0.",
			Example:     "0",
		},
		{
			Name: "extra_deduction", Label: "Extra Deduction", Type: FieldFloat,
			Description: "One-off extra deduction for this month. Defaults to 0.",
			Example:     "0",
		},
		{
			Name: "working_days", Label: "Working Days", Type: FieldInt,
			Description: "Total working days in this month. Defaults to 0.",
			Example:     "26",
		},
		{
			Name: "present_days", Label: "Present Days", Type: FieldInt,
			Description: "Days the employee was present. Defaults to 0.",
			Example:     "25",
		},
		{
			Name: "leave_days", Label: "Leave Days", Type: FieldInt,
			Description: "Days on approved leave. Defaults to 0.",
			Example:     "1",
		},
		{
			Name: "status", Label: "Status", Type: FieldEnum,
			AllowedValues: []string{"draft", "approved", "paid"},
			Description:   "Payroll status. Defaults to 'draft'.",
			Example:       "approved",
		},
		{
			Name: "payment_mode", Label: "Payment Mode", Type: FieldString,
			Description: "How salary was paid (e.g. bank_transfer, cash, cheque).",
			Example:     "bank_transfer",
		},
		{
			Name: "payment_date", Label: "Payment Date", Type: FieldDate,
			Description: "Date salary was paid (YYYY-MM-DD). Required when status is 'paid'.",
			Example:     "2026-06-30",
		},
		{
			Name: "notes", Label: "Notes", Type: FieldString,
			Description: "Optional remarks for this payroll entry.",
			Example:     "",
		},
	},
	Create: createPayrollRow,
}

func createPayrollRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	// Resolve employee.
	empRef := strings.TrimSpace(row["employee"])
	var emp models.Employee
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR employee_id = ?)", ctx.TenantID, empRef, empRef).
		First(&emp).Error; err != nil {
		return "", errors.New("employee not found: " + empRef)
	}

	month := ParseInt(row["month"])
	year := ParseInt(row["year"])
	if month < 1 || month > 12 {
		return "", errors.New("month must be 1–12")
	}
	if year < 2000 || year > 2100 {
		return "", errors.New("year must be 2000–2100")
	}

	// Prevent duplicate payroll for the same employee/month/year.
	var existing models.Payroll
	if err := database.DB.
		Where("tenant_id = ? AND employee_id = ? AND month = ? AND year = ?",
			ctx.TenantID, emp.ID, month, year).
		First(&existing).Error; err == nil {
		return "", fmt.Errorf("payroll already exists for %s %d/%d", empRef, month, year)
	}

	basicSalary := ParseFloat(row["basic_salary"])
	if basicSalary <= 0 {
		return "", errors.New("basic_salary must be greater than 0")
	}

	hra := ParseFloat(row["hra"])
	da := ParseFloat(row["da"])
	ta := ParseFloat(row["ta"])
	medical := ParseFloat(row["medical_allowance"])
	otherAllow := ParseFloat(row["other_allowances"])
	extraAllow := ParseFloat(row["extra_allowance"])

	pf := ParseFloat(row["pf"])
	esi := ParseFloat(row["esi"])
	tds := ParseFloat(row["tds"])
	otherDed := ParseFloat(row["other_deductions"])
	extraDed := ParseFloat(row["extra_deduction"])

	gross := basicSalary + hra + da + ta + medical + otherAllow + extraAllow
	totalDed := pf + esi + tds + otherDed + extraDed
	net := gross - totalDed
	if net < 0 {
		net = 0
	}

	status := strings.TrimSpace(row["status"])
	if status == "" {
		status = "draft"
	}

	p := models.Payroll{
		TenantID:         ctx.TenantID,
		EmployeeID:       emp.ID,
		Month:            month,
		Year:             year,
		BasicSalary:      basicSalary,
		HRA:              hra,
		DA:               da,
		TA:               ta,
		MedicalAllowance: medical,
		OtherAllowances:  otherAllow,
		ExtraAllowance:   extraAllow,
		GrossSalary:      gross,
		PF:               pf,
		ESI:              esi,
		TDS:              tds,
		OtherDeductions:  otherDed,
		ExtraDeduction:   extraDed,
		TotalDeductions:  totalDed,
		NetSalary:        net,
		WorkingDays:      ParseInt(row["working_days"]),
		PresentDays:      ParseInt(row["present_days"]),
		LeaveDays:        ParseInt(row["leave_days"]),
		Status:           status,
		PaymentMode:      strings.TrimSpace(row["payment_mode"]),
		Notes:            strings.TrimSpace(row["notes"]),
		ProcessedBy:      ctx.ActorID,
	}

	if d := ParseDate(row["payment_date"]); !d.IsZero() {
		p.PaymentDate = &d
	}

	if err := database.DB.Create(&p).Error; err != nil {
		return "", errors.New("could not create payroll record")
	}
	return p.ID, nil
}

func init() { Register(payrollSchema) }
