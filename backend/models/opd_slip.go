package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OPDSlipConfig stores one tenant's printable OPD slip design as a JSON
// document (logo, header lines, which fields print, custom fields, notes
// space, footer). It follows the BrochureContent pattern: a JSON blob keyed by
// tenant means new slip options never need a migration.
//
// The frontend owns the shape of Content (see components/opd-slip/types.ts);
// the backend only stores and returns the string.
type OPDSlipConfig struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;uniqueIndex" json:"tenant_id"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (o *OPDSlipConfig) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}
