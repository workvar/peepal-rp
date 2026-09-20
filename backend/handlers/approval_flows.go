package handlers

// approval_flows.go — admin CRUD for ApprovalFlow + ApprovalStep.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

type stepInput struct {
	StepOrder            int     `json:"step_order"`
	Name                 string  `json:"name"`
	ApproverType         string  `json:"approver_type"` // manager/user/role/department
	ApproverUserID       *string `json:"approver_user_id,omitempty"`
	ApproverRole         *string `json:"approver_role,omitempty"`
	ApproverDepartmentID *string `json:"approver_department_id,omitempty"`
	ManagerLevel         int     `json:"manager_level,omitempty"`
	ConditionField       *string `json:"condition_field,omitempty"`
	ConditionOp          *string `json:"condition_op,omitempty"`
	ConditionValue       *string `json:"condition_value,omitempty"`
}

type flowInput struct {
	Name       string      `json:"name"`
	Process    string      `json:"process"`
	IsActive   *bool       `json:"is_active,omitempty"`
	FormFields string      `json:"form_fields,omitempty"` // JSON string
	Steps      []stepInput `json:"steps"`
}

// ListApprovalFlows returns all flows for the tenant with their steps.
func ListApprovalFlows(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var flows []models.ApprovalFlow
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Steps").Order("created_at desc")
	if process := c.Query("process"); process != "" {
		q = q.Where("process = ?", process)
	}
	q.Find(&flows)
	return utils.OK(c, flows, "")
}

// GetApprovalFlow returns one flow by id (with steps).
func GetApprovalFlow(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var flow models.ApprovalFlow
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Preload("Steps").First(&flow).Error; err != nil {
		return utils.NotFound(c, "Flow not found")
	}
	return utils.OK(c, flow, "")
}

// CreateApprovalFlow creates a new flow + its steps in a single transaction.
func CreateApprovalFlow(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var in flowInput
	if err := c.BodyParser(&in); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	if in.Name == "" || in.Process == "" {
		return utils.BadRequest(c, "Name and process are required")
	}
	flow := models.ApprovalFlow{
		TenantID:   tenantID,
		Name:       in.Name,
		Process:    models.ApprovalProcess(in.Process),
		IsActive:   true,
		FormFields: in.FormFields,
	}
	if in.IsActive != nil {
		flow.IsActive = *in.IsActive
	}
	if err := database.DB.WithContext(c.Context()).Create(&flow).Error; err != nil {
		return utils.InternalError(c, "Could not create flow")
	}
	for i, s := range in.Steps {
		step := stepFromInput(s, flow.ID, i+1)
		if err := database.DB.WithContext(c.Context()).Create(&step).Error; err != nil {
			return utils.InternalError(c, "Failed to create record")
		}
	}
	database.DB.WithContext(c.Context()).Where("id = ?", flow.ID).Preload("Steps").First(&flow)
	return utils.Created(c, flow, "Flow created")
}

// UpdateApprovalFlow replaces the flow's metadata + step list. Existing
// steps are wiped and rewritten so the admin builder UI can post the full
// list every time.
func UpdateApprovalFlow(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var flow models.ApprovalFlow
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&flow).Error; err != nil {
		return utils.NotFound(c, "Flow not found")
	}
	var in flowInput
	if err := c.BodyParser(&in); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	if in.Name != "" {
		flow.Name = in.Name
	}
	if in.Process != "" {
		flow.Process = models.ApprovalProcess(in.Process)
	}
	if in.IsActive != nil {
		flow.IsActive = *in.IsActive
	}
	// FormFields is overwritten unconditionally so the builder can clear it.
	flow.FormFields = in.FormFields
	if err := database.DB.WithContext(c.Context()).Save(&flow).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	if in.Steps != nil {
		if err := database.DB.WithContext(c.Context()).Where("flow_id = ?", flow.ID).Delete(&models.ApprovalStep{}).Error; err != nil {
			return utils.InternalError(c, "Failed to delete record")
		}
		for i, s := range in.Steps {
			step := stepFromInput(s, flow.ID, i+1)
			if err := database.DB.WithContext(c.Context()).Create(&step).Error; err != nil {
				return utils.InternalError(c, "Failed to create record")
			}
		}
	}
	database.DB.WithContext(c.Context()).Where("id = ?", flow.ID).Preload("Steps").First(&flow)
	return utils.OK(c, flow, "Flow updated")
}

// DeleteApprovalFlow deletes a flow and its steps.
func DeleteApprovalFlow(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	res := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.ApprovalFlow{})
	if res.RowsAffected == 0 {
		return utils.NotFound(c, "Flow not found")
	}
	if err := database.DB.WithContext(c.Context()).Where("flow_id = ?", id).Delete(&models.ApprovalStep{}).Error; err != nil {
		return utils.InternalError(c, "Failed to delete record")
	}
	return utils.OK(c, nil, "Flow deleted")
}

func stepFromInput(s stepInput, flowID string, order int) models.ApprovalStep {
	if s.StepOrder == 0 {
		s.StepOrder = order
	}
	level := s.ManagerLevel
	if level <= 0 {
		level = 1
	}
	return models.ApprovalStep{
		FlowID:               flowID,
		StepOrder:            s.StepOrder,
		Name:                 s.Name,
		ApproverType:         models.ApproverType(s.ApproverType),
		ApproverUserID:       s.ApproverUserID,
		ApproverRole:         s.ApproverRole,
		ApproverDepartmentID: s.ApproverDepartmentID,
		ManagerLevel:         level,
		ConditionField:       s.ConditionField,
		ConditionOp:          s.ConditionOp,
		ConditionValue:       s.ConditionValue,
	}
}
