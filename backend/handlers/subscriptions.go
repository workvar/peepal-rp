package handlers

import (
	"strings"
	"time"

	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// ─── Subscription Plans (super-admin) ─────────────────────────────────────────

// ListPlans returns all subscription plans
func ListPlans(c *fiber.Ctx) error {
	var plans []models.SubscriptionPlan
	database.DB.WithContext(c.Context()).Order("created_at DESC").Find(&plans)
	return utils.OK(c, plans, "")
}

// CreatePlan creates a new subscription plan
func CreatePlan(c *fiber.Ctx) error {
	var req struct {
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		PriceMonthly  float64 `json:"price_monthly"`
		PriceAnnually float64 `json:"price_annually"`
		MaxStudents   int     `json:"max_students"`
		MaxEmployees  int     `json:"max_employees"`
		Modules       string  `json:"modules"` // comma-separated
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}
	if req.Name == "" {
		return utils.BadRequest(c, "Plan name is required")
	}
	if req.Modules == "" {
		req.Modules = strings.Join(models.ModuleCatalogKeys(), ",")
	}
	plan := models.SubscriptionPlan{
		Name:          req.Name,
		Description:   req.Description,
		PriceMonthly:  req.PriceMonthly,
		PriceAnnually: req.PriceAnnually,
		MaxStudents:   req.MaxStudents,
		MaxEmployees:  req.MaxEmployees,
		Modules:       req.Modules,
	}
	if plan.MaxStudents == 0 {
		plan.MaxStudents = 100
	}
	if plan.MaxEmployees == 0 {
		plan.MaxEmployees = 20
	}
	if err := database.DB.WithContext(c.Context()).Create(&plan).Error; err != nil {
		return utils.InternalError(c, "Failed to create plan")
	}
	return utils.Created(c, plan, "Plan created")
}

// UpdatePlan updates an existing subscription plan
func UpdatePlan(c *fiber.Ctx) error {
	id := c.Params("id")
	var plan models.SubscriptionPlan
	if err := database.DB.WithContext(c.Context()).First(&plan, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Plan not found")
	}
	var req struct {
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		PriceMonthly  float64 `json:"price_monthly"`
		PriceAnnually float64 `json:"price_annually"`
		MaxStudents   int     `json:"max_students"`
		MaxEmployees  int     `json:"max_employees"`
		Modules       string  `json:"modules"`
		IsActive      *bool   `json:"is_active"`
	}
	c.BodyParser(&req)
	if req.Name != "" {
		plan.Name = req.Name
	}
	if req.Description != "" {
		plan.Description = req.Description
	}
	if req.PriceMonthly > 0 {
		plan.PriceMonthly = req.PriceMonthly
	}
	if req.PriceAnnually > 0 {
		plan.PriceAnnually = req.PriceAnnually
	}
	if req.MaxStudents > 0 {
		plan.MaxStudents = req.MaxStudents
	}
	if req.MaxEmployees > 0 {
		plan.MaxEmployees = req.MaxEmployees
	}
	if req.Modules != "" {
		plan.Modules = req.Modules
	}
	if req.IsActive != nil {
		plan.IsActive = *req.IsActive
	}
	if err := database.DB.WithContext(c.Context()).Save(&plan).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, plan, "Updated")
}

// DeletePlan deletes a subscription plan if no active subscriptions reference it
func DeletePlan(c *fiber.Ctx) error {
	id := c.Params("id")
	// Check no active subscriptions reference this plan
	var count int64
	database.DB.WithContext(c.Context()).Model(&models.TenantSubscription{}).Where("plan_id = ? AND status = ?", id, "active").Count(&count)
	if count > 0 {
		return utils.BadRequest(c, "Cannot delete plan with active subscriptions")
	}
	if err := database.DB.WithContext(c.Context()).Delete(&models.SubscriptionPlan{}, "id = ?", id).Error; err != nil {
		return utils.InternalError(c, "Failed to delete record")
	}
	return utils.OK(c, nil, "Deleted")
}

// ─── Tenant Subscriptions (super-admin) ───────────────────────────────────────

// ListSubscriptions returns all tenant subscriptions
func ListSubscriptions(c *fiber.Ctx) error {
	var subs []models.TenantSubscription
	database.DB.WithContext(c.Context()).Preload("Tenant").Preload("Plan").Order("created_at DESC").Find(&subs)
	return utils.OK(c, subs, "")
}

// GetTenantSubscription returns subscription details for a specific tenant
func GetTenantSubscription(c *fiber.Ctx) error {
	tenantID := c.Params("tenantId")
	var sub models.TenantSubscription
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Plan").First(&sub).Error; err != nil {
		return utils.NotFound(c, "No subscription found for this tenant")
	}
	// Attach usage counts
	var studentCount, employeeCount int64
	database.DB.WithContext(c.Context()).Model(&models.Student{}).Where("tenant_id = ?", tenantID).Count(&studentCount)
	database.DB.WithContext(c.Context()).Model(&models.Employee{}).Where("tenant_id = ?", tenantID).Count(&employeeCount)
	return utils.OK(c, fiber.Map{
		"subscription": sub,
		"usage": fiber.Map{
			"students":      studentCount,
			"employees":     employeeCount,
			"max_students":  sub.EffectiveMaxStudents(),
			"max_employees": sub.EffectiveMaxEmployees(),
			"modules":       sub.EffectiveModules(),
		},
	}, "")
}

// AssignSubscription assigns or updates a subscription for a tenant
func AssignSubscription(c *fiber.Ctx) error {
	var req struct {
		TenantID             string `json:"tenant_id"`
		PlanID               string `json:"plan_id"`
		BillingPeriod        string `json:"billing_period"`
		Status               string `json:"status"`
		StartDate            string `json:"start_date"`
		EndDate              string `json:"end_date"`
		MaxStudentsOverride  int    `json:"max_students_override"`
		MaxEmployeesOverride int    `json:"max_employees_override"`
		ModulesOverride      string `json:"modules_override"`
		Notes                string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}
	if req.TenantID == "" || req.PlanID == "" {
		return utils.BadRequest(c, "tenant_id and plan_id are required")
	}

	// Verify plan exists
	var plan models.SubscriptionPlan
	if err := database.DB.WithContext(c.Context()).First(&plan, "id = ?", req.PlanID).Error; err != nil {
		return utils.NotFound(c, "Plan not found")
	}

	startDate := time.Now()
	if req.StartDate != "" {
		startDate, _ = time.Parse("2006-01-02", req.StartDate)
	}
	endDate := startDate.AddDate(0, 1, 0)
	if req.EndDate != "" {
		endDate, _ = time.Parse("2006-01-02", req.EndDate)
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = "monthly"
	}
	if req.Status == "" {
		req.Status = "active"
	}

	// Module override is stored exactly as sent: a non-empty CSV restricts the
	// org to those modules; an empty string means "use the plan's modules"
	// (EffectiveModules falls back to the plan). We deliberately do NOT seed a
	// vertical default here — auto-seeding made every org look permanently
	// overridden and silently restricted it once module gating is enforced.

	// Upsert: if subscription exists for tenant, update it; otherwise create
	var sub models.TenantSubscription
	err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", req.TenantID).First(&sub).Error
	if err != nil {
		// Create new
		sub = models.TenantSubscription{
			TenantID:             req.TenantID,
			PlanID:               req.PlanID,
			BillingPeriod:        req.BillingPeriod,
			Status:               req.Status,
			StartDate:            startDate,
			EndDate:              endDate,
			MaxStudentsOverride:  req.MaxStudentsOverride,
			MaxEmployeesOverride: req.MaxEmployeesOverride,
			ModulesOverride:      req.ModulesOverride,
			Notes:                req.Notes,
		}
		if err2 := database.DB.WithContext(c.Context()).Create(&sub).Error; err2 != nil {
			return utils.InternalError(c, "Failed to create subscription")
		}
	} else {
		// Update existing
		sub.PlanID = req.PlanID
		sub.BillingPeriod = req.BillingPeriod
		sub.Status = req.Status
		sub.StartDate = startDate
		sub.EndDate = endDate
		sub.MaxStudentsOverride = req.MaxStudentsOverride
		sub.MaxEmployeesOverride = req.MaxEmployeesOverride
		// Store the override exactly as sent so super-admins can both set and
		// clear it (empty = fall back to the plan's modules).
		sub.ModulesOverride = req.ModulesOverride
		sub.Notes = req.Notes
		if err := database.DB.WithContext(c.Context()).Save(&sub).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
	}

	database.DB.WithContext(c.Context()).Preload("Tenant").Preload("Plan").First(&sub, "id = ?", sub.ID)
	return utils.Created(c, sub, "Subscription assigned")
}

// UpdateSubscriptionStatus updates subscription status and notes
func UpdateSubscriptionStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var sub models.TenantSubscription
	if err := database.DB.WithContext(c.Context()).First(&sub, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Subscription not found")
	}
	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	c.BodyParser(&req)
	if req.Status != "" {
		sub.Status = req.Status
	}
	if req.Notes != "" {
		sub.Notes = req.Notes
	}
	if err := database.DB.WithContext(c.Context()).Save(&sub).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, sub, "Updated")
}

// GetMySubscription returns the authenticated tenant's subscription and module access
func GetMySubscription(c *fiber.Ctx) error {
	// Extract tenantID from JWT locals
	tenantIDVal := c.Locals("tenantID")
	tenantID, ok := tenantIDVal.(string)
	if !ok || tenantID == "" {
		return utils.BadRequest(c, "Tenant ID not found in token")
	}

	var sub models.TenantSubscription
	err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Plan").First(&sub).Error
	if err != nil {
		// No subscription assigned — return a default/free access object
		return utils.OK(c, fiber.Map{
			"subscription": nil,
			"usage": fiber.Map{
				"modules": strings.Join(models.ModuleCatalogKeys(), ","),
			},
		}, "No subscription found — default access")
	}

	var studentCount, employeeCount int64
	database.DB.WithContext(c.Context()).Model(&models.Student{}).Where("tenant_id = ?", tenantID).Count(&studentCount)
	database.DB.WithContext(c.Context()).Model(&models.Employee{}).Where("tenant_id = ?", tenantID).Count(&employeeCount)

	return utils.OK(c, fiber.Map{
		"subscription": sub,
		"usage": fiber.Map{
			"students":      studentCount,
			"employees":     employeeCount,
			"max_students":  sub.EffectiveMaxStudents(),
			"max_employees": sub.EffectiveMaxEmployees(),
			"modules":       sub.EffectiveModules(),
		},
	}, "")
}
