package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// allowedOrgRoles are roles that a tenant admin can assign. super_admin is reserved
// for the platform and can only be granted via the super-admin API.
var allowedOrgRoles = map[string]bool{
	string(models.RoleAdmin):   true,
	string(models.RoleTeacher): true,
	string(models.RoleStudent): true,
	string(models.RoleStaff):   true,
}

// CreateUser allows a tenant admin to create a new user account within their tenant.
// Assigning the super_admin role is not permitted here; use the super-admin API instead.
func CreateUser(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	email := strings.TrimSpace(req.Email)
	if req.Name == "" || req.Password == "" || req.Role == "" {
		return utils.BadRequest(c, "Name, password, and role are required")
	}
	if !allowedOrgRoles[req.Role] {
		return utils.BadRequest(c, "Invalid role. Allowed roles: admin, teacher, student, staff")
	}

	// Email is optional only when the tenant's identity policy allows IDs for
	// this role; admins always need one.
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", tenantID).Error; err != nil {
		return utils.InternalError(c, "Failed to load record")
	}
	if email == "" && tenant.EmailRequiredForRole(models.Role(req.Role)) {
		return utils.BadRequest(c, "An email is required for this role")
	}

	if err := utils.ValidatePassword(req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return utils.InternalError(c, "Could not hash password")
	}

	user := models.User{
		TenantID: tenantID,
		Name:     req.Name,
		Email:    email,
		Password: hash,
		Role:     models.Role(req.Role),
		IsActive: true,
	}

	if err := database.DB.WithContext(c.Context()).Create(&user).Error; err != nil {
		return utils.BadRequest(c, "Email already exists or invalid data")
	}

	return utils.Created(c, fiber.Map{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		"role":  user.Role,
	}, "User created successfully")
}

// ListUsers returns all users for the authenticated tenant.
func ListUsers(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var users []models.User
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Find(&users)

	result := make([]fiber.Map, len(users))
	for i, u := range users {
		result[i] = fiber.Map{
			"id":        u.ID,
			"name":      u.Name,
			"email":     u.Email,
			"role":      u.Role,
			"is_active": u.IsActive,
		}
	}
	return utils.OK(c, result, "")
}

// UpdateUser updates a user's details for the authenticated tenant.
func UpdateUser(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var user models.User
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&user).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if name, ok := body["name"].(string); ok && name != "" {
		user.Name = name
	}
	if role, ok := body["role"].(string); ok && role != "" {
		if !allowedOrgRoles[role] {
			return utils.BadRequest(c, "Invalid role. Allowed roles: admin, teacher, student, staff")
		}
		user.Role = models.Role(role)
	}
	if active, ok := body["is_active"].(bool); ok {
		user.IsActive = active
	}

	if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, fiber.Map{"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role, "is_active": user.IsActive}, "User updated")
}

// DeleteUser deactivates a user in the authenticated tenant (soft disable).
func DeleteUser(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Model(&models.User{}).Where("id = ? AND tenant_id = ?", id, tenantID).Update("is_active", false).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}
	return utils.OK(c, nil, "User deactivated")
}
