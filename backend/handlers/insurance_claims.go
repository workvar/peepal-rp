package handlers

// Insurance claim approval integration. Claim CRUD is GraphQL; this file adds
// the one REST action that reuses the shared approval engine — submitting a
// claim raises an ApprovalRequest through the tenant's insurance_claim flow —
// plus the callback that flips the claim's status when the flow finishes.

import (
	"fmt"
	"log"
	"time"

	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// SubmitInsuranceClaim raises the claim into the approval flow. If no flow is
// configured for the tenant, the claim is auto-approved immediately.
func SubmitInsuranceClaim(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	id := c.Params("id")

	var claim models.InsuranceClaim
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&claim).Error; err != nil {
		return utils.NotFound(c, "Claim not found")
	}
	if claim.Status != models.ClaimDraft && claim.Status != models.ClaimRejected {
		return utils.BadRequest(c, "Only draft or rejected claims can be submitted")
	}

	title := fmt.Sprintf("Claim %s — %s", claim.ClaimNumber, rupeesPlain(claim.ClaimAmount))
	payload := fmt.Sprintf(`{"claim_amount":%.2f}`, claim.ClaimAmount)

	res, err := StartApprovalIfConfigured(tenantID, userID, models.ProcessInsuranceClaim, claim.ID, title, payload)
	if err != nil {
		return utils.InternalError(c, "Could not start the claim approval")
	}

	now := time.Now()
	if res.AutoApproved {
		// No flow configured → approve straight away.
		claim.Status = models.ClaimApproved
		claim.SubmittedAt = &now
		if err := database.DB.Save(&claim).Error; err != nil {
			return utils.InternalError(c, "Could not update the claim")
		}
		return utils.OK(c, fiber.Map{"status": claim.Status, "autoApproved": true}, "Claim approved (no approval flow configured)")
	}

	claim.Status = models.ClaimUnderReview
	claim.SubmittedAt = &now
	if err := database.DB.Save(&claim).Error; err != nil {
		return utils.InternalError(c, "Could not update the claim")
	}
	return utils.OK(c, fiber.Map{"status": claim.Status, "requestId": res.Request.ID}, "Claim submitted for approval")
}

// rupeesPlain renders an amount without a currency symbol for the request title.
func rupeesPlain(v float64) string { return fmt.Sprintf("%.2f", v) }

// init wires the approval callback for claims: when the request finishes, set
// the claim's status and notify the requester.
func init() {
	RegisterApprovalCallback(models.ProcessInsuranceClaim, func(req *models.ApprovalRequest, rejected bool, actor, comment string) {
		var claim models.InsuranceClaim
		if err := database.DB.Where("id = ?", req.ReferenceID).First(&claim).Error; err != nil {
			return
		}
		if rejected {
			claim.Status = models.ClaimRejected
		} else {
			claim.Status = models.ClaimApproved
		}
		if err := database.DB.Save(&claim).Error; err != nil {
			log.Printf("[CLAIMS] failed to persist claim %s: %v", claim.ID, err)
		}
	})
}
