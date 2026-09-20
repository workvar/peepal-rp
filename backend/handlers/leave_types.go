package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ListLeaveTypes returns leave type configs for the tenant.
func ListLeaveTypes(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var types []models.LeaveTypeConfig
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Order("name asc").Find(&types)
	// If none configured, return defaults
	if len(types) == 0 {
		return utils.OK(c, []fiber.Map{
			{"code": "CL", "name": "Casual Leave", "days_per_year": 12, "carry_forward": false},
			{"code": "SL", "name": "Sick Leave", "days_per_year": 12, "carry_forward": false},
			{"code": "EL", "name": "Earned Leave", "days_per_year": 24, "carry_forward": true, "max_carry_forward": 30},
		}, "")
	}
	return utils.OK(c, types, "")
}

type CreateLeaveTypeRequest struct {
	Name            string `json:"name"`
	Code            string `json:"code"`
	DaysPerYear     int    `json:"days_per_year"`
	CarryForward    bool   `json:"carry_forward"`
	MaxCarryForward int    `json:"max_carry_forward"`
	ApplicableTo    string `json:"applicable_to"`
}

// CreateLeaveType adds a leave type config (admin only).
func CreateLeaveType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateLeaveTypeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.Code == "" {
		return utils.BadRequest(c, "Name and code are required")
	}
	applicable := req.ApplicableTo
	if applicable == "" {
		applicable = "all"
	}
	lt := models.LeaveTypeConfig{
		TenantID:        tenantID,
		Name:            req.Name,
		Code:            req.Code,
		DaysPerYear:     req.DaysPerYear,
		CarryForward:    req.CarryForward,
		MaxCarryForward: req.MaxCarryForward,
		ApplicableTo:    applicable,
	}
	if err := database.DB.WithContext(c.Context()).Create(&lt).Error; err != nil {
		return utils.BadRequest(c, "Leave type code already exists")
	}
	return utils.Created(c, lt, "Leave type created")
}

// UpdateLeaveType updates a leave type config (admin only).
func UpdateLeaveType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var lt models.LeaveTypeConfig
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&lt).Error; err != nil {
		return utils.NotFound(c, "Leave type not found")
	}
	var req CreateLeaveTypeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name != "" {
		lt.Name = req.Name
	}
	if req.DaysPerYear > 0 {
		lt.DaysPerYear = req.DaysPerYear
	}
	lt.CarryForward = req.CarryForward
	if req.MaxCarryForward >= 0 {
		lt.MaxCarryForward = req.MaxCarryForward
	}
	if req.ApplicableTo != "" {
		lt.ApplicableTo = req.ApplicableTo
	}
	lt.UpdatedAt = time.Now()
	if err := database.DB.WithContext(c.Context()).Save(&lt).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, lt, "Leave type updated")
}

// DeleteLeaveType removes a leave type (admin only).
func DeleteLeaveType(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.LeaveTypeConfig{}).Error; err != nil {
		return utils.NotFound(c, "Leave type not found")
	}
	return utils.OK(c, nil, "Leave type deleted")
}

// GetMyLeaveBalance returns the leave balance for the authenticated user.
func GetMyLeaveBalance(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)
	year := time.Now().Year()

	var balances []models.LeaveBalance
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND user_id = ? AND year = ?", tenantID, userID, year).
		Preload("LeaveType").Find(&balances)

	// If no balances exist, auto-create from configured types
	if len(balances) == 0 {
		var types []models.LeaveTypeConfig
		database.DB.WithContext(c.Context()).Where("tenant_id = ? AND is_active = ?", tenantID, true).Find(&types)
		for _, lt := range types {
			b := models.LeaveBalance{
				TenantID:    tenantID,
				UserID:      userID,
				LeaveTypeID: lt.ID,
				Year:        year,
				Total:       float64(lt.DaysPerYear),
			}
			if err := database.DB.WithContext(c.Context()).Create(&b).Error; err != nil {
				return utils.InternalError(c, "Failed to create record")
			}
			b.LeaveType = lt
			balances = append(balances, b)
		}
	}

	return utils.OK(c, balances, "")
}

// ListLeaveBalances returns leave balances for all users (admin/HR).
func ListLeaveBalances(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	year := c.QueryInt("year", time.Now().Year())
	userID := c.Query("user_id")

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND year = ?", tenantID, year).
		Preload("User").Preload("LeaveType")
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var balances []models.LeaveBalance
	query.Find(&balances)
	return utils.OK(c, balances, "")
}

// helper: calculate working days between two dates (excluding weekends)
func workingDaysBetween(from, to time.Time) float64 {
	days := 0.0
	curr := from
	for !curr.After(to) {
		if curr.Weekday() != time.Saturday && curr.Weekday() != time.Sunday {
			days++
		}
		curr = curr.AddDate(0, 0, 1)
	}
	return math.Max(days, 1)
}
