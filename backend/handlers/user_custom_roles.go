package handlers

// user_custom_roles.go — thin layer that links User ↔ CustomRole.
// CustomRole CRUD already lives in handlers/org_admin.go; the GraphQL
// createUser mutation does not (yet) accept a customRoleId, so admins
// attach roles via these REST endpoints after creating the user.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// AssignUserCustomRoleRequest — body for PUT /org/users/:id/custom-role.
// Send an empty / omitted custom_role_id to detach the role.
type AssignUserCustomRoleRequest struct {
	CustomRoleID *string `json:"custom_role_id"`
}

// AssignUserCustomRole attaches (or detaches) a CustomRole from a User.
// Admin only. Both user and role must belong to the caller's tenant.
func AssignUserCustomRole(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Params("id")

	var req AssignUserCustomRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Load target user (tenant-scoped).
	var user models.User
	if err := database.DB.WithContext(c.Context()).
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		First(&user).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	// Detach case — caller explicitly cleared the role.
	if req.CustomRoleID == nil || *req.CustomRoleID == "" {
		user.CustomRoleID = nil
		if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
		return utils.OK(c, fiber.Map{"id": user.ID, "custom_role_id": nil}, "Custom role removed")
	}

	// Attach case — verify role exists and is owned by this tenant.
	var role models.CustomRole
	if err := database.DB.WithContext(c.Context()).
		Where("id = ? AND tenant_id = ?", *req.CustomRoleID, tenantID).
		First(&role).Error; err != nil {
		return utils.BadRequest(c, "Custom role not found for this tenant")
	}

	user.CustomRoleID = req.CustomRoleID
	if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	return utils.OK(c, fiber.Map{
		"id":             user.ID,
		"custom_role_id": user.CustomRoleID,
	}, "Custom role assigned")
}

// ListUsersWithCustomRoles returns a lightweight map of { user_id, custom_role_id }
// for the tenant. The Users page calls this alongside the GraphQL users query
// to render the "Custom Role" column without forcing a GraphQL schema change.
func ListUsersWithCustomRoles(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	type row struct {
		ID           string  `json:"id"`
		CustomRoleID *string `json:"custom_role_id"`
	}
	var rows []row
	database.DB.WithContext(c.Context()).Model(&models.User{}).
		Select("id, custom_role_id").
		Where("tenant_id = ?", tenantID).
		Scan(&rows)

	return utils.OK(c, rows, "")
}
