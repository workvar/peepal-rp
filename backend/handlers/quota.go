package handlers

import (
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// GetMyQuotaStatus returns the authenticated tenant's usage versus its
// subscription limits, including any breached quotas.
//
// Unlike GetMySubscription (admin-only, exposes billing details), this endpoint
// is readable by every signed-in tenant user so the persistent over-quota
// banner can render for everyone in the organisation. It deliberately returns
// only counts, limits, and breaches; no pricing or plan internals.
func GetMyQuotaStatus(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenantID").(string)
	if tenantID == "" {
		return utils.BadRequest(c, "Tenant ID not found in token")
	}
	snap := models.TenantQuotaSnapshot(database.DB.WithContext(c.Context()), tenantID)
	return utils.OK(c, snap, "")
}
