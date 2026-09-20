package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Event struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index" json:"tenant_id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	EventDate   time.Time `gorm:"not null" json:"event_date"`
	EndDate     time.Time `json:"end_date"`
	Location    string    `json:"location"`
	Category    string    `gorm:"not null" json:"category"` // academic, cultural, sports, holiday, exam, other
	Color       string    `json:"color"`                    // hex color
	IsPublic    bool      `gorm:"default:true" json:"is_public"`
	CreatedBy   string    `json:"created_by"` // user ID
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (e *Event) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
