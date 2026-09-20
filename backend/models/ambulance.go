package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Ambulance — healthcare industry, Phase 5. Adapts the transport idea (a fleet
// of vehicles) to emergency/patient transport with dispatchable trips.

// Ambulance statuses.
const (
	AmbulanceAvailable   = "available"
	AmbulanceOnTrip      = "on_trip"
	AmbulanceMaintenance = "maintenance"
)

// Ambulance trip statuses.
const (
	TripDispatched = "dispatched"
	TripCompleted  = "completed"
	TripCancelled  = "cancelled"
)

// Ambulance is one vehicle in the fleet.
type Ambulance struct {
	ID           string `gorm:"primaryKey" json:"id"`
	TenantID     string `gorm:"not null;index;uniqueIndex:idx_ambulance_code" json:"tenant_id"`
	Code         string `gorm:"not null;uniqueIndex:idx_ambulance_code" json:"code"`
	Registration string `json:"registration"`
	// VehicleType: basic | als | icu | mortuary.
	VehicleType string    `gorm:"default:'basic'" json:"vehicle_type"`
	DriverName  string    `json:"driver_name"`
	DriverPhone string    `json:"driver_phone"`
	Status      string    `gorm:"default:'available';index" json:"status"`
	Active      bool      `gorm:"default:true" json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a *Ambulance) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// AmbulanceTrip is one dispatch of a vehicle.
type AmbulanceTrip struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	AmbulanceID string    `gorm:"not null;index" json:"ambulance_id"`
	Ambulance   Ambulance `gorm:"foreignKey:AmbulanceID" json:"ambulance,omitempty"`

	// PatientID optional (a trip may be a relocation with no patient yet).
	PatientID string  `gorm:"index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// TripType: pickup | transfer | discharge | other.
	TripType    string `gorm:"default:'pickup'" json:"trip_type"`
	Origin      string `json:"origin"`
	Destination string `json:"destination"`

	DispatchTime time.Time  `gorm:"index" json:"dispatch_time"`
	ReturnTime   *time.Time `json:"return_time"`
	Status       string     `gorm:"default:'dispatched';index" json:"status"`
	Notes        string     `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (t *AmbulanceTrip) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	if t.DispatchTime.IsZero() {
		t.DispatchTime = time.Now()
	}
	return nil
}
