package handlers

// workspaces.go — switching the active workspace.
//
// A workspace switch is a session operation: it re-mints the auth cookie with a
// different active role. It therefore lives with the other auth REST endpoints
// rather than in GraphQL (reading and writing the httpOnly cookie is an HTTP
// concern). Listing and granting workspaces is served over GraphQL; see
// graph/workspaces.resolvers.go.

import (
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// SwitchWorkspaceRequest — body for POST /auth/workspace.
type SwitchWorkspaceRequest struct {
	Role string `json:"role"`
}

// SwitchWorkspace re-issues the auth cookie with a different active role.
//
// The requested role must be one the user actually holds (their primary role or
// an explicit UserRole grant), otherwise the request is refused — this is the
// single authorisation gate for the whole feature, since every downstream
// permission check simply trusts the active role in the token.
func SwitchWorkspace(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	var req SwitchWorkspaceRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role == "" {
		return utils.BadRequest(c, "A workspace role is required")
	}

	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}
	if !user.IsActive {
		return utils.Forbidden(c, "This account is inactive")
	}
	if !models.UserHoldsRole(database.DB.WithContext(c.Context()), &user, role) {
		return utils.Forbidden(c, "You do not have access to this workspace")
	}

	// Point the session itself at the new workspace, so the role survives the
	// next token refresh rather than snapping back to the primary role.
	sessionID, _ := c.Locals("sessionID").(string)
	if sessionID != "" {
		if err := models.SetSessionActiveRole(database.DB.WithContext(c.Context()), sessionID, role); err != nil {
			return utils.InternalError(c, "Could not switch workspace")
		}
	}

	token, err := utils.GenerateAccessToken(utils.AccessTokenInput{
		UserID:     user.ID,
		Email:      user.Email,
		BaseRole:   string(user.Role),
		ActiveRole: role,
		TenantID:   user.TenantID,
		SessionID:  sessionID,
	})
	if err != nil {
		return utils.InternalError(c, "Could not switch workspace")
	}
	setAuthCookie(c, token)

	// The refresh token is untouched by a switch: the session continues, only
	// its active role moved (SetSessionActiveRole above). So the payload here
	// carries the new access token alone, and a native client keeps the refresh
	// token it already holds.
	payload := sessionPayload(c, sessionTokens{Access: token})
	payload["role"] = role
	payload["base_role"] = string(user.Role)
	payload["workspaces"] = models.UserWorkspaces(database.DB.WithContext(c.Context()), &user)
	return utils.OK(c, payload, "Workspace switched")
}

// ListMyWorkspaces returns the workspaces the caller may switch into.
// Mirrors the GraphQL myWorkspaces query; kept here so the login/session layer
// can hydrate the switcher without a second round-trip through Apollo.
func ListMyWorkspaces(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}
	return utils.OK(c, models.UserWorkspaces(database.DB.WithContext(c.Context()), &user), "")
}
