package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateEventRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"` // YYYY-MM-DD
	EndDate     string `json:"end_date"`   // YYYY-MM-DD
	Location    string `json:"location"`
	Category    string `json:"category"`
	Color       string `json:"color"`
	IsPublic    bool   `json:"is_public"`
}

type UpdateEventRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	EventDate   string `json:"event_date"`
	EndDate     string `json:"end_date"`
	Location    string `json:"location"`
	Category    string `json:"category"`
	Color       string `json:"color"`
	IsPublic    bool   `json:"is_public"`
}

// ListEvents returns all events for the tenant
func ListEvents(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var events []models.Event
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID)

	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	query.Order("event_date asc").Find(&events)
	return utils.OK(c, events, "")
}

// CreateEvent creates a new event
func CreateEvent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	var req CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Title == "" || req.EventDate == "" || req.Category == "" {
		return utils.BadRequest(c, "Title, event_date, and category are required")
	}

	eventDate, err := time.Parse("2006-01-02", req.EventDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid event_date — use YYYY-MM-DD")
	}

	var endDate time.Time
	if req.EndDate != "" {
		endDate, err = time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return utils.BadRequest(c, "Invalid end_date — use YYYY-MM-DD")
		}
	} else {
		endDate = eventDate
	}

	event := models.Event{
		TenantID:    tenantID,
		Title:       req.Title,
		Description: req.Description,
		EventDate:   eventDate,
		EndDate:     endDate,
		Location:    req.Location,
		Category:    req.Category,
		Color:       req.Color,
		IsPublic:    req.IsPublic,
		CreatedBy:   userID,
	}

	if err := database.DB.WithContext(c.Context()).Create(&event).Error; err != nil {
		return utils.InternalError(c, "Could not create event")
	}

	return utils.Created(c, event, "Event created successfully")
}

// GetEvent retrieves a single event
func GetEvent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var event models.Event
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&event).Error; err != nil {
		return utils.NotFound(c, "Event not found")
	}

	return utils.OK(c, event, "")
}

// UpdateEvent updates an event
func UpdateEvent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var event models.Event
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&event).Error; err != nil {
		return utils.NotFound(c, "Event not found")
	}

	var req UpdateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Title != "" {
		event.Title = req.Title
	}
	if req.Description != "" {
		event.Description = req.Description
	}
	if req.Location != "" {
		event.Location = req.Location
	}
	if req.Category != "" {
		event.Category = req.Category
	}
	if req.Color != "" {
		event.Color = req.Color
	}

	if req.EventDate != "" {
		eventDate, err := time.Parse("2006-01-02", req.EventDate)
		if err != nil {
			return utils.BadRequest(c, "Invalid event_date — use YYYY-MM-DD")
		}
		event.EventDate = eventDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return utils.BadRequest(c, "Invalid end_date — use YYYY-MM-DD")
		}
		event.EndDate = endDate
	}

	event.IsPublic = req.IsPublic

	if err := database.DB.WithContext(c.Context()).Save(&event).Error; err != nil {
		return utils.InternalError(c, "Could not update event")
	}

	return utils.OK(c, event, "Event updated successfully")
}

// DeleteEvent deletes an event
func DeleteEvent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var event models.Event
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&event).Error; err != nil {
		return utils.NotFound(c, "Event not found")
	}

	if err := database.DB.WithContext(c.Context()).Delete(&event).Error; err != nil {
		return utils.InternalError(c, "Could not delete event")
	}

	return utils.OK(c, nil, "Event deleted successfully")
}
