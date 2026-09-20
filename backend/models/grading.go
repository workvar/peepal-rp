package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GradingScheme is the per-tenant configuration that decides how subject marks
// roll up into semester and cumulative results. Exactly one row per tenant
// (TenantID is unique). The admin edits it on the Grading page; the student
// portal reads it to render and label results.
//
// Mode selects the primary metric a college reports:
//   - "cgpa" / "gpa"  → grade points (SGPA per semester, CGPA cumulative)
//   - "percentage"    → percentage per semester and overall
//   - "letter"        → letter grade per subject / semester / overall
//   - "pass_fail"     → pass or fail only
//
// The engine always computes every metric; Mode only drives what the UI shows.
type GradingScheme struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;uniqueIndex" json:"tenant_id"`

	Mode          string  `gorm:"not null;default:'cgpa'" json:"mode"`
	GpaMax        float64 `gorm:"not null;default:10" json:"gpa_max"`        // top grade point (10 or 4)
	PassThreshold float64 `gorm:"not null;default:40" json:"pass_threshold"` // min subject % to pass
	Decimals      int     `gorm:"default:2" json:"decimals"`                 // rounding for SGPA/CGPA/%

	// CreditWeighted averages grade points by each subject's Credits (else a
	// plain average). WeightedByExamType combines a subject's assessments using
	// the matched ExamType.Weightage (else a simple obtained/max total).
	CreditWeighted     bool `gorm:"default:true" json:"credit_weighted"`
	WeightedByExamType bool `gorm:"default:true" json:"weighted_by_exam_type"`

	Bands     []GradeBand `gorm:"foreignKey:SchemeID" json:"bands"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

func (g *GradingScheme) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	return nil
}

// GradeBand is one row of the grade scale: a percentage range mapped to a
// letter, a grade point, and whether it counts as a pass. A subject's percentage
// falls into the band where MinPercent <= pct <= MaxPercent.
type GradeBand struct {
	ID         string  `gorm:"primaryKey" json:"id"`
	SchemeID   string  `gorm:"not null;index" json:"scheme_id"`
	TenantID   string  `gorm:"not null;index" json:"tenant_id"`
	Letter     string  `gorm:"not null" json:"letter"`
	MinPercent float64 `gorm:"not null" json:"min_percent"`
	MaxPercent float64 `gorm:"not null" json:"max_percent"`
	GradePoint float64 `json:"grade_point"`
	IsPass     bool    `gorm:"default:true" json:"is_pass"`
	SortOrder  int     `json:"sort_order"`
}

func (b *GradeBand) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
