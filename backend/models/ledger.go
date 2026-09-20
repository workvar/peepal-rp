package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Ledger source types — the provenance of a batch. Every batch maps to exactly
// one source document (or is a manual adjustment).
const (
	LedgerSourceFeePayment      = "fee_payment"
	LedgerSourceInvoicePayment  = "invoice_payment"
	LedgerSourcePayroll         = "payroll"
	LedgerSourcePurchaseInvoice = "purchase_invoice"
	LedgerSourcePurchasePayment = "purchase_payment"
	LedgerSourceManual          = "manual"
)

// LedgerBatch is one journal entry: a set of lines whose debits equal credits.
// It records provenance so a source document maps to exactly one batch, which
// keeps auto-posting idempotent.
type LedgerBatch struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	Date     string `gorm:"not null;index" json:"date"` // YYYY-MM-DD (posting date)
	Memo     string `json:"memo"`

	// Source provenance. SourceType is one of the LedgerSource* constants;
	// SourceID is that row's id (blank for reversal/manual batches).
	SourceType string `gorm:"index" json:"source_type"`
	SourceID   string `gorm:"index" json:"source_id"`

	Posted   bool          `gorm:"default:true;index" json:"posted"`
	Reversed bool          `gorm:"default:false" json:"reversed"` // a reversal batch was created for this one
	Lines    []LedgerEntry `gorm:"foreignKey:BatchID" json:"lines,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

func (b *LedgerBatch) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

// LedgerEntry is one debit or credit line. Exactly one of Debit/Credit is > 0.
type LedgerEntry struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	BatchID  string `gorm:"not null;index" json:"batch_id"`

	AccountID string  `gorm:"not null;index" json:"account_id"`
	Account   Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`

	Debit  float64 `gorm:"default:0" json:"debit"`
	Credit float64 `gorm:"default:0" json:"credit"`
	Memo   string  `json:"memo"`

	CreatedAt time.Time `json:"created_at"`
}

func (e *LedgerEntry) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
