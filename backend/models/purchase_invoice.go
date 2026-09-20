package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Purchase invoice payment status. An unpaid invoice is the Phase 3 AP source
// (an accounts-payable liability).
const (
	PurchaseInvoiceUnpaid  = "unpaid"
	PurchaseInvoicePartial = "partially_paid"
	PurchaseInvoicePaid    = "paid"
)

// PurchaseInvoice is a supplier bill, optionally against a PO.
type PurchaseInvoice struct {
	ID            string `gorm:"primaryKey" json:"id"`
	TenantID      string `gorm:"not null;index;uniqueIndex:idx_pinv_number" json:"tenant_id"`
	InvoiceNumber string `gorm:"not null;uniqueIndex:idx_pinv_number" json:"invoice_number"` // supplier's, unique per tenant

	VendorID        string        `gorm:"not null;index" json:"vendor_id"`
	Vendor          Vendor        `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	PurchaseOrderID string        `gorm:"index" json:"purchase_order_id"` // optional link
	PurchaseOrder   PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`

	InvoiceDate string `gorm:"index" json:"invoice_date"` // YYYY-MM-DD
	DueDate     string `json:"due_date"`

	Subtotal   float64 `gorm:"default:0" json:"subtotal"`
	TaxTotal   float64 `gorm:"default:0" json:"tax_total"`
	Total      float64 `gorm:"default:0" json:"total"`
	PaidAmount float64 `gorm:"default:0" json:"paid_amount"`
	Status     string  `gorm:"default:'unpaid';index" json:"status"`

	// GL posting linkage (Phase 3): blank until posted to the ledger.
	LedgerBatchID string `gorm:"index" json:"ledger_batch_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *PurchaseInvoice) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}
