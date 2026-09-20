package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Telemedicine — healthcare industry, Phase 5. Remote video consultations
// scheduled between a patient and a clinician.

// Tele-consult statuses.
const (
	TeleScheduled  = "scheduled"
	TeleInProgress = "in_progress"
	TeleCompleted  = "completed"
	TeleCancelled  = "cancelled"
)

// TeleConsult is one remote consultation.
type TeleConsult struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	ClinicianID string   `gorm:"index" json:"clinician_id"`
	Clinician   Employee `gorm:"foreignKey:ClinicianID" json:"clinician,omitempty"`

	ScheduledAt time.Time `gorm:"index" json:"scheduled_at"`
	MeetingLink string    `json:"meeting_link"`
	Status      string    `gorm:"default:'scheduled';index" json:"status"`
	Reason      string    `json:"reason"`
	Notes       string    `gorm:"type:text" json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (t *TeleConsult) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
