package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Emergency / Triage — healthcare industry, Phase 4. Walk-in emergency cases
// scored by acuity and tracked to a disposition.

// Triage case statuses.
const (
	TriageWaiting     = "waiting"
	TriageInTreatment = "in_treatment"
	TriageDisposed    = "disposed"
)

// Triage acuity levels (ESI-style 1=most urgent … 5=least). Frontend maps these
// to red/orange/yellow/green/blue.
const (
	TriageLevelResuscitation = 1
	TriageLevelEmergent      = 2
	TriageLevelUrgent        = 3
	TriageLevelLessUrgent    = 4
	TriageLevelNonUrgent     = 5
)

// TriageCase is one emergency-department presentation.
type TriageCase struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// ArrivalTime defaults to now (RFC3339).
	ArrivalTime    time.Time `gorm:"index" json:"arrival_time"`
	ChiefComplaint string    `json:"chief_complaint"`
	// TriageLevel 1..5; lower = more acute.
	TriageLevel int    `gorm:"default:3;index" json:"triage_level"`
	// Vitals is a free-form JSON object string, like Encounter.Vitals.
	Vitals string `gorm:"type:text" json:"vitals"`

	AssignedClinicianID string   `gorm:"index" json:"assigned_clinician_id"`
	AssignedClinician   Employee `gorm:"foreignKey:AssignedClinicianID" json:"assigned_clinician,omitempty"`

	// Status: waiting | in_treatment | disposed.
	Status string `gorm:"default:'waiting';index" json:"status"`
	// Disposition: admitted | discharged | referred | lwbs | deceased (set when disposed).
	Disposition string `json:"disposition"`
	Notes       string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (t *TriageCase) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	if t.ArrivalTime.IsZero() {
		t.ArrivalTime = time.Now()
	}
	return nil
}
