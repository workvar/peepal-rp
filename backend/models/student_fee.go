package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Shared payment progress statuses.
const (
	FeeStatusPending = "pending"
	FeeStatusPartial = "partial"
	FeeStatusPaid    = "paid"
)

// StudentFee is the materialized fee record for one student under one
// allocation. It is created when an allocation is applied, and tracks gross
// total, discounts, net payable, and how much has been paid.
type StudentFee struct {
	ID              string                  `gorm:"primaryKey" json:"id"`
	TenantID        string                  `gorm:"not null;index" json:"tenant_id"`
	StudentID       string                  `gorm:"not null;index;uniqueIndex:idx_student_fee_alloc" json:"student_id"`
	Student         Student                 `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	FeeAllocationID string                  `gorm:"not null;index;uniqueIndex:idx_student_fee_alloc" json:"fee_allocation_id"`
	FeeAllocation   FeeAllocation           `gorm:"foreignKey:FeeAllocationID" json:"fee_allocation,omitempty"`
	GrossAmount     float64                 `gorm:"not null" json:"gross_amount"`
	DiscountAmount  float64                 `gorm:"default:0" json:"discount_amount"`
	NetAmount       float64                 `gorm:"not null" json:"net_amount"`
	PaidAmount      float64                 `gorm:"default:0" json:"paid_amount"`
	Status          string                  `gorm:"default:'pending'" json:"status"` // pending | partial | paid
	Discounts       []StudentFeeDiscount    `gorm:"foreignKey:StudentFeeID" json:"discounts,omitempty"`
	AddOns          []StudentFeeAddOn       `gorm:"foreignKey:StudentFeeID" json:"add_ons,omitempty"`
	Installments    []StudentFeeInstallment `gorm:"foreignKey:StudentFeeID" json:"installments,omitempty"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

func (s *StudentFee) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// Discount types for StudentFeeDiscount.
const (
	DiscountFixed   = "fixed"
	DiscountPercent = "percent"
)

// StudentFeeDiscount is a concession line on a student fee (scholarship,
// sibling discount, waiver). Amount is the resolved value in currency.
type StudentFeeDiscount struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	TenantID     string    `gorm:"not null;index" json:"tenant_id"`
	StudentFeeID string    `gorm:"not null;index" json:"student_fee_id"`
	Label        string    `gorm:"not null" json:"label"`
	DiscountType string    `gorm:"not null" json:"discount_type"` // fixed | percent
	Value        float64   `gorm:"not null" json:"value"`
	Amount       float64   `gorm:"not null" json:"amount"`
	Remarks      string    `json:"remarks"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *StudentFeeDiscount) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// StudentFeeInstallment is one due slot of a student fee. Generated from the
// allocation's installment template (plus the student's add-ons), scaled to
// the student's net amount. YearNumber ties the slot to a course year so
// per-year add-ons land on the right installments (0 = n/a).
type StudentFeeInstallment struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	TenantID     string    `gorm:"not null;index" json:"tenant_id"`
	StudentFeeID string    `gorm:"not null;index" json:"student_fee_id"`
	Sequence     int       `gorm:"not null" json:"sequence"`
	Label        string    `gorm:"not null" json:"label"`
	YearNumber   int       `gorm:"default:0" json:"year_number"`
	DueDate      time.Time `json:"due_date"`
	Amount       float64   `gorm:"not null" json:"amount"`
	PaidAmount   float64   `gorm:"default:0" json:"paid_amount"`
	Status       string    `gorm:"default:'pending'" json:"status"` // pending | partial | paid
	CreatedAt    time.Time `json:"created_at"`
}

func (s *StudentFeeInstallment) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
