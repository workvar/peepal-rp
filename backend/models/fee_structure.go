package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeeStructure is one fee variation of a course, covering the entire course
// duration (e.g. "B.Tech CSE — Regular", "B.Tech CSE — NRI Quota",
// "B.Tech CSE — 2026 Scholarship"). Structures are grouped by course in the
// UI. Each line item is a fee category amount for one year of the course.
// An optional batch ties the variation to a specific intake.
type FeeStructure struct {
	ID          string             `gorm:"primaryKey" json:"id"`
	TenantID    string             `gorm:"not null;index;uniqueIndex:idx_fee_struct_code" json:"tenant_id"`
	CourseID    string             `gorm:"not null;index" json:"course_id"`
	Course      Course             `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	Name        string             `gorm:"not null" json:"name"` // variation name, e.g. Regular / NRI / Scholarship
	Code        string             `gorm:"not null;uniqueIndex:idx_fee_struct_code" json:"code"`
	BatchID     *string            `gorm:"index" json:"batch_id"` // optional intake batch
	Batch       *CourseBatch       `gorm:"foreignKey:BatchID" json:"batch,omitempty"`
	Description string             `json:"description"`
	IsActive    bool               `gorm:"default:true" json:"is_active"`
	Items       []FeeStructureItem `gorm:"foreignKey:FeeStructureID" json:"items,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
}

func (f *FeeStructure) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}

// FeeStructureItem is one line of a structure: a fee category amount for one
// year of the course (YearNumber is 1-based).
type FeeStructureItem struct {
	ID             string      `gorm:"primaryKey" json:"id"`
	TenantID       string      `gorm:"not null;index" json:"tenant_id"`
	FeeStructureID string      `gorm:"not null;index" json:"fee_structure_id"`
	FeeCategoryID  string      `gorm:"not null;index" json:"fee_category_id"`
	FeeCategory    FeeCategory `gorm:"foreignKey:FeeCategoryID" json:"fee_category,omitempty"`
	YearNumber     int         `gorm:"not null;default:1" json:"year_number"`
	Amount         float64     `gorm:"not null" json:"amount"`
	CreatedAt      time.Time   `json:"created_at"`
}

func (f *FeeStructureItem) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}
