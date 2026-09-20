package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Mess / canteen (Phase 6b).
//
// Education's counterpart to the healthcare Dietary module (models/dietary.go):
// that one is per-patient prescribed diets, this one is a shared campus mess —
// a weekly menu, who ate, and what provisioning cost. Expenses can reference a
// Phase 2 vendor / purchase order so mess groceries flow through the same
// procurement trail as everything else.

// Meal slots. Kept as plain strings (not a DB enum) so a tenant with a
// different meal pattern can still store its own labels.
const (
	MealBreakfast = "breakfast"
	MealLunch     = "lunch"
	MealSnacks    = "snacks"
	MealDinner    = "dinner"
)

// MessMenu is a weekly template row: one (day, meal) cell of the menu grid,
// optionally scoped to one hostel block when blocks run separate kitchens.
type MessMenu struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	DayOfWeek int    `gorm:"index" json:"day_of_week"` // 0 = Sunday … 6 = Saturday
	Meal      string `gorm:"index" json:"meal"`        // breakfast | lunch | snacks | dinner
	Items     string `gorm:"type:text" json:"items"`   // newline-separated item list

	// Empty means "applies to the whole campus".
	HostelBlockID string      `gorm:"index" json:"hostel_block_id"`
	HostelBlock   HostelBlock `gorm:"foreignKey:HostelBlockID" json:"hostel_block,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (m *MessMenu) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

// MessAttendance records one student consuming (or opting into) one meal on
// one day. The composite unique index makes the roster-style bulk mark
// idempotent: re-submitting a day flips Present instead of duplicating rows.
type MessAttendance struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"tenant_id"`

	StudentID string  `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"student_id"`
	Student   Student `gorm:"foreignKey:StudentID" json:"student,omitempty"`

	Date    string `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"date"` // YYYY-MM-DD
	Meal    string `gorm:"not null;uniqueIndex:idx_messatt_uniq" json:"meal"`
	Present bool   `gorm:"default:true" json:"present"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (m *MessAttendance) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

// Mess expense categories.
const (
	MessExpenseGroceries = "groceries"
	MessExpenseGas       = "gas"
	MessExpenseStaff     = "staff"
	MessExpenseOther     = "other"
)

// MessExpense is one provisioning cost. VendorID / PurchaseOrderID are
// optional links into Phase 2 procurement so a grocery run raised as a PO can
// be reconciled against what the mess actually spent.
type MessExpense struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	Date        string  `gorm:"index" json:"date"` // YYYY-MM-DD
	Category    string  `gorm:"index" json:"category"`
	Description string  `json:"description"`
	Amount      float64 `gorm:"not null;default:0" json:"amount"`

	VendorID string `gorm:"index" json:"vendor_id"`
	Vendor   Vendor `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`

	PurchaseOrderID string        `gorm:"index" json:"purchase_order_id"`
	PurchaseOrder   PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (m *MessExpense) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
