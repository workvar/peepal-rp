package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Add-on kinds. "transport" and "hostel" let the system auto-attach the add-on
// when a student is allocated a bus route / hostel room, so the charge isn't
// entered twice. "other" add-ons (mess, lab, etc.) are attached manually.
const (
	FeeAddOnOther     = "other"
	FeeAddOnTransport = "transport"
	FeeAddOnHostel    = "hostel"
)

// FeeAddOn is an optional facility charge (Transport, Hostel, Mess…) defined
// once per tenant. It is NOT part of any course structure: admins attach it
// to individual students on top of their base fee, and can remove it again
// when the student opts out for a later year. When Kind is transport/hostel,
// allocating that facility auto-attaches this add-on (see fee_facility_sync.go).
type FeeAddOn struct {
	ID            string      `gorm:"primaryKey" json:"id"`
	TenantID      string      `gorm:"not null;index;uniqueIndex:idx_fee_addon_code" json:"tenant_id"`
	Name          string      `gorm:"not null" json:"name"`
	Code          string      `gorm:"not null;uniqueIndex:idx_fee_addon_code" json:"code"`
	Kind          string      `gorm:"default:'other';index" json:"kind"` // other | transport | hostel
	FeeCategoryID string      `gorm:"not null;index" json:"fee_category_id"`
	FeeCategory   FeeCategory `gorm:"foreignKey:FeeCategoryID" json:"fee_category,omitempty"`
	AmountPerYear float64     `gorm:"not null" json:"amount_per_year"`
	Description   string      `json:"description"`
	IsActive      bool        `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time   `json:"created_at"`
}

func (f *FeeAddOn) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}

// StudentFeeAddOn attaches one add-on to one student fee for one course year.
// Amount is copied from the add-on at attach time. Adding/removing rows
// recomputes the fee's totals and unpaid installments.
type StudentFeeAddOn struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	TenantID     string    `gorm:"not null;index" json:"tenant_id"`
	StudentFeeID string    `gorm:"not null;index;uniqueIndex:idx_sfa_fee_addon_year" json:"student_fee_id"`
	FeeAddOnID   string    `gorm:"not null;index;uniqueIndex:idx_sfa_fee_addon_year" json:"fee_add_on_id"`
	FeeAddOn     FeeAddOn  `gorm:"foreignKey:FeeAddOnID" json:"fee_add_on,omitempty"`
	YearNumber   int       `gorm:"not null;default:1;uniqueIndex:idx_sfa_fee_addon_year" json:"year_number"`
	Amount       float64   `gorm:"not null" json:"amount"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *StudentFeeAddOn) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
