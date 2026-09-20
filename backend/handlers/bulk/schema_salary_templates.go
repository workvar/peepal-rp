package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var salaryTemplatesSchema = &Schema{
	Resource:    "salary_templates",
	Title:       "Salary Templates",
	Description: "Create named, reusable salary templates in bulk. Each template defines pay components and deductions that can later be assigned to one or more employees.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Template Name", Type: FieldString, Required: true,
			Description: "Unique, human-readable name for the template.",
			Example:     "Assistant Professor - Grade A",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional note explaining what this template is for.",
			Example:     "Standard scale for AP Grade A with DA revision 2024",
		},
		{
			Name: "basic_salary", Label: "Basic Salary", Type: FieldFloat, Required: true,
			Description: "Base monthly salary (must be > 0).",
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
			Description: "Any other recurring allowances. Defaults to 0.",
			Example:     "500",
		},
		{
			Name: "pf", Label: "PF", Type: FieldFloat,
			Description: "Provident Fund deduction. Defaults to 0.",
			Example:     "5400",
		},
		{
			Name: "esi", Label: "ESI", Type: FieldFloat,
			Description: "Employee State Insurance deduction. Defaults to 0.",
			Example:     "750",
		},
		{
			Name: "tds", Label: "TDS", Type: FieldFloat,
			Description: "Tax Deducted at Source. Defaults to 0.",
			Example:     "2000",
		},
		{
			Name: "other_deductions", Label: "Other Deductions", Type: FieldFloat,
			Description: "Any other recurring deductions. Defaults to 0.",
			Example:     "0",
		},
	},
	Create: createSalaryTemplateRow,
}

func createSalaryTemplateRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	basicSalary := ParseFloat(row["basic_salary"])
	if basicSalary <= 0 {
		return "", errors.New("basic_salary must be greater than 0")
	}

	name := strings.TrimSpace(row["name"])

	// Prevent duplicate template names within the tenant.
	var existing models.SalaryTemplate
	if err := database.DB.
		Where("tenant_id = ? AND name = ?", ctx.TenantID, name).
		First(&existing).Error; err == nil {
		return "", errors.New("a template with this name already exists")
	}

	t := models.SalaryTemplate{
		TenantID:         ctx.TenantID,
		Name:             name,
		Description:      strings.TrimSpace(row["description"]),
		BasicSalary:      basicSalary,
		HRA:              ParseFloat(row["hra"]),
		DA:               ParseFloat(row["da"]),
		TA:               ParseFloat(row["ta"]),
		MedicalAllowance: ParseFloat(row["medical_allowance"]),
		OtherAllowances:  ParseFloat(row["other_allowances"]),
		PF:               ParseFloat(row["pf"]),
		ESI:              ParseFloat(row["esi"]),
		TDS:              ParseFloat(row["tds"]),
		OtherDeductions:  ParseFloat(row["other_deductions"]),
		IsActive:         true,
	}
	if err := database.DB.Create(&t).Error; err != nil {
		return "", errors.New("could not create salary template")
	}
	return t.ID, nil
}

func init() { Register(salaryTemplatesSchema) }
