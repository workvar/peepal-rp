package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Account types — the five roots of double-entry bookkeeping.
const (
	AccountAsset     = "asset"
	AccountLiability = "liability"
	AccountEquity    = "equity"
	AccountIncome    = "income"
	AccountExpense   = "expense"
)

// Account is one node of a tenant's chart of accounts (a tree). System accounts
// (IsSystem) are the ones the auto-posting logic looks up by SystemKey; they are
// seeded per tenant and cannot be deleted or retyped.
type Account struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_account_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_account_code" json:"code"` // e.g. "1000", "4000"
	Name     string `gorm:"not null" json:"name"`
	Type     string `gorm:"not null;index" json:"type"` // asset|liability|equity|income|expense

	ParentID string   `gorm:"index" json:"parent_id"` // tree; blank = root
	Parent   *Account `gorm:"foreignKey:ParentID" json:"parent,omitempty"`

	// IsSystem marks accounts the auto-posting logic relies on; these cannot be
	// deleted and their type is locked.
	IsSystem bool `gorm:"default:false" json:"is_system"`
	// SystemKey is the stable handle the posting code resolves accounts by, e.g.
	// "ar_students", "cash", "fee_income", "salary_expense", "ap_vendors".
	SystemKey string `gorm:"index" json:"system_key"`

	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (a *Account) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// NormalIsDebit reports whether the account's normal (increasing) balance sits
// on the debit side. Assets and expenses grow with debits; liabilities, equity
// and income grow with credits. Used by the reporting layer to present a signed
// balance per account.
func (a *Account) NormalIsDebit() bool {
	return a.Type == AccountAsset || a.Type == AccountExpense
}
