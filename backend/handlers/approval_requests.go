package handlers

// approval_requests.go — endpoints used by end-users to see and act on
// approval requests routed to them.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
)

// builtinProcesses set is used to block users from raising leave/payroll/etc
// directly through the generic /approval-requests endpoint — those have
// their own create paths (ApplyLeave etc.) which feed the engine themselves.
var builtinProcesses = map[models.ApprovalProcess]bool{
	models.ProcessLeave:          true,
	models.ProcessPayroll:        true,
	models.ProcessAcademicChange: true,
	models.ProcessHoliday:        true,
	models.ProcessNotice:         true,
}

// raiseRequestInput is the body for RaiseApprovalRequest.
type raiseRequestInput struct {
	FlowID  string                 `json:"flow_id"`
	Title   string                 `json:"title"`
	Payload map[string]interface{} `json:"payload"`
}

// RaiseApprovalRequest lets a regular user start an approval request for a
// custom (non-builtin) process type, filling in the flow's form fields.
func RaiseApprovalRequest(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	var in raiseRequestInput
	if err := c.BodyParser(&in); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	if in.FlowID == "" {
		return utils.BadRequest(c, "flow_id is required")
	}
	var flow models.ApprovalFlow
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", in.FlowID, tenantID).First(&flow).Error; err != nil {
		return utils.NotFound(c, "Flow not found")
	}
	if !flow.IsActive {
		return utils.BadRequest(c, "Flow is inactive")
	}
	if builtinProcesses[flow.Process] {
		return utils.BadRequest(c, "Use the dedicated form for this process (e.g. Leaves)")
	}
	payloadJSON, _ := json.Marshal(in.Payload)
	res, err := StartApprovalIfConfigured(tenantID, userID, flow.Process, "", in.Title, string(payloadJSON))
	if err != nil {
		return utils.InternalError(c, err.Error())
	}
	if res.AutoApproved {
		// Should be rare for a custom flow, but support the case.
		return utils.OK(c, fiber.Map{"auto_approved": true}, "Auto-approved (no applicable steps)")
	}
	return utils.Created(c, res.Request, "Request raised")
}

// ListActiveFlowsForUser returns active flows for *non-builtin* process
// types so a regular user can pick one when raising a custom request.
func ListActiveFlowsForUser(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	// Pull the tenant's active, non-builtin process type codes.
	var types []models.ApprovalProcessType
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND is_active = ? AND is_builtin = ?", tenantID, true, false).Find(&types)
	if len(types) == 0 {
		return utils.OK(c, []models.ApprovalFlow{}, "")
	}
	codes := make([]string, len(types))
	for i, t := range types {
		codes[i] = t.Code
	}
	var flows []models.ApprovalFlow
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND is_active = ? AND process IN ?", tenantID, true, codes).
		Preload("Steps").Find(&flows)
	return utils.OK(c, flows, "")
}

// ListMyPendingApprovals returns the requests the caller is currently able
// to approve / reject.
func ListMyPendingApprovals(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	pending, err := PendingForUser(tenantID, userID)
	if err != nil {
		return utils.InternalError(c, err.Error())
	}
	return utils.OK(c, pending, "")
}

// ListMyApprovalRequests returns the requests the caller has raised.
func ListMyApprovalRequests(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	var requests []models.ApprovalRequest
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND requester_id = ?", tenantID, userID).
		Order("created_at desc").Find(&requests)
	return utils.OK(c, requests, "")
}

// GetApprovalRequest returns a single request with its action history.
func GetApprovalRequest(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var req models.ApprovalRequest
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("Actions").First(&req).Error; err != nil {
		return utils.NotFound(c, "Request not found")
	}
	return utils.OK(c, req, "")
}

type actInput struct {
	Comment string `json:"comment"`
}

// ApproveApprovalRequest casts an "approved" vote on the current step.
func ApproveApprovalRequest(c *fiber.Ctx) error {
	return actOnRequestRoute(c, true)
}

// RejectApprovalRequest casts a "rejected" vote on the current step.
func RejectApprovalRequest(c *fiber.Ctx) error {
	return actOnRequestRoute(c, false)
}

func actOnRequestRoute(c *fiber.Ctx, approve bool) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	id := c.Params("id")
	var in actInput
	_ = c.BodyParser(&in)
	var req models.ApprovalRequest
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&req).Error; err != nil {
		return utils.NotFound(c, "Request not found")
	}
	if err := ActOnRequest(&req, userID, approve, in.Comment); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.OK(c, req, "Recorded")
}
