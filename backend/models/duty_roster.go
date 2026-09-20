package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DutyRoster is a general staff shift roster, generalized from
// ClinicianSchedule (models/clinician_schedule.go) so any employee role — not
// just clinicians — can be shift-planned. ClinicianSchedule stays as-is
// (appointment booking still reads it, and it's a recurring weekly window);
// DutyRoster is a superset for one-off dated shifts, so it's a new model
// rather than a migration of the old one.
type DutyRoster struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	EmployeeID string   `gorm:"not null;index" json:"employee_id"`
	Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`

	// A dated shift (not a recurring weekly window) so real rosters with
	// day-off patterns and swaps are expressible.
	Date      string `gorm:"not null;index" json:"date"` // YYYY-MM-DD
	ShiftName string `json:"shift_name"`                 // Morning | Evening | Night | custom
	StartTime string `gorm:"not null" json:"start_time"` // HH:MM
	EndTime   string `gorm:"not null" json:"end_time"`
	Location  string `json:"location"` // ward / desk / dept
	Notes     string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (d *DutyRoster) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}
