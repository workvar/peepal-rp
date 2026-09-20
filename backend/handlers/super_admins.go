package handlers

// Super admin user management handlers: create, list, update, and deactivate super admin accounts.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// These endpoints let super admins create and manage other super admin accounts.
// All super admin users live in the platform tenant and share the same privileges.

// ListSuperAdmins returns all super admin accounts on the platform.
func ListSuperAdmins(c *fiber.Ctx) error {
	var users []models.User
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND role = ?", models.PlatformTenantID, models.RoleSuperAdmin).Find(&users)

	result := make([]fiber.Map, len(users))
	for i, u := range users {
		result[i] = fiber.Map{
			"id":          u.ID,
			"name":        u.Name,
			"email":       u.Email,
			"is_active":   u.IsActive,
			"permissions": u.Permissions,
			"created_at":  u.CreatedAt,
		}
	}
	return utils.OK(c, result, "")
}

// CreateSuperAdminRequest is the request body for CreateSuperAdmin.
type CreateSuperAdminRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	// Permissions is a JSON-encoded array string, e.g. `["manage_tenants","view_reports"]`
	Permissions string `json:"permissions"`
}

// CreateSuperAdmin lets an existing super admin create another super admin account.
func CreateSuperAdmin(c *fiber.Ctx) error {
	var req CreateSuperAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return utils.BadRequest(c, "Name, email, and password are required")
	}

	if err := utils.ValidatePassword(req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return utils.InternalError(c, "Could not hash password")
	}

	user := models.User{
		TenantID:    models.PlatformTenantID,
		Name:        req.Name,
		Email:       req.Email,
		Password:    hash,
		Role:        models.RoleSuperAdmin,
		IsActive:    true,
		Permissions: req.Permissions,
	}

	if err := database.DB.WithContext(c.Context()).Create(&user).Error; err != nil {
		return utils.BadRequest(c, "Email already exists or invalid data")
	}

	return utils.Created(c, fiber.Map{
		"id":          user.ID,
		"name":        user.Name,
		"email":       user.Email,
		"role":        user.Role,
		"permissions": user.Permissions,
	}, "Super admin created successfully")
}

// UpdateSuperAdmin updates a super admin's name, password, or active status.
// A super admin cannot demote themselves or change their own role.
func UpdateSuperAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	callerID := middleware.UserID(c)

	var user models.User
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ? AND role = ?", id, models.PlatformTenantID, models.RoleSuperAdmin).First(&user).Error; err != nil {
		return utils.NotFound(c, "Super admin not found")
	}

	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if name, ok := body["name"].(string); ok && name != "" {
		user.Name = name
	}
	// Prevent a super admin from deactivating themselves
	if active, ok := body["is_active"].(bool); ok {
		if id == callerID && !active {
			return utils.BadRequest(c, "You cannot deactivate your own account")
		}
		user.IsActive = active
	}
	// Update permissions if provided
	if perms, ok := body["permissions"].(string); ok {
		user.Permissions = perms
	}
	// Update password if provided
	if password, ok := body["password"].(string); ok && password != "" {
		if err := utils.ValidatePassword(password); err != nil {
			return utils.BadRequest(c, err.Error())
		}
		hash, err := utils.HashPassword(password)
		if err != nil {
			return utils.InternalError(c, "Could not hash password")
		}
		user.Password = hash
	}

	if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, fiber.Map{
		"id":          user.ID,
		"name":        user.Name,
		"email":       user.Email,
		"is_active":   user.IsActive,
		"permissions": user.Permissions,
	}, "Super admin updated")
}

// DeleteSuperAdmin deactivates a super admin account (soft disable).
// A super admin cannot deactivate their own account.
func DeleteSuperAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	callerID := middleware.UserID(c)

	if id == callerID {
		return utils.BadRequest(c, "You cannot deactivate your own account")
	}

	result := database.DB.WithContext(c.Context()).Model(&models.User{}).
		Where("id = ? AND tenant_id = ? AND role = ?", id, models.PlatformTenantID, models.RoleSuperAdmin).
		Update("is_active", false)

	if result.RowsAffected == 0 {
		return utils.NotFound(c, "Super admin not found")
	}

	return utils.OK(c, nil, "Super admin deactivated")
}
