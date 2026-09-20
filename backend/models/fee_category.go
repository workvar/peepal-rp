package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeeCategory is the master list of fee codes (e.g. TUITION, TRANSPORT, FOOD).
// Every fee structure line item points at one of these.
type FeeCategory struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index;uniqueIndex:idx_fee_cat_code" json:"tenant_id"`
	Name        string    `gorm:"not null" json:"name"`
	Code        string    `gorm:"not null;uniqueIndex:idx_fee_cat_code" json:"code"`
	Description string    `json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

func (f *FeeCategory) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}
