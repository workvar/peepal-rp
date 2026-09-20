package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/push"
	"collegeerp/utils"
	"log"

	"github.com/gofiber/fiber/v2"
)

// GetMyNotifications returns notifications for the current user
func GetMyNotifications(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	var notifications []models.Notification
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC").
		Limit(50).
		Find(&notifications)
	return utils.OK(c, notifications, "")
}

// GetUnreadCount returns the count of unread notifications
func GetUnreadCount(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	var count int64
	database.DB.WithContext(c.Context()).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", tenantID, userID, false).
		Count(&count)
	return utils.OK(c, fiber.Map{"count": count}, "")
}

// MarkNotificationRead marks a single notification as read
func MarkNotificationRead(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	id := c.Params("id")

	database.DB.WithContext(c.Context()).Model(&models.Notification{}).
		Where("id = ? AND tenant_id = ? AND user_id = ?", id, tenantID, userID).
		Update("is_read", true)
	return utils.OK(c, nil, "Marked as read")
}

// MarkAllNotificationsRead marks all user notifications as read
func MarkAllNotificationsRead(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	database.DB.WithContext(c.Context()).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", tenantID, userID, false).
		Update("is_read", true)
	return utils.OK(c, nil, "All marked as read")
}

// DeleteNotification deletes a notification
func DeleteNotification(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	id := c.Params("id")

	database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ? AND user_id = ?", id, tenantID, userID).
		Delete(&models.Notification{})
	return utils.OK(c, nil, "Deleted")
}

// SendNotification allows admin to send a notification to a specific user
func SendNotification(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req struct {
		UserID   string `json:"user_id"`
		Title    string `json:"title"`
		Body     string `json:"body"`
		Type     string `json:"type"`
		Category string `json:"category"`
		RefID    string `json:"ref_id"`
		RefType  string `json:"ref_type"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.UserID == "" || req.Title == "" {
		return utils.BadRequest(c, "user_id and title are required")
	}
	notifType := req.Type
	if notifType == "" {
		notifType = "info"
	}
	category := req.Category
	if category == "" {
		category = "general"
	}

	n := models.Notification{
		TenantID: tenantID,
		UserID:   req.UserID,
		Title:    req.Title,
		Body:     req.Body,
		Type:     notifType,
		Category: category,
		RefID:    req.RefID,
		RefType:  req.RefType,
	}
	if err := database.DB.WithContext(c.Context()).Create(&n).Error; err != nil {
		return utils.InternalError(c, "Failed to create record")
	}
	push.NotifyRecord(database.DB, n)
	return utils.Created(c, n, "Notification sent")
}

// CreateNotification is a helper used internally by other handlers
func CreateNotification(tenantID, userID, title, body, notifType, category, refID, refType string) {
	n := models.Notification{
		TenantID: tenantID,
		UserID:   userID,
		Title:    title,
		Body:     body,
		Type:     notifType,
		Category: category,
		RefID:    refID,
		RefType:  refType,
	}
	if err := database.DB.Create(&n).Error; err != nil {
		log.Printf("[NOTIFY] failed to create notification for user %s: %v", userID, err)
		return
	}
	push.NotifyRecord(database.DB, n)
}
