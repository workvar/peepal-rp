package handlers

// approval_engine.go contains the generic approval engine. It is process-
// agnostic: callers pass in (process, referenceID, requesterID, title) and
// receive back a started request, or an "auto-approved" signal if no flow is
// configured for that process. Each business handler (leaves.go, payroll.go,
// etc.) calls StartApprovalIfConfigured when a record is created and reacts
// to OnApprovalCompleted via a callback registered in approval_callbacks.go.

import (
	"collegeerp/database"
	"collegeerp/models"
	"encoding/json"
	"errors"
	"sort"
	"strconv"

	"gorm.io/gorm"
)

// StartApprovalResult is what the engine hands back to the caller.
type StartApprovalResult struct {
	AutoApproved bool                    // true → no flow configured, caller should approve directly
	Request      *models.ApprovalRequest // populated when AutoApproved is false
}

// StartApprovalIfConfigured looks up the active flow for `process` and, if
// one exists, creates an ApprovalRequest pinned at the first step whose
// condition is met. If no active flow exists, it returns AutoApproved=true
// and the caller should perform the action immediately.
func StartApprovalIfConfigured(
	tenantID, requesterID string,
	process models.ApprovalProcess,
	referenceID, title, payload string,
) (*StartApprovalResult, error) {
	flow, err := loadActiveFlow(tenantID, process)
	if err != nil {
		return nil, err
	}
	if flow == nil || len(flow.Steps) == 0 {
		return &StartApprovalResult{AutoApproved: true}, nil
	}
	// Find the first step whose condition is satisfied — earlier steps may
	// be skipped if their condition evaluates to false against the payload.
	first := firstApplicableStep(flow.Steps, payload, 1)
	if first == 0 {
		// All steps skipped → nothing to approve, treat as auto.
		return &StartApprovalResult{AutoApproved: true}, nil
	}
	req := models.ApprovalRequest{
		TenantID:    tenantID,
		FlowID:      flow.ID,
		Process:     process,
		ReferenceID: referenceID,
		RequesterID: requesterID,
		Title:       title,
		Payload:     payload,
		CurrentStep: first,
		Status:      models.ApprovalPending,
	}
	if err := database.DB.Create(&req).Error; err != nil {
		return nil, err
	}
	return &StartApprovalResult{Request: &req}, nil
}

// firstApplicableStep walks through `steps` starting at `from` (1-based)
// and returns the StepOrder of the first step whose condition is met.
// Returns 0 if all remaining steps are skipped.
func firstApplicableStep(steps []models.ApprovalStep, payload string, from int) int {
	for _, s := range steps {
		if s.StepOrder < from {
			continue
		}
		if stepConditionMet(&s, payload) {
			return s.StepOrder
		}
	}
	return 0
}

// loadActiveFlow returns the most recently updated active flow for the
// process, with its steps preloaded and sorted by StepOrder.
func loadActiveFlow(tenantID string, process models.ApprovalProcess) (*models.ApprovalFlow, error) {
	var flow models.ApprovalFlow
	err := database.DB.
		Where("tenant_id = ? AND process = ? AND is_active = ?", tenantID, process, true).
		Preload("Steps").
		Order("updated_at desc").
		First(&flow).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	sort.Slice(flow.Steps, func(i, j int) bool { return flow.Steps[i].StepOrder < flow.Steps[j].StepOrder })
	return &flow, nil
}

// CanApprove returns true if `userID` (with the given role/department) is
// allowed to act on the current step of `req`. Callers should fetch the
// flow + steps via loadFlowSteps first.
func CanApprove(req *models.ApprovalRequest, step *models.ApprovalStep, user *models.User, requester *models.User) bool {
	switch step.ApproverType {
	case models.ApproverManager:
		// Walk up the manager chain ManagerLevel hops (default 1) and
		// check whether we land on `user`.
		level := step.ManagerLevel
		if level <= 0 {
			level = 1
		}
		target := resolveManagerAtLevel(requester, level)
		return target != nil && *target == user.ID
	case models.ApproverUser:
		return step.ApproverUserID != nil && *step.ApproverUserID == user.ID
	case models.ApproverRole:
		return step.ApproverRole != nil && *step.ApproverRole == string(user.Role)
	case models.ApproverDepartment:
		if step.ApproverDepartmentID == nil || user.DepartmentID == nil {
			return false
		}
		return *step.ApproverDepartmentID == *user.DepartmentID
	}
	return false
}

// resolveManagerAtLevel walks up the requester's manager chain `level` hops
// and returns the resulting user.id, or nil if the chain is shorter.
func resolveManagerAtLevel(requester *models.User, level int) *string {
	if requester == nil {
		return nil
	}
	currentID := requester.ManagerID
	for i := 1; i < level; i++ {
		if currentID == nil {
			return nil
		}
		var mgr models.User
		if err := database.DB.First(&mgr, "id = ?", *currentID).Error; err != nil {
			return nil
		}
		currentID = mgr.ManagerID
	}
	return currentID
}

// stepConditionMet evaluates the optional condition on a step against the
// request's payload. Returns true when there's no condition or when the
// condition is satisfied. A malformed payload is treated as "condition met"
// so a typo doesn't strand the request.
func stepConditionMet(step *models.ApprovalStep, payload string) bool {
	if step.ConditionField == nil || step.ConditionOp == nil || step.ConditionValue == nil {
		return true
	}
	if *step.ConditionField == "" {
		return true
	}
	values := map[string]interface{}{}
	if payload != "" {
		_ = json.Unmarshal([]byte(payload), &values)
	}
	got, ok := values[*step.ConditionField]
	if !ok {
		return false
	}
	return compare(got, *step.ConditionOp, *step.ConditionValue)
}

func compare(actual interface{}, op, want string) bool {
	// Try numeric comparison first.
	if af, ok := toFloat(actual); ok {
		if wf, err := strconv.ParseFloat(want, 64); err == nil {
			switch op {
			case "=", "==":
				return af == wf
			case "!=":
				return af != wf
			case "<":
				return af < wf
			case "<=":
				return af <= wf
			case ">":
				return af > wf
			case ">=":
				return af >= wf
			}
		}
	}
	// Fall back to string comparison.
	as := toStr(actual)
	switch op {
	case "=", "==":
		return as == want
	case "!=":
		return as != want
	}
	return false
}

func toFloat(v interface{}) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case int:
		return float64(x), true
	case int64:
		return float64(x), true
	case string:
		f, err := strconv.ParseFloat(x, 64)
		return f, err == nil
	}
	return 0, false
}

func toStr(v interface{}) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(x)
	}
	return ""
}

// loadFlowSteps loads the flow and returns its steps sorted.
func loadFlowSteps(flowID string) ([]models.ApprovalStep, error) {
	var steps []models.ApprovalStep
	if err := database.DB.Where("flow_id = ?", flowID).Order("step_order asc").Find(&steps).Error; err != nil {
		return nil, err
	}
	return steps, nil
}

// ActOnRequest applies an approve/reject decision. If approved and more
// steps remain, advances CurrentStep. If approved and the last step, marks
// the request as approved and fires the registered callback for that
// process. If rejected, marks the request as rejected and fires the
// callback with rejected=true.
func ActOnRequest(req *models.ApprovalRequest, userID string, approve bool, comment string) error {
	if req.Status != models.ApprovalPending {
		return errors.New("request is not pending")
	}
	steps, err := loadFlowSteps(req.FlowID)
	if err != nil {
		return err
	}
	var current *models.ApprovalStep
	for i := range steps {
		if steps[i].StepOrder == req.CurrentStep {
			current = &steps[i]
			break
		}
	}
	if current == nil {
		return errors.New("current step not found in flow")
	}

	// Authorisation check.
	var user, requester models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return err
	}
	if err := database.DB.First(&requester, "id = ?", req.RequesterID).Error; err != nil {
		return err
	}
	if !CanApprove(req, current, &user, &requester) {
		return errors.New("you are not authorised to act on this step")
	}

	action := models.ApprovalAction{
		RequestID:  req.ID,
		StepID:     current.ID,
		StepOrder:  current.StepOrder,
		ApproverID: userID,
		Comment:    comment,
	}
	if approve {
		action.Action = "approved"
	} else {
		action.Action = "rejected"
	}
	if err := database.DB.Create(&action).Error; err != nil {
		return err
	}

	if !approve {
		req.Status = models.ApprovalRejected
		if err := database.DB.Save(req).Error; err != nil {
			return err
		}
		fireCallback(req, true, userID, comment)
		return nil
	}

	// Approved: advance to the next applicable step, or finish if none.
	next := firstApplicableStep(steps, req.Payload, req.CurrentStep+1)
	if next > 0 {
		req.CurrentStep = next
		if err := database.DB.Save(req).Error; err != nil {
			return err
		}
		return nil
	}
	req.Status = models.ApprovalApproved
	if err := database.DB.Save(req).Error; err != nil {
		return err
	}
	fireCallback(req, false, userID, comment)
	return nil
}

// PendingForUser returns the requests that the given user is currently able
// to act on. We compute eligibility in-process to keep the SQL simple.
func PendingForUser(tenantID, userID string) ([]models.ApprovalRequest, error) {
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	var pending []models.ApprovalRequest
	if err := database.DB.Where("tenant_id = ? AND status = ?", tenantID, models.ApprovalPending).
		Order("created_at desc").Find(&pending).Error; err != nil {
		return nil, err
	}
	out := make([]models.ApprovalRequest, 0, len(pending))
	for _, req := range pending {
		steps, err := loadFlowSteps(req.FlowID)
		if err != nil {
			continue
		}
		var current *models.ApprovalStep
		for i := range steps {
			if steps[i].StepOrder == req.CurrentStep {
				current = &steps[i]
				break
			}
		}
		if current == nil {
			continue
		}
		var requester models.User
		if err := database.DB.First(&requester, "id = ?", req.RequesterID).Error; err != nil {
			continue
		}
		if CanApprove(&req, current, &user, &requester) {
			out = append(out, req)
		}
	}
	return out, nil
}
