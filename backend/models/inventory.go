package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Inventory & stores — healthcare industry, Phase 4. Central store for
// consumables and reagents; an "issue to pharmacy" transaction moves stock into
// a linked pharmacy Drug.

// Stock transaction kinds.
const (
	StockReceipt         = "receipt"    // goods received into the store
	StockIssue           = "issue"      // consumed / issued out
	StockAdjustment      = "adjustment" // manual correction (signed)
	StockIssueToPharmacy = "issue_to_pharmacy"
)

// InventoryItem is one stocked line in the central store.
type InventoryItem struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_inv_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_inv_code" json:"code"`
	Name     string `gorm:"not null" json:"name"`
	// Category: consumable | reagent | drug | equipment | other.
	Category string `gorm:"default:'consumable'" json:"category"`
	Unit     string `gorm:"default:'unit'" json:"unit"`

	StockQty     float64 `gorm:"not null;default:0" json:"stock_qty"`
	ReorderLevel float64 `gorm:"not null;default:0" json:"reorder_level"`
	UnitCost     float64 `gorm:"not null;default:0" json:"unit_cost"`

	// LinkedDrugID lets an item issue stock straight into a pharmacy Drug.
	LinkedDrugID string `gorm:"index" json:"linked_drug_id"`
	LinkedDrug   Drug   `gorm:"foreignKey:LinkedDrugID" json:"linked_drug,omitempty"`

	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (i *InventoryItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}

// StockTransaction records one movement of an inventory item. Qty is signed
// (positive = in, negative = out) so the ledger sums to the on-hand quantity.
type StockTransaction struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	ItemID   string `gorm:"not null;index" json:"item_id"`

	// Kind: receipt | issue | adjustment | issue_to_pharmacy.
	Kind string  `gorm:"not null" json:"kind"`
	Qty  float64 `gorm:"not null" json:"qty"`

	Reason    string `json:"reason"`
	Reference string `json:"reference"`

	ByID string `gorm:"index" json:"by_id"` // acting user id
	By   User   `gorm:"foreignKey:ByID" json:"by,omitempty"`

	Date      string    `gorm:"index" json:"date"` // YYYY-MM-DD
	CreatedAt time.Time `json:"created_at"`
}

func (t *StockTransaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
