package middleware

import (
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// TenantID returns the tenant ID from fiber context locals.
func TenantID(c *fiber.Ctx) string {
	if id, ok := c.Locals("tenantID").(string); ok {
		return id
	}
	return ""
}

// IsSuperAdmin returns whether the authenticated user is a super admin.
func IsSuperAdmin(c *fiber.Ctx) bool {
	if sa, ok := c.Locals("isSuperAdmin").(bool); ok {
		return sa
	}
	return false
}

// RequireSuperAdmin ensures the caller is a super admin.
func RequireSuperAdmin(c *fiber.Ctx) error {
	if sa, ok := c.Locals("isSuperAdmin").(bool); ok && sa {
		return c.Next()
	}
	return utils.Forbidden(c, "Super admin access required")
}

// UserID returns the authenticated user ID from fiber context locals.
func UserID(c *fiber.Ctx) string {
	if id, ok := c.Locals("userID").(string); ok {
		return id
	}
	return ""
}

// UserRole returns the authenticated user's role from fiber context locals.
func UserRole(c *fiber.Ctx) string {
	if role, ok := c.Locals("role").(string); ok {
		return role
	}
	return ""
}
