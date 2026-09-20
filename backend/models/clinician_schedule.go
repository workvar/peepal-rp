package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ClinicianSchedule is one weekly availability window for a clinician (an
// Employee): "Dr. Rao consults Monday 09:00–13:00 in 15-minute slots".
// Appointment booking validates against these windows when the clinician has
// any active schedule; clinicians without schedules stay freely bookable.
type ClinicianSchedule struct {
	ID          string   `gorm:"primaryKey" json:"id"`
	TenantID    string   `gorm:"not null;index" json:"tenant_id"`
	ClinicianID string   `gorm:"not null;index" json:"clinician_id"`
	Clinician   Employee `gorm:"foreignKey:ClinicianID" json:"clinician,omitempty"`
	// DayOfWeek: 0 = Sunday … 6 = Saturday (matches time.Weekday).
	DayOfWeek int `gorm:"not null" json:"day_of_week"`
	// StartTime/EndTime are HH:MM (24h), same convention as appointments.
	StartTime string `gorm:"not null" json:"start_time"`
	EndTime   string `gorm:"not null" json:"end_time"`
	// SlotMinutes is the default consultation length used to suggest slots.
	SlotMinutes int       `gorm:"not null;default:15" json:"slot_minutes"`
	Active      bool      `gorm:"default:true" json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (s *ClinicianSchedule) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
