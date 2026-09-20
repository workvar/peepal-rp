package handlers

// Public, unauthenticated invite endpoints. These cannot live behind the
// GraphQL gateway (which requires a session), so they stay as REST alongside
// login. They let a freshly-created user view their pending invite and set
// their own password.

import (
	"collegeerp/database"
	"collegeerp/invites"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// ValidateInvite (GET /api/v1/invites/:token) reports whether a token is still
// redeemable and returns the minimal context the accept page needs.
func ValidateInvite(c *fiber.Ctx) error {
	token := c.Params("token")
	inv, user, tenant, err := invites.Validate(database.DB.WithContext(c.Context()), token)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.OK(c, fiber.Map{
		"email":       user.Email,
		"name":        user.Name,
		"tenant_name": tenant.Name,
		"subdomain":   tenant.Subdomain,
		"expires_at":  inv.ExpiresAt,
	}, "")
}

type AcceptInviteRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// AcceptInvite (POST /api/v1/invites/accept) sets the user's password and marks
// the invite consumed. It deliberately does not start a session — the user is
// sent to their organisation's login page to sign in with the new password,
// where the normal subscription/identity checks apply.
func AcceptInvite(c *fiber.Ctx) error {
	var req AcceptInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Token == "" || req.Password == "" {
		return utils.BadRequest(c, "Token and password are required")
	}

	user, err := invites.Accept(database.DB.WithContext(c.Context()), req.Token, req.Password)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	// Best-effort welcome email now that the account is active.
	invites.SendWelcome(database.DB.WithContext(c.Context()), user)

	// Look up the subdomain so the client can route to the right login page.
	subdomain := ""
	if t, ok := tenantSubdomain(c, user.TenantID); ok {
		subdomain = t
	}

	return utils.OK(c, fiber.Map{
		"email":     user.Email,
		"subdomain": subdomain,
	}, "Password set. You can now sign in.")
}

// tenantSubdomain resolves a tenant's subdomain by id.
func tenantSubdomain(c *fiber.Ctx, tenantID string) (string, bool) {
	var row struct{ Subdomain string }
	if err := database.DB.WithContext(c.Context()).
		Table("tenants").Select("subdomain").Where("id = ?", tenantID).
		Scan(&row).Error; err != nil || row.Subdomain == "" {
		return "", false
	}
	return row.Subdomain, true
}
