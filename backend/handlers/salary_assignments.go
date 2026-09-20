package handlers

// Salary assignment handlers: assigning templates to employees, plus the legacy salary-structure shim endpoints.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type salaryAssignmentRequest struct {
	EmployeeID     string  `json:"employee_id"`
	TemplateID     string  `json:"template_id"`
	ExtraAllowance float64 `json:"extra_allowance"`
	ExtraDeduction float64 `json:"extra_deduction"`
	// EffectiveFrom is accepted as a date-only string ("YYYY-MM-DD") because
	// that's what an <input type="date"> serialises to. Go's default
	// time.Time unmarshaler rejects anything that isn't RFC3339, which broke
	// this endpoint for every frontend call. Every other handler in the
	// codebase uses the same convention (see employees.go, leaves.go, etc.).
	EffectiveFrom string `json:"effective_from"`
	Notes         string `json:"notes"`
}

// ListSalaryAssignments returns assignments scoped to the tenant.
// Optional filters: ?employee_id=...  ?template_id=...  ?active_only=true
func ListSalaryAssignments(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	employeeID := c.Query("employee_id")
	templateID := c.Query("template_id")
	activeOnly := c.Query("active_only") == "true"

	var assignments []models.SalaryAssignment
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Preload("TemplateModel")
	if employeeID != "" {
		q = q.Where("employee_id = ?", employeeID)
	}
	if templateID != "" {
		q = q.Where("template_id = ?", templateID)
	}
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	if err := q.Order("effective_from desc").Find(&assignments).Error; err != nil {
		log.Printf("ListSalaryAssignments: tenant=%s err=%v", tenantID, err)
		return utils.InternalError(c, "Failed to load assignments: "+err.Error())
	}
	return utils.OK(c, assignments, "")
}

// AssignSalaryTemplate assigns a template to a single employee.
// Any previously active assignment for the same employee is deactivated
// and its effective_to is set to the day before the new assignment starts,
// so monthly payroll can unambiguously resolve the correct template for a
// historical month.
func AssignSalaryTemplate(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req salaryAssignmentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.EmployeeID == "" || req.TemplateID == "" {
		return utils.BadRequest(c, "employee_id and template_id are required")
	}
	// Parse the YYYY-MM-DD date string, defaulting to today if omitted.
	// An explicit value that fails to parse is a client bug, so we surface
	// that back as a 400 rather than silently treating it as "now".
	var effectiveFrom time.Time
	if req.EffectiveFrom == "" {
		effectiveFrom = time.Now()
	} else {
		parsed, err := time.Parse("2006-01-02", req.EffectiveFrom)
		if err != nil {
			return utils.BadRequest(c, "effective_from must be in YYYY-MM-DD format")
		}
		effectiveFrom = parsed
	}

	// Validate the template belongs to this tenant.
	var tpl models.SalaryTemplate
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.TemplateID, tenantID).First(&tpl).Error; err != nil {
		return utils.BadRequest(c, "Template not found in this tenant")
	}

	if err := database.DB.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		// Close previous active assignment.
		closedAt := effectiveFrom.Add(-time.Second)
		if err := tx.Model(&models.SalaryAssignment{}).
			Where("tenant_id = ? AND employee_id = ? AND is_active = ?", tenantID, req.EmployeeID, true).
			Updates(map[string]interface{}{
				"is_active":    false,
				"effective_to": &closedAt,
			}).Error; err != nil {
			return err
		}
		a := models.SalaryAssignment{
			TenantID:       tenantID,
			EmployeeID:     req.EmployeeID,
			TemplateID:     req.TemplateID,
			ExtraAllowance: req.ExtraAllowance,
			ExtraDeduction: req.ExtraDeduction,
			EffectiveFrom:  effectiveFrom,
			IsActive:       true,
			Notes:          req.Notes,
		}
		return tx.Create(&a).Error
	}); err != nil {
		log.Printf("AssignSalaryTemplate: tenant=%s emp=%s tpl=%s err=%v", tenantID, req.EmployeeID, req.TemplateID, err)
		return utils.InternalError(c, "Failed to assign template: "+err.Error())
	}
	return utils.Created(c, nil, "Template assigned")
}

// BulkAssignSalaryTemplate assigns one template to many employees at once.
// Each employee's previous active assignment is closed out; a new one is
// created referencing the same template. Overrides (extra_allowance,
// extra_deduction) are applied uniformly — per-employee overrides should
// be set individually after the fact.
func BulkAssignSalaryTemplate(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	type Request struct {
		TemplateID     string   `json:"template_id"`
		EmployeeIDs    []string `json:"employee_ids"`
		ExtraAllowance float64  `json:"extra_allowance"`
		ExtraDeduction float64  `json:"extra_deduction"`
		// See AssignSalaryTemplate — accept YYYY-MM-DD so the <input
		// type="date"> serialisation works out of the box.
		EffectiveFrom string `json:"effective_from"`
		Notes         string `json:"notes"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.TemplateID == "" || len(req.EmployeeIDs) == 0 {
		return utils.BadRequest(c, "template_id and employee_ids are required")
	}
	var effectiveFrom time.Time
	if req.EffectiveFrom == "" {
		effectiveFrom = time.Now()
	} else {
		parsed, err := time.Parse("2006-01-02", req.EffectiveFrom)
		if err != nil {
			return utils.BadRequest(c, "effective_from must be in YYYY-MM-DD format")
		}
		effectiveFrom = parsed
	}

	var tpl models.SalaryTemplate
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.TemplateID, tenantID).First(&tpl).Error; err != nil {
		return utils.BadRequest(c, "Template not found in this tenant")
	}

	assigned := 0
	if err := database.DB.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		closedAt := effectiveFrom.Add(-time.Second)
		for _, empID := range req.EmployeeIDs {
			if empID == "" {
				continue
			}
			if err := tx.Model(&models.SalaryAssignment{}).
				Where("tenant_id = ? AND employee_id = ? AND is_active = ?", tenantID, empID, true).
				Updates(map[string]interface{}{
					"is_active":    false,
					"effective_to": &closedAt,
				}).Error; err != nil {
				return err
			}
			a := models.SalaryAssignment{
				TenantID:       tenantID,
				EmployeeID:     empID,
				TemplateID:     req.TemplateID,
				ExtraAllowance: req.ExtraAllowance,
				ExtraDeduction: req.ExtraDeduction,
				EffectiveFrom:  effectiveFrom,
				IsActive:       true,
				Notes:          req.Notes,
			}
			if err := tx.Create(&a).Error; err != nil {
				return err
			}
			assigned++
		}
		return nil
	}); err != nil {
		log.Printf("BulkAssignSalaryTemplate: tenant=%s tpl=%s emps=%d err=%v", tenantID, req.TemplateID, len(req.EmployeeIDs), err)
		return utils.InternalError(c, "Failed to bulk assign: "+err.Error())
	}
	return utils.OK(c, fiber.Map{"assigned_count": assigned}, "Bulk assignment complete")
}

// UpdateSalaryAssignment edits an assignment's template reference, extras, or notes.
func UpdateSalaryAssignment(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var a models.SalaryAssignment
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&a).Error; err != nil {
		return utils.NotFound(c, "Assignment not found")
	}
	type Request struct {
		TemplateID     *string  `json:"template_id"`
		ExtraAllowance *float64 `json:"extra_allowance"`
		ExtraDeduction *float64 `json:"extra_deduction"`
		Notes          *string  `json:"notes"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.TemplateID != nil && *req.TemplateID != "" {
		var tpl models.SalaryTemplate
		if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", *req.TemplateID, tenantID).First(&tpl).Error; err != nil {
			return utils.BadRequest(c, "Template not found")
		}
		a.TemplateID = *req.TemplateID
	}
	if req.ExtraAllowance != nil {
		a.ExtraAllowance = *req.ExtraAllowance
	}
	if req.ExtraDeduction != nil {
		a.ExtraDeduction = *req.ExtraDeduction
	}
	if req.Notes != nil {
		a.Notes = *req.Notes
	}
	if err := database.DB.WithContext(c.Context()).Save(&a).Error; err != nil {
		return utils.InternalError(c, "Failed to update assignment")
	}
	return utils.OK(c, a, "Assignment updated")
}

// DeleteSalaryAssignment removes an assignment scoped to the tenant.
func DeleteSalaryAssignment(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	res := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.SalaryAssignment{})
	if res.Error != nil {
		return utils.InternalError(c, "Failed to delete assignment")
	}
	if res.RowsAffected == 0 {
		return utils.NotFound(c, "Assignment not found")
	}
	return utils.OK(c, nil, "Assignment deleted")
}

// ── Backward-compatible shim endpoints ────────────────────────────
// The old `/salary-structures` routes now return data synthesised from
// the template + assignment tables. Write endpoints have been retired —
// callers should move to `/salary-templates` + `/salary-assignments`.

// ListSalaryStructures returns legacy structure views synthesised from assignments.
func ListSalaryStructures(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	employeeID := c.Query("employee_id")

	var assignments []models.SalaryAssignment
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Preload("TemplateModel")
	if employeeID != "" {
		q = q.Where("employee_id = ?", employeeID)
	}
	if err := q.Order("effective_from desc").Find(&assignments).Error; err != nil {
		return utils.InternalError(c, "Failed to load")
	}
	out := make([]models.SalaryStructure, len(assignments))
	for i, a := range assignments {
		out[i] = assignmentToLegacyStructure(a)
	}
	return utils.OK(c, out, "")
}

// CreateSalaryStructure is retained only to return a clear error to any
// old client still hitting it. The new flow is template + assignment.
func CreateSalaryStructure(c *fiber.Ctx) error {
	return utils.BadRequest(c, "Endpoint retired. Create a salary template via /salary-templates, then assign via /salary-assignments.")
}

// UpdateSalaryStructure is retired; see CreateSalaryStructure.
func UpdateSalaryStructure(c *fiber.Ctx) error {
	return utils.BadRequest(c, "Endpoint retired. Edit templates via /salary-templates/:id or assignments via /salary-assignments/:id.")
}

// DeleteSalaryStructure is retired; see CreateSalaryStructure.
func DeleteSalaryStructure(c *fiber.Ctx) error {
	return utils.BadRequest(c, "Endpoint retired. Delete assignments via /salary-assignments/:id.")
}
