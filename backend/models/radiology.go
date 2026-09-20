package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Radiology — healthcare industry, Phase 3.
//
// A tenant maintains a catalog of imaging studies. Orders are placed from an
// encounter (or standalone) and carry a single study; a radiologist later files
// findings + an impression, which flips the order to reported.

// RadiologyOrder statuses.
const (
	RadOrderOrdered   = "ordered"   // requested
	RadOrderScheduled = "scheduled" // slot booked
	RadOrderCompleted = "completed" // scan done, awaiting report
	RadOrderReported  = "reported"  // findings filed
	RadOrderCancelled = "cancelled"
)

// RadiologyStudy is one catalog entry (a specific imaging study).
type RadiologyStudy struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_radstudy_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_radstudy_code" json:"code"`
	Name     string `gorm:"not null" json:"name"`
	// Modality: xray | ct | mri | ultrasound | mammography | other.
	Modality string  `gorm:"default:'xray'" json:"modality"`
	BodyPart string  `json:"body_part"`
	Price    float64 `gorm:"not null;default:0" json:"price"`
	Active   bool    `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *RadiologyStudy) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// RadiologyOrder is one imaging request with its (later) report.
type RadiologyOrder struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	EncounterID string `gorm:"index" json:"encounter_id"`

	OrderedByID string   `gorm:"index" json:"ordered_by_id"`
	OrderedBy   Employee `gorm:"foreignKey:OrderedByID" json:"ordered_by,omitempty"`

	// Frozen study snapshot.
	StudyID   string  `gorm:"index" json:"study_id"`
	StudyCode string  `json:"study_code"`
	StudyName string  `json:"study_name"`
	Modality  string  `json:"modality"`
	BodyPart  string  `json:"body_part"`
	Price     float64 `json:"price"`

	// OrderDate is YYYY-MM-DD.
	OrderDate string `gorm:"not null;index" json:"order_date"`
	Status    string `gorm:"default:'ordered';index" json:"status"`
	Notes     string `json:"notes"`

	// Report fields, filled when reported.
	Findings     string     `gorm:"type:text" json:"findings"`
	Impression   string     `gorm:"type:text" json:"impression"`
	ReportedByID string     `gorm:"index" json:"reported_by_id"`
	ReportedBy   Employee   `gorm:"foreignKey:ReportedByID" json:"reported_by,omitempty"`
	ReportedAt   *time.Time `json:"reported_at"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (o *RadiologyOrder) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}
