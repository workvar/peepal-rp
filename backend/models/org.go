package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OrgProfile stores organization-specific branding and settings.
type OrgProfile struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	TenantID      string    `gorm:"not null;uniqueIndex" json:"tenant_id"`
	Name          string    `gorm:"not null" json:"name"`
	LogoURL       string    `json:"logo_url"`
	Tagline       string    `json:"tagline"`
	PrimaryColor  string    `json:"primary_color"`
	AccentColor   string    `json:"accent_color"`
	Accreditation string    `json:"accreditation"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (o *OrgProfile) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}

// CustomRole represents a custom role within a tenant.
type CustomRole struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index" json:"tenant_id"`
	Name        string    `gorm:"not null" json:"name"`
	Permissions string    `gorm:"type:text" json:"permissions"` // JSON string
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (c *CustomRole) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
