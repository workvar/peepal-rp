package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Purchase order status lifecycle.
const (
	POStatusDraft     = "draft"
	POStatusOrdered   = "ordered"
	POStatusPartial   = "partially_received" // some lines received
	POStatusReceived  = "received"           // fully received
	POStatusCancelled = "cancelled"
)

// PurchaseOrder is a header + lines document sent to a vendor. Receiving lines
// writes into the existing StockTransaction ledger (see receivePurchaseOrder).
type PurchaseOrder struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_po_number" json:"tenant_id"`
	PONumber string `gorm:"not null;uniqueIndex:idx_po_number" json:"po_number"` // PO-%05d per tenant

	VendorID string `gorm:"not null;index" json:"vendor_id"`
	Vendor   Vendor `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`

	OrderDate    string `gorm:"index" json:"order_date"` // YYYY-MM-DD
	ExpectedDate string `json:"expected_date"`
	Status       string `gorm:"default:'draft';index" json:"status"`

	Subtotal float64 `gorm:"default:0" json:"subtotal"`
	TaxTotal float64 `gorm:"default:0" json:"tax_total"`
	Total    float64 `gorm:"default:0" json:"total"`
	Notes    string  `json:"notes"`

	Items []PurchaseOrderItem `gorm:"foreignKey:PurchaseOrderID" json:"items,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *PurchaseOrder) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// PurchaseOrderItem is one ordered line. ItemID links to the store item this
// line replenishes (nullable for one-off buys that don't track stock). No DB FK
// exists, so refs are validated in code.
type PurchaseOrderItem struct {
	ID              string `gorm:"primaryKey" json:"id"`
	TenantID        string `gorm:"not null;index" json:"tenant_id"`
	PurchaseOrderID string `gorm:"not null;index" json:"purchase_order_id"`

	ItemID   string        `gorm:"index" json:"item_id"`
	Item     InventoryItem `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	ItemName string        `gorm:"not null" json:"item_name"` // snapshot

	Qty         float64 `gorm:"not null" json:"qty"`
	ReceivedQty float64 `gorm:"default:0" json:"received_qty"` // running total, partial receipts
	UnitCost    float64 `gorm:"not null;default:0" json:"unit_cost"`
	TaxPct      float64 `gorm:"default:0" json:"tax_pct"`
	LineTotal   float64 `gorm:"default:0" json:"line_total"`
}

func (i *PurchaseOrderItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}
