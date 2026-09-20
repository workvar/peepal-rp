package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Vendor is a supplier of goods/services. Written generically (untagged by
// industry) so schools and hospitals both procure through it. Phase 3 AP and
// Phase 6 mess reuse the same table.
type Vendor struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_vendor_tenant_name" json:"tenant_id"`
	Name     string `gorm:"not null;uniqueIndex:idx_vendor_tenant_name" json:"name"`
	Code     string `gorm:"index" json:"code"`  // optional supplier code
	GSTIN    string `json:"gstin"`              // tax id
	ContactName  string `json:"contact_name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Address      string `json:"address"`
	PaymentTerms string `json:"payment_terms"` // e.g. "Net 30"
	Active       bool   `gorm:"default:true" json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (v *Vendor) BeforeCreate(tx *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.NewString()
	}
	return nil
}
