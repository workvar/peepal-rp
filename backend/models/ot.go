package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OT scheduling — healthcare industry, Phase 4. Operation theatres and the
// surgeries booked into them (no overlapping bookings per theatre).

// Surgery statuses.
const (
	SurgeryScheduled  = "scheduled"
	SurgeryInProgress = "in_progress"
	SurgeryCompleted  = "completed"
	SurgeryCancelled  = "cancelled"
)

// OperationTheatre is a bookable OT room.
type OperationTheatre struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;index;uniqueIndex:idx_ot_code" json:"tenant_id"`
	Code      string    `gorm:"not null;uniqueIndex:idx_ot_code" json:"code"`
	Name      string    `gorm:"not null" json:"name"`
	Location  string    `json:"location"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (o *OperationTheatre) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}

// SurgerySchedule is one booking of a theatre for a patient's procedure.
type SurgerySchedule struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	TheatreID string           `gorm:"not null;index" json:"theatre_id"`
	Theatre   OperationTheatre `gorm:"foreignKey:TheatreID" json:"theatre,omitempty"`

	SurgeonID string   `gorm:"index" json:"surgeon_id"`
	Surgeon   Employee `gorm:"foreignKey:SurgeonID" json:"surgeon,omitempty"`

	ProcedureName  string `gorm:"not null" json:"procedure_name"`
	AnesthesiaType string `json:"anesthesia_type"`

	// ScheduledDate is YYYY-MM-DD; times are HH:MM.
	ScheduledDate string `gorm:"not null;index" json:"scheduled_date"`
	StartTime     string `gorm:"not null" json:"start_time"`
	EndTime       string `gorm:"not null" json:"end_time"`

	Status string `gorm:"default:'scheduled';index" json:"status"`
	Notes  string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *SurgerySchedule) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
