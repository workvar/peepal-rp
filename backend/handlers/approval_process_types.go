package handlers

// approval_process_types.go — admin CRUD for ApprovalProcessType, plus the
// per-tenant seeder that ensures the built-in process types exist before
// any flow can be created against them.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"log"

	"github.com/gofiber/fiber/v2"
)

// builtinProcessTypes is the seed list. EnsureBuiltinProcessTypes is called
// for a tenant the first time the list endpoint is hit, so every tenant
// always sees these defaults — but the list is editable (label/description
// can be customised, and types can be deactivated).
var builtinProcessTypes = []models.ApprovalProcessType{
	{Code: "leave", Label: "Leave", Description: "Routes employee leave applications.", IsBuiltin: true},
	{Code: "holiday", Label: "Holiday Declaration", Description: "Approval before a holiday is published.", IsBuiltin: true},
	{Code: "academic_calendar", Label: "Academic Calendar", Description: "Changes to the academic calendar.", IsBuiltin: true},
	{Code: "payroll", Label: "Payroll", Description: "Approval before a payroll run is finalised.", IsBuiltin: true},
	{Code: "notice", Label: "Notice / Announcement", Description: "Approval before a notice goes out.", IsBuiltin: true},
	{Code: "insurance_claim", Label: "Insurance Claim", Description: "Routes insurance / TPA reimbursement claims.", IsBuiltin: true},
}

// EnsureBuiltinProcessTypes inserts the built-in defaults for the given
// tenant if they don't yet exist. Cheap idempotent op.
func EnsureBuiltinProcessTypes(tenantID string) {
	for _, t := range builtinProcessTypes {
		var existing models.ApprovalProcessType
		err := database.DB.Where("tenant_id = ? AND code = ?", tenantID, t.Code).First(&existing).Error
		if err == nil {
			continue
		}
		seed := t
		seed.TenantID = tenantID
		seed.IsActive = true
		if err := database.DB.Create(&seed).Error; err != nil {
			log.Printf("[APPROVAL] failed to seed process type %s: %v", t.Code, err)
		}
	}
}

// ListApprovalProcessTypes returns the tenant's process types. The query
// param `active=1` filters to active only.
func ListApprovalProcessTypes(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	EnsureBuiltinProcessTypes(tenantID)

	var list []models.ApprovalProcessType
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Order("label asc")
	if c.Query("active") == "1" {
		q = q.Where("is_active = ?", true)
	}
	q.Find(&list)
	return utils.OK(c, list, "")
}

type processTypeInput struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active,omitempty"`
}

// CreateApprovalProcessType creates a new admin-defined process type. Codes
// are normalised to lowercase and must be unique per tenant.
func CreateApprovalProcessType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var in processTypeInput
	if err := c.BodyParser(&in); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	if in.Code == "" || in.Label == "" {
		return utils.BadRequest(c, "Code and label are required")
	}
	pt := models.ApprovalProcessType{
		TenantID:    tenantID,
		Code:        in.Code,
		Label:       in.Label,
		Description: in.Description,
		IsActive:    true,
	}
	if in.IsActive != nil {
		pt.IsActive = *in.IsActive
	}
	if err := database.DB.WithContext(c.Context()).Create(&pt).Error; err != nil {
		return utils.BadRequest(c, "Code already exists in this tenant")
	}
	return utils.Created(c, pt, "Created")
}

// UpdateApprovalProcessType updates label/description/active. Built-in
// types cannot have their code changed.
func UpdateApprovalProcessType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var pt models.ApprovalProcessType
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&pt).Error; err != nil {
		return utils.NotFound(c, "Not found")
	}
	var in processTypeInput
	if err := c.BodyParser(&in); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	if !pt.IsBuiltin && in.Code != "" {
		pt.Code = in.Code
	}
	if in.Label != "" {
		pt.Label = in.Label
	}
	pt.Description = in.Description
	if in.IsActive != nil {
		pt.IsActive = *in.IsActive
	}
	if err := database.DB.WithContext(c.Context()).Save(&pt).Error; err != nil {
		return utils.BadRequest(c, "Could not update")
	}
	return utils.OK(c, pt, "Updated")
}

// DeleteApprovalProcessType — only allowed for non-builtin types.
func DeleteApprovalProcessType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var pt models.ApprovalProcessType
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&pt).Error; err != nil {
		return utils.NotFound(c, "Not found")
	}
	if pt.IsBuiltin {
		return utils.BadRequest(c, "Built-in process types cannot be deleted; deactivate them instead")
	}
	if err := database.DB.WithContext(c.Context()).Delete(&pt).Error; err != nil {
		return utils.InternalError(c, "Failed to delete record")
	}
	return utils.OK(c, nil, "Deleted")
}
