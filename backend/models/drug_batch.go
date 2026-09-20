package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DrugBatch is one received lot of a Drug with its own expiry and remaining
// quantity. Dispensing draws from the earliest-expiry batch first (FEFO).
// Drug.StockQty stays as the denormalized SUM(DrugBatch.Qty), kept in sync
// inside the dispense/receive transactions.
type DrugBatch struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	DrugID   string `gorm:"not null;index" json:"drug_id"`
	Drug     Drug   `gorm:"foreignKey:DrugID" json:"drug,omitempty"`

	BatchNo    string  `gorm:"not null;index" json:"batch_no"`
	ExpiryDate string  `gorm:"index" json:"expiry_date"`      // YYYY-MM-DD, FEFO sort key
	Qty        float64 `gorm:"not null;default:0" json:"qty"` // remaining in this batch
	UnitCost   float64 `gorm:"default:0" json:"unit_cost"`

	ReceivedFromPOID string `gorm:"index" json:"received_from_po_id"` // provenance

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *DrugBatch) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
