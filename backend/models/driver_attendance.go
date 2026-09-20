package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DriverAttendance is a transport-specific day sheet for the employee driving
// a vehicle (Phase 6c). It is not folded into the generic Attendance model
// because it carries the vehicle the driver signed on to, which the generic
// entity_id/entity_type row has nowhere to put.
type DriverAttendance struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"tenant_id"`

	EmployeeID string   `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"employee_id"`
	Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`

	VehicleID string           `gorm:"index" json:"vehicle_id"`
	Vehicle   TransportVehicle `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`

	Date       string `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"date"` // YYYY-MM-DD
	CheckInAt  string `json:"check_in_at"`                                               // HH:MM
	CheckOutAt string `json:"check_out_at"`                                              // HH:MM
	Status     string `gorm:"default:'present'" json:"status"`                           // present | absent | leave

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (d *DriverAttendance) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}
