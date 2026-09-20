package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateLeaveRequest struct {
	LeaveType   string `json:"leave_type"`
	LeaveTypeID string `json:"leave_type_id"` // optional FK to LeaveTypeConfig
	FromDate    string `json:"from_date"`
	ToDate      string `json:"to_date"`
	Reason      string `json:"reason"`
}

// ApplyLeave lets any authenticated user apply for leave.
func ApplyLeave(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	var req CreateLeaveRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.LeaveType == "" || req.FromDate == "" || req.ToDate == "" || req.Reason == "" {
		return utils.BadRequest(c, "All fields are required")
	}

	from, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid from_date — use YYYY-MM-DD")
	}
	to, err := time.Parse("2006-01-02", req.ToDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid to_date — use YYYY-MM-DD")
	}

	days := workingDaysBetween(from, to)

	// Check and update balance if leave_type_id provided
	if req.LeaveTypeID != "" {
		var bal models.LeaveBalance
		year := from.Year()
		if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
			tenantID, userID, req.LeaveTypeID, year).First(&bal).Error; err == nil {
			remaining := bal.Total - bal.Used - bal.Pending
			if remaining < days {
				return utils.BadRequest(c, "Insufficient leave balance")
			}
			bal.Pending += days
			bal.UpdatedAt = time.Now()
			if err := database.DB.WithContext(c.Context()).Save(&bal).Error; err != nil {
				return utils.InternalError(c, "Failed to save record")
			}
		}
	}

	leave := models.Leave{
		TenantID:    tenantID,
		ApplicantID: userID,
		LeaveType:   req.LeaveType,
		LeaveTypeID: req.LeaveTypeID,
		FromDate:    from,
		ToDate:      to,
		Reason:      req.Reason,
		Status:      models.LeavePending,
	}

	if err := database.DB.WithContext(c.Context()).Create(&leave).Error; err != nil {
		return utils.InternalError(c, "Could not apply for leave")
	}

	// Hand off to the approval engine. If a Leave flow is configured we
	// stay pending and route through the chain; if not, auto-approve and
	// settle the balance immediately so old behaviour is preserved.
	title := "Leave: " + req.FromDate + " → " + req.ToDate
	res, _ := StartApprovalIfConfigured(tenantID, userID, models.ProcessLeave, leave.ID, title, "")
	if res != nil && res.AutoApproved {
		leave.Status = models.LeaveApproved
		leave.ReviewedBy = userID
		leave.ReviewNote = "Auto-approved (no flow configured)"
		if err := database.DB.WithContext(c.Context()).Save(&leave).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
		settleLeaveBalanceOnApprove(&leave)
	}

	database.DB.WithContext(c.Context()).Preload("Applicant").First(&leave, "id = ?", leave.ID)
	return utils.Created(c, leave, "Leave application submitted")
}

// settleLeaveBalanceOnApprove moves Pending → Used on the matching balance
// row. Mirrors the math in ReviewLeave so both paths stay consistent.
func settleLeaveBalanceOnApprove(leave *models.Leave) {
	if leave.LeaveTypeID == "" {
		return
	}
	days := workingDaysBetween(leave.FromDate, leave.ToDate)
	year := leave.FromDate.Year()
	var bal models.LeaveBalance
	if err := database.DB.Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
		leave.TenantID, leave.ApplicantID, leave.LeaveTypeID, year).First(&bal).Error; err == nil {
		bal.Pending -= days
		bal.Used += days
		if bal.Pending < 0 {
			bal.Pending = 0
		}
		bal.UpdatedAt = time.Now()
		if err := database.DB.Save(&bal).Error; err != nil {
			log.Printf("[LEAVES] failed to settle balance on approve for leave %s: %v", leave.ID, err)
		}
	}
}

// settleLeaveBalanceOnReject restores Pending capacity on a rejection.
func settleLeaveBalanceOnReject(leave *models.Leave) {
	if leave.LeaveTypeID == "" {
		return
	}
	days := workingDaysBetween(leave.FromDate, leave.ToDate)
	year := leave.FromDate.Year()
	var bal models.LeaveBalance
	if err := database.DB.Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
		leave.TenantID, leave.ApplicantID, leave.LeaveTypeID, year).First(&bal).Error; err == nil {
		bal.Pending -= days
		if bal.Pending < 0 {
			bal.Pending = 0
		}
		bal.UpdatedAt = time.Now()
		if err := database.DB.Save(&bal).Error; err != nil {
			log.Printf("[LEAVES] failed to settle balance on reject for leave %s: %v", leave.ID, err)
		}
	}
}

// init wires the engine callback for leaves: when an ApprovalRequest tied
// to a Leave finishes, flip the underlying Leave's status accordingly.
func init() {
	RegisterApprovalCallback(models.ProcessLeave, func(req *models.ApprovalRequest, rejected bool, actor, comment string) {
		var leave models.Leave
		if err := database.DB.Where("id = ?", req.ReferenceID).First(&leave).Error; err != nil {
			return
		}
		if rejected {
			leave.Status = models.LeaveRejected
			leave.ReviewedBy = actor
			leave.ReviewNote = comment
			if err := database.DB.Save(&leave).Error; err != nil {
				log.Printf("[LEAVES] failed to persist rejected leave %s: %v", leave.ID, err)
				return
			}
			settleLeaveBalanceOnReject(&leave)
			CreateNotification(leave.TenantID, leave.ApplicantID,
				"Leave Rejected", "Your leave request has been rejected.",
				"error", "leave", leave.ID, "leave")
			return
		}
		leave.Status = models.LeaveApproved
		leave.ReviewedBy = actor
		leave.ReviewNote = comment
		if err := database.DB.Save(&leave).Error; err != nil {
			log.Printf("[LEAVES] failed to persist approved leave %s: %v", leave.ID, err)
			return
		}
		settleLeaveBalanceOnApprove(&leave)
		CreateNotification(leave.TenantID, leave.ApplicantID,
			"Leave Approved", "Your leave request has been approved.",
			"success", "leave", leave.ID, "leave")
	})
}

// ListLeaves returns leaves. Admin sees all; others see their own.
func ListLeaves(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	role := c.Locals("role").(string)

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Applicant")
	if role != string(models.RoleAdmin) {
		query = query.Where("applicant_id = ?", userID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	var leaves []models.Leave
	query.Order("created_at desc").Find(&leaves)
	return utils.OK(c, leaves, "")
}

type ReviewLeaveRequest struct {
	Status     string `json:"status"`
	ReviewNote string `json:"review_note"`
}

// ReviewLeave approves or rejects a leave application.
func ReviewLeave(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	reviewerID := c.Locals("userID").(string)

	var leave models.Leave
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&leave).Error; err != nil {
		return utils.NotFound(c, "Leave not found")
	}

	var req ReviewLeaveRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Status != string(models.LeaveApproved) && req.Status != string(models.LeaveRejected) {
		return utils.BadRequest(c, "Status must be 'approved' or 'rejected'")
	}

	oldStatus := leave.Status
	leave.Status = models.LeaveStatus(req.Status)
	leave.ReviewedBy = reviewerID
	leave.ReviewNote = req.ReviewNote
	if err := database.DB.WithContext(c.Context()).Save(&leave).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	// Update leave balance if leave_type_id is set
	if leave.LeaveTypeID != "" && oldStatus == models.LeavePending {
		days := workingDaysBetween(leave.FromDate, leave.ToDate)
		year := leave.FromDate.Year()

		var bal models.LeaveBalance
		if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
			tenantID, leave.ApplicantID, leave.LeaveTypeID, year).First(&bal).Error; err == nil {
			if req.Status == string(models.LeaveApproved) {
				// Move pending → used
				bal.Pending -= days
				bal.Used += days
			} else {
				// Restore pending
				bal.Pending -= days
			}
			if bal.Pending < 0 {
				bal.Pending = 0
			}
			bal.UpdatedAt = time.Now()
			if err := database.DB.WithContext(c.Context()).Save(&bal).Error; err != nil {
				return utils.InternalError(c, "Failed to save record")
			}
		}
	}

	// Send notification to applicant
	if req.Status == string(models.LeaveApproved) {
		CreateNotification(leave.TenantID, leave.ApplicantID,
			"Leave Approved",
			"Your leave request has been approved.",
			"success", "leave", leave.ID, "leave")
	} else if req.Status == string(models.LeaveRejected) {
		CreateNotification(leave.TenantID, leave.ApplicantID,
			"Leave Rejected",
			"Your leave request has been rejected.",
			"error", "leave", leave.ID, "leave")
	}

	return utils.OK(c, leave, "Leave reviewed")
}
