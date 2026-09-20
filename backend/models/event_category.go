package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EventCategory is a tenant-defined calendar category that supplements the
// built-in defaults (academic, cultural, sports, holiday, exam, other). Each
// row is scoped to one tenant; Slug is what an Event stores in its Category
// column, so it must be unique per tenant.
type EventCategory struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index" json:"tenant_id"`
	Name        string    `gorm:"not null" json:"name"`
	Slug        string    `gorm:"not null;index" json:"slug"`
	Color       string    `json:"color"`       // hex color
	Description string    `json:"description"` // optional notes
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (c *EventCategory) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
