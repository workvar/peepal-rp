package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Appointment statuses.
const (
	AppointmentScheduled = "scheduled"
	AppointmentCompleted = "completed"
	AppointmentCancelled = "cancelled"
	AppointmentNoShow    = "no_show"
)

// Appointment is a booked consultation slot between a patient and a clinician
// (an Employee — hospitals keep doctors/nurses in the employee module, which
// healthcare terminology relabels to "Clinicians").
type Appointment struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// ClinicianID references the Employee acting as the consulting clinician.
	ClinicianID string   `gorm:"not null;index" json:"clinician_id"`
	Clinician   Employee `gorm:"foreignKey:ClinicianID" json:"clinician,omitempty"`

	// DepartmentID optionally scopes the appointment to a hospital department
	// (Cardiology, OPD, …) reusing the shared Department model.
	DepartmentID string     `gorm:"index" json:"department_id"`
	Department   Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`

	// Date is YYYY-MM-DD; StartTime/EndTime are HH:MM (24h), matching how the
	// timetable module stores times.
	Date      string `gorm:"not null;index" json:"date"`
	StartTime string `gorm:"not null" json:"start_time"`
	EndTime   string `json:"end_time"`

	Reason string `json:"reason"`
	Notes  string `json:"notes"`
	// ReferredBy records who sent the patient in (a doctor, a camp, "SELF").
	// Free text so walk-ins and external referrers both fit; printed on the
	// OPD slip.
	ReferredBy string `json:"referred_by"`
	// Status: scheduled | completed | cancelled | no_show.
	Status string `gorm:"default:'scheduled';index" json:"status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (a *Appointment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}
