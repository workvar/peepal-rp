package handlers

import (
	"strings"
	"time"

	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

func ListAnnouncements(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userRole := middleware.UserRole(c)

	query := database.DB.WithContext(c.Context()).Where("announcements.tenant_id = ? AND announcements.is_published = ?", tenantID, true).
		Preload("Author")

	// Filter by target_roles: show if "all" or if user's role is in the list.
	// target_roles is a delimited string, so we fetch and filter in Go rather
	// than relying on DB-specific string/array operators.
	var all []models.Announcement
	query.Order("announcements.created_at DESC").Find(&all)

	// Filter: include if target_roles is "all" or contains userRole
	var visible []models.Announcement
	for _, a := range all {
		if a.TargetRoles == "all" || strings.Contains(a.TargetRoles, userRole) {
			// Check not expired
			if a.ExpiresAt == nil || a.ExpiresAt.After(time.Now()) {
				visible = append(visible, a)
			}
		}
	}
	if visible == nil {
		visible = []models.Announcement{}
	}
	return utils.OK(c, visible, "")
}

func ListAllAnnouncements(c *fiber.Ctx) error {
	// Admin-only: see all announcements including unpublished
	tenantID := middleware.TenantID(c)
	var announcements []models.Announcement
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("Author").
		Order("created_at DESC").
		Find(&announcements)
	return utils.OK(c, announcements, "")
}

func CreateAnnouncement(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)

	var req struct {
		Title       string `json:"title"`
		Body        string `json:"body"`
		TargetRoles string `json:"target_roles"`
		Priority    string `json:"priority"`
		IsPublished *bool  `json:"is_published"`
		ExpiresAt   string `json:"expires_at"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Title == "" || req.Body == "" {
		return utils.BadRequest(c, "Title and body are required")
	}

	targetRoles := req.TargetRoles
	if targetRoles == "" {
		targetRoles = "all"
	}
	priority := req.Priority
	if priority == "" {
		priority = "normal"
	}
	published := true
	if req.IsPublished != nil {
		published = *req.IsPublished
	}

	announcement := models.Announcement{
		TenantID:    tenantID,
		Title:       req.Title,
		Body:        req.Body,
		AuthorID:    userID,
		TargetRoles: targetRoles,
		Priority:    priority,
		IsPublished: published,
	}
	if req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", req.ExpiresAt)
		if err == nil {
			announcement.ExpiresAt = &t
		}
	}

	if err := database.DB.WithContext(c.Context()).Create(&announcement).Error; err != nil {
		return utils.InternalError(c, "Failed to create announcement")
	}
	database.DB.WithContext(c.Context()).Preload("Author").First(&announcement, "id = ?", announcement.ID)
	return utils.Created(c, announcement, "Announcement created")
}

func UpdateAnnouncement(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var a models.Announcement
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&a).Error; err != nil {
		return utils.NotFound(c, "Announcement not found")
	}
	var req struct {
		Title       string `json:"title"`
		Body        string `json:"body"`
		TargetRoles string `json:"target_roles"`
		Priority    string `json:"priority"`
		IsPublished *bool  `json:"is_published"`
		ExpiresAt   string `json:"expires_at"`
	}
	c.BodyParser(&req)
	if req.Title != "" {
		a.Title = req.Title
	}
	if req.Body != "" {
		a.Body = req.Body
	}
	if req.TargetRoles != "" {
		a.TargetRoles = req.TargetRoles
	}
	if req.Priority != "" {
		a.Priority = req.Priority
	}
	if req.IsPublished != nil {
		a.IsPublished = *req.IsPublished
	}
	if req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", req.ExpiresAt)
		if err == nil {
			a.ExpiresAt = &t
		}
	}
	if err := database.DB.WithContext(c.Context()).Save(&a).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, a, "Updated")
}

func DeleteAnnouncement(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Announcement{}).Error; err != nil {
		return utils.InternalError(c, "Failed to delete record")
	}
	return utils.OK(c, nil, "Deleted")
}
