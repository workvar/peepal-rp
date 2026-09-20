package handlers

// Salary template handlers. Assignments live in salary_assignments.go, payroll in salary_payroll.go, shared helpers in salary_helpers.go.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"log"

	"github.com/gofiber/fiber/v2"
)

// ── Salary Templates ─────────────────────────────────────────────
// Named, reusable salary structures that can be assigned to many employees.

type salaryTemplateRequest struct {
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	BasicSalary      float64 `json:"basic_salary"`
	HRA              float64 `json:"hra"`
	DA               float64 `json:"da"`
	TA               float64 `json:"ta"`
	MedicalAllowance float64 `json:"medical_allowance"`
	OtherAllowances  float64 `json:"other_allowances"`
	PF               float64 `json:"pf"`
	ESI              float64 `json:"esi"`
	TDS              float64 `json:"tds"`
	OtherDeductions  float64 `json:"other_deductions"`
}

// ListSalaryTemplates returns all salary templates for the tenant.
func ListSalaryTemplates(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var templates []models.SalaryTemplate
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Order("name asc").Find(&templates).Error; err != nil {
		log.Printf("ListSalaryTemplates: tenant=%s err=%v", tenantID, err)
		return utils.InternalError(c, "Failed to load templates: "+err.Error())
	}
	return utils.OK(c, templates, "")
}

// CreateSalaryTemplate creates a new salary template for the tenant.
func CreateSalaryTemplate(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req salaryTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" {
		return utils.BadRequest(c, "name is required")
	}
	if req.BasicSalary <= 0 {
		return utils.BadRequest(c, "basic_salary must be positive")
	}

	t := models.SalaryTemplate{
		TenantID:         tenantID,
		Name:             req.Name,
		Description:      req.Description,
		BasicSalary:      req.BasicSalary,
		HRA:              req.HRA,
		DA:               req.DA,
		TA:               req.TA,
		MedicalAllowance: req.MedicalAllowance,
		OtherAllowances:  req.OtherAllowances,
		PF:               req.PF,
		ESI:              req.ESI,
		TDS:              req.TDS,
		OtherDeductions:  req.OtherDeductions,
		IsActive:         true,
	}
	if err := database.DB.WithContext(c.Context()).Create(&t).Error; err != nil {
		log.Printf("CreateSalaryTemplate: tenant=%s name=%q err=%v", tenantID, req.Name, err)
		return utils.InternalError(c, "Failed to create template: "+err.Error())
	}
	return utils.Created(c, t, "Salary template created")
}

// UpdateSalaryTemplate updates an existing salary template.
func UpdateSalaryTemplate(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var t models.SalaryTemplate
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&t).Error; err != nil {
		return utils.NotFound(c, "Template not found")
	}
	var req salaryTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name != "" {
		t.Name = req.Name
	}
	t.Description = req.Description
	if req.BasicSalary > 0 {
		t.BasicSalary = req.BasicSalary
	}
	t.HRA = req.HRA
	t.DA = req.DA
	t.TA = req.TA
	t.MedicalAllowance = req.MedicalAllowance
	t.OtherAllowances = req.OtherAllowances
	t.PF = req.PF
	t.ESI = req.ESI
	t.TDS = req.TDS
	t.OtherDeductions = req.OtherDeductions
	if err := database.DB.WithContext(c.Context()).Save(&t).Error; err != nil {
		log.Printf("UpdateSalaryTemplate: id=%s err=%v", id, err)
		return utils.InternalError(c, "Failed to update template: "+err.Error())
	}
	return utils.OK(c, t, "Template updated")
}

// DeleteSalaryTemplate deletes a template that is not in use by active assignments.
func DeleteSalaryTemplate(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	// Refuse deletion if the template is currently assigned to any employee.
	// Admins should reassign affected employees first — this prevents losing
	// the template a live payroll run might depend on.
	var count int64
	database.DB.WithContext(c.Context()).Model(&models.SalaryAssignment{}).
		Where("tenant_id = ? AND template_id = ? AND is_active = ?", tenantID, id, true).
		Count(&count)
	if count > 0 {
		return utils.BadRequest(c, "Template is in use by active assignments. Reassign those employees first.")
	}

	res := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.SalaryTemplate{})
	if res.Error != nil {
		log.Printf("DeleteSalaryTemplate: id=%s err=%v", id, res.Error)
		return utils.InternalError(c, "Failed to delete template: "+res.Error.Error())
	}
	if res.RowsAffected == 0 {
		return utils.NotFound(c, "Template not found")
	}
	return utils.OK(c, nil, "Template deleted")
}
