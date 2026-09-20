package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Clinical billing (healthcare industry): a service catalog priced per tenant,
// invoices with line items, and payments applied against them. Parallel to the
// education fee module (which stays education-only) but visit-centric instead
// of enrollment-centric.

// Invoice statuses.
const (
	InvoiceUnpaid        = "unpaid"
	InvoicePartiallyPaid = "partially_paid"
	InvoicePaid          = "paid"
	InvoiceCancelled     = "cancelled"
)

// BillableService is one priced catalog entry (consultation, dressing, X-ray,
// ward charges, …) used to prefill invoice lines.
type BillableService struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_billsvc_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_billsvc_code" json:"code"`
	Name     string `gorm:"not null" json:"name"`
	// Category: consultation | procedure | lab | radiology | other.
	Category  string    `gorm:"default:'other'" json:"category"`
	UnitPrice float64   `gorm:"not null;default:0" json:"unit_price"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *BillableService) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// Invoice bills a patient for one or more services, optionally linked to the
// encounter that produced the charges. Amounts are denormalised (Subtotal,
// Total, AmountPaid) and recomputed inside the resolvers' transactions.
type Invoice struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_invoice_no" json:"tenant_id"`
	// InvoiceNo is the human-facing number, unique per tenant (INV-00001).
	InvoiceNo string  `gorm:"not null;uniqueIndex:idx_invoice_no" json:"invoice_no"`
	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
	// EncounterID links the visit that generated the charges; blank when billed
	// directly (e.g. a walk-in service).
	EncounterID string `gorm:"index" json:"encounter_id"`
	// Date is YYYY-MM-DD.
	Date       string        `gorm:"not null;index" json:"date"`
	Items      []InvoiceItem `gorm:"foreignKey:InvoiceID" json:"items,omitempty"`
	Subtotal   float64       `gorm:"not null;default:0" json:"subtotal"`
	Discount   float64       `gorm:"not null;default:0" json:"discount"`
	Total      float64       `gorm:"not null;default:0" json:"total"`
	AmountPaid float64       `gorm:"not null;default:0" json:"amount_paid"`
	// Status: unpaid | partially_paid | paid | cancelled.
	Status    string    `gorm:"default:'unpaid';index" json:"status"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}

// RecomputeStatus derives the payment status from the stored amounts. Never
// resurrects a cancelled invoice.
func (i *Invoice) RecomputeStatus() {
	if i.Status == InvoiceCancelled {
		return
	}
	switch {
	case i.AmountPaid <= 0:
		i.Status = InvoiceUnpaid
	case i.AmountPaid < i.Total:
		i.Status = InvoicePartiallyPaid
	default:
		i.Status = InvoicePaid
	}
}

// InvoiceItem is one charged line. ServiceID is kept for traceability but the
// description/price are frozen onto the line at billing time.
type InvoiceItem struct {
	ID          string  `gorm:"primaryKey" json:"id"`
	TenantID    string  `gorm:"not null;index" json:"tenant_id"`
	InvoiceID   string  `gorm:"not null;index" json:"invoice_id"`
	ServiceID   string  `json:"service_id"`
	Description string  `gorm:"not null" json:"description"`
	Qty         float64 `gorm:"not null;default:1" json:"qty"`
	UnitPrice   float64 `gorm:"not null;default:0" json:"unit_price"`
	Amount      float64 `gorm:"not null;default:0" json:"amount"`
}

func (it *InvoiceItem) BeforeCreate(tx *gorm.DB) error {
	if it.ID == "" {
		it.ID = uuid.NewString()
	}
	return nil
}

// InvoicePayment is money received against an invoice.
type InvoicePayment struct {
	ID        string  `gorm:"primaryKey" json:"id"`
	TenantID  string  `gorm:"not null;index" json:"tenant_id"`
	InvoiceID string  `gorm:"not null;index" json:"invoice_id"`
	Amount    float64 `gorm:"not null" json:"amount"`
	// Mode: cash | card | upi | online | cheque.
	Mode      string    `gorm:"default:'cash'" json:"mode"`
	Reference string    `json:"reference"`
	PaidAt    time.Time `json:"paid_at"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *InvoicePayment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.PaidAt.IsZero() {
		p.PaidAt = time.Now()
	}
	return nil
}
