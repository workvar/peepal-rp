package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Encounter statuses.
const (
	EncounterOpen   = "open"
	EncounterClosed = "closed"
)

// Encounter visit types. OPD arrived in Phase 1; IPD and emergency in Phase 3.
const (
	VisitOPD       = "opd"
	VisitIPD       = "ipd"
	VisitEmergency = "emergency"
)

// ValidVisitType reports whether v is a known visit type.
func ValidVisitType(v string) bool {
	return v == VisitOPD || v == VisitIPD || v == VisitEmergency
}

// Encounter is one clinical visit (OPD in this phase): what the patient came
// in with, what the clinician found, and what was prescribed. An encounter may
// be linked to the appointment that produced it, or stand alone (walk-in).
type Encounter struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	ClinicianID string   `gorm:"not null;index" json:"clinician_id"`
	Clinician   Employee `gorm:"foreignKey:ClinicianID" json:"clinician,omitempty"`

	// AppointmentID links the booking this visit came from; blank for walk-ins.
	AppointmentID string `gorm:"index" json:"appointment_id"`

	// CRNumber is the per-visit Case Record number, assigned on creation
	// (distinct from the patient's lifetime UHID). Server-assigned, never edited.
	CRNumber string `gorm:"index" json:"cr_number"`

	// VisitType: opd for now; ipd/emergency arrive in later phases.
	VisitType string `gorm:"default:'opd'" json:"visit_type"`
	// VisitDate is YYYY-MM-DD.
	VisitDate string `gorm:"not null;index" json:"visit_date"`

	ChiefComplaint string `json:"chief_complaint"`
	Diagnosis      string `json:"diagnosis"`
	// Vitals is a free-form JSON object (e.g. {"bp":"120/80","pulse":72,
	// "temp_c":36.8,"spo2":98,"weight_kg":70}). Stored as text so the shape can
	// evolve without migrations, mirroring Subject.Units.
	Vitals       string `gorm:"type:text" json:"vitals"`
	Prescription string `gorm:"type:text" json:"prescription"`
	Notes        string `gorm:"type:text" json:"notes"`
	FollowUpDate string `json:"follow_up_date"`

	// Status: open | closed.
	Status string `gorm:"default:'open';index" json:"status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *Encounter) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
