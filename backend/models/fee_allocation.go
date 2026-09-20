package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Payment frequencies for FeeAllocation.
const (
	FeeFreqOneTime  = "one_time"
	FeeFreqYearly   = "yearly"
	FeeFreqSemester = "semester"
)

// Allocation target types.
const (
	FeeTargetCourse  = "course"
	FeeTargetBatch   = "batch"
	FeeTargetStudent = "student"
)

// FeeAllocation applies a course fee structure to students with a payment
// schedule. The admin picks how students pay (all at once, yearly, or
// semester-wise) and installments are auto-generated from the structure's
// per-year amounts. Creating an allocation materializes a StudentFee for
// every covered student.
type FeeAllocation struct {
	ID             string                     `gorm:"primaryKey" json:"id"`
	TenantID       string                     `gorm:"not null;index" json:"tenant_id"`
	FeeStructureID string                     `gorm:"not null;index" json:"fee_structure_id"`
	FeeStructure   FeeStructure               `gorm:"foreignKey:FeeStructureID" json:"fee_structure,omitempty"`
	Name           string                     `gorm:"not null" json:"name"`
	Frequency      string                     `gorm:"not null" json:"frequency"`   // one_time | yearly | semester
	TargetType     string                     `gorm:"not null" json:"target_type"` // course | batch | student
	TargetID       string                     `gorm:"not null;index" json:"target_id"`
	TotalAmount    float64                    `gorm:"not null" json:"total_amount"`
	IsActive       bool                       `gorm:"default:true" json:"is_active"`
	Installments   []FeeAllocationInstallment `gorm:"foreignKey:FeeAllocationID" json:"installments,omitempty"`
	CreatedBy      string                     `json:"created_by"`
	CreatedAt      time.Time                  `json:"created_at"`
}

func (f *FeeAllocation) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}

// FeeAllocationInstallment is one slot of an allocation's payment schedule.
// Auto-generated from the structure and frequency; editable until payments
// are recorded. Amounts must add up to the allocation total.
type FeeAllocationInstallment struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	TenantID        string    `gorm:"not null;index" json:"tenant_id"`
	FeeAllocationID string    `gorm:"not null;index" json:"fee_allocation_id"`
	Sequence        int       `gorm:"not null" json:"sequence"`
	Label           string    `gorm:"not null" json:"label"`
	YearNumber      int       `gorm:"default:0" json:"year_number"` // course year this slot belongs to (0 = n/a)
	DueDate         time.Time `json:"due_date"`
	Amount          float64   `gorm:"not null" json:"amount"`
	CreatedAt       time.Time `json:"created_at"`
}

func (f *FeeAllocationInstallment) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}
