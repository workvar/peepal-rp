package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) MyApprovals(ctx context.Context) ([]*model.ApprovalRequest, error) {
	// Self-service: scoped to auth.UserID below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var requests []models.ApprovalRequest
	if err := r.DB.Where("tenant_id = ? AND requester_id = ?", auth.TenantID, auth.UserID).
		Order("created_at desc").Find(&requests).Error; err != nil {
		return nil, err
	}
	out := make([]*model.ApprovalRequest, len(requests))
	for i, req := range requests {
		out[i] = approvalRequestToModel(req)
	}
	return out, nil
}

func (r *queryResolver) PendingApprovals(ctx context.Context) ([]*model.ApprovalRequest, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	// Pending approvals = requests where this user is the current approver.
	// We find requests whose current step has an action awaited from this user.
	// Simple approach: load all pending requests, then filter by flow steps.
	var requests []models.ApprovalRequest
	if err := r.DB.Where("tenant_id = ? AND status = 'pending'", auth.TenantID).
		Order("created_at desc").Find(&requests).Error; err != nil {
		return nil, err
	}

	// Load flows to find which requests have steps assigned to this user/role.
	var filtered []*model.ApprovalRequest
	for _, req := range requests {
		var flow models.ApprovalFlow
		if err := r.DB.Where("id = ?", req.FlowID).Preload("Steps").First(&flow).Error; err != nil {
			continue
		}
		for _, step := range flow.Steps {
			if step.StepOrder != req.CurrentStep {
				continue
			}
			// Check if this user matches the approver.
			if isApproverMatch(step, auth) {
				filtered = append(filtered, approvalRequestToModel(req))
				break
			}
		}
	}
	return filtered, nil
}

func (r *mutationResolver) ApproveRequest(ctx context.Context, id string, comment *string) (*model.ApprovalRequest, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var req models.ApprovalRequest
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&req).Error; err != nil {
		return nil, ErrNotFound
	}
	if req.Status != "pending" {
		return nil, GQLErr("request is not pending")
	}
	// Advance: simple — mark step done, check if last step.
	var flow models.ApprovalFlow
	r.DB.Where("id = ?", req.FlowID).Preload("Steps").First(&flow)

	maxStep := 0
	currentStepID := ""
	isApprover := false
	for _, s := range flow.Steps {
		if s.StepOrder > maxStep {
			maxStep = s.StepOrder
		}
		if s.StepOrder == req.CurrentStep {
			currentStepID = s.ID
			isApprover = isApproverMatch(s, auth)
		}
	}
	// Only admins or the step's designated approver may approve.
	if !auth.IsSuperAdmin && auth.Role != roleAdmin && !isApprover {
		return nil, ErrForbidden
	}

	cmt := ""
	if comment != nil {
		cmt = *comment
	}

	action := models.ApprovalAction{
		RequestID:  req.ID,
		ApproverID: auth.UserID,
		StepID:     currentStepID,
		StepOrder:  req.CurrentStep,
		Action:     "approved",
		Comment:    cmt,
	}
	r.DB.Create(&action)

	if req.CurrentStep >= maxStep {
		req.Status = "approved"
	} else {
		req.CurrentStep++
	}
	r.DB.Save(&req)
	return approvalRequestToModel(req), nil
}

func (r *mutationResolver) RejectRequest(ctx context.Context, id string, comment *string) (*model.ApprovalRequest, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var req models.ApprovalRequest
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&req).Error; err != nil {
		return nil, ErrNotFound
	}
	if req.Status != "pending" {
		return nil, GQLErr("request is not pending")
	}
	var rejectFlow models.ApprovalFlow
	r.DB.Where("id = ?", req.FlowID).Preload("Steps").First(&rejectFlow)
	rejectStepID := ""
	isApprover := false
	for _, s := range rejectFlow.Steps {
		if s.StepOrder == req.CurrentStep {
			rejectStepID = s.ID
			isApprover = isApproverMatch(s, auth)
			break
		}
	}
	// Only admins or the step's designated approver may reject.
	if !auth.IsSuperAdmin && auth.Role != roleAdmin && !isApprover {
		return nil, ErrForbidden
	}
	cmt := ""
	if comment != nil {
		cmt = *comment
	}
	action := models.ApprovalAction{
		RequestID:  req.ID,
		ApproverID: auth.UserID,
		StepID:     rejectStepID,
		StepOrder:  req.CurrentStep,
		Action:     "rejected",
		Comment:    cmt,
	}
	r.DB.Create(&action)
	req.Status = "rejected"
	r.DB.Save(&req)
	return approvalRequestToModel(req), nil
}

func approvalRequestToModel(r models.ApprovalRequest) *model.ApprovalRequest {
	return &model.ApprovalRequest{
		ID:          r.ID,
		FlowID:      r.FlowID,
		Process:     string(r.Process),
		ReferenceID: r.ReferenceID,
		RequesterID: r.RequesterID,
		Title:       r.Title,
		CurrentStep: r.CurrentStep,
		Status:      string(r.Status),
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

// isApproverMatch checks if the auth context matches an approval step's
// approver configuration.
func isApproverMatch(step models.ApprovalStep, auth AuthContext) bool {
	switch step.ApproverType {
	case "user":
		return step.ApproverUserID != nil && *step.ApproverUserID == auth.UserID
	case "role":
		return step.ApproverRole != nil && *step.ApproverRole == auth.Role
	}
	return false
}
