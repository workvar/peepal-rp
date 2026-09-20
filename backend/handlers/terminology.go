package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// GetTerminology returns the label map for the current tenant's type.
// The frontend reads this once on login and uses it to localize UI copy
// (e.g. "Students" vs "Employees" vs "Patients").
func GetTerminology(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", tenantID).Error; err != nil {
		// Unknown tenant — fall back to the education defaults so the UI
		// never breaks, but signal the miss via the message field.
		return utils.OK(c, fiber.Map{
			"type":  models.TenantTypeEducation,
			"labels": models.DefaultTerminology(models.TenantTypeEducation),
		}, "tenant not found; using defaults")
	}

	canonical := tenant.Type.Canonical()
	return utils.OK(c, fiber.Map{
		"type":   canonical,
		"labels": models.DefaultTerminology(canonical),
	}, "")
}
