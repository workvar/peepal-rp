package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransportRoute struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	TenantID   string    `gorm:"not null;index;uniqueIndex:idx_route_tenant_name" json:"tenant_id"`
	RouteName  string    `gorm:"not null;uniqueIndex:idx_route_tenant_name" json:"route_name"`
	StartPoint string    `gorm:"not null" json:"start_point"`
	EndPoint   string    `gorm:"not null" json:"end_point"`
	Stops      string    `json:"stops"`    // JSON array of stop names stored as string
	Distance   float64   `json:"distance"` // km
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (tr *TransportRoute) BeforeCreate(tx *gorm.DB) error {
	if tr.ID == "" {
		tr.ID = uuid.NewString()
	}
	return nil
}

type TransportVehicle struct {
	ID            string         `gorm:"primaryKey" json:"id"`
	TenantID      string         `gorm:"not null;index;uniqueIndex:idx_vehicle_tenant_number" json:"tenant_id"`
	VehicleNumber string         `gorm:"not null;uniqueIndex:idx_vehicle_tenant_number" json:"vehicle_number"`
	VehicleType   string         `gorm:"not null" json:"vehicle_type"` // bus, van, auto
	Capacity      int            `gorm:"not null" json:"capacity"`
	DriverName    string         `json:"driver_name"`
	DriverPhone   string         `json:"driver_phone"`
	RouteID       string         `gorm:"not null;index" json:"route_id"`
	Route         TransportRoute `gorm:"foreignKey:RouteID" json:"route"`
	Status        string         `gorm:"default:'active'" json:"status"` // active, maintenance, inactive

	// Live tracking (Phase 6c). Position is whatever the last ping reported;
	// LastPingAt nil means the vehicle has never reported, which the map uses
	// to distinguish "never tracked" from "stale".
	Latitude   float64    `gorm:"default:0" json:"latitude"`
	Longitude  float64    `gorm:"default:0" json:"longitude"`
	LastPingAt *time.Time `json:"last_ping_at"`

	// DriverEmployeeID is the canonical driver link and is what driver
	// attendance keys on. DriverName/DriverPhone above stay for vehicles
	// entered before drivers were employees.
	DriverEmployeeID string   `gorm:"index" json:"driver_employee_id"`
	DriverEmployee   Employee `gorm:"foreignKey:DriverEmployeeID" json:"driver_employee,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (tv *TransportVehicle) BeforeCreate(tx *gorm.DB) error {
	if tv.ID == "" {
		tv.ID = uuid.NewString()
	}
	return nil
}

// TransportAllocation assigns one person to a vehicle. The person is either a
// student or a staff member (employee): exactly one of StudentID / EmployeeID
// is set, and AllocType records which ("student" | "staff"). The unused id is
// stored as an empty string, and the partial unique indexes that enforce
// "one active allocation per person" ignore empty ids (see database.go).
type TransportAllocation struct {
	ID         string           `gorm:"primaryKey" json:"id"`
	TenantID   string           `gorm:"not null;index" json:"tenant_id"`
	AllocType  string           `gorm:"default:'student'" json:"alloc_type"` // student, staff
	StudentID  string           `gorm:"index" json:"student_id"`
	Student    Student          `gorm:"foreignKey:StudentID" json:"student"`
	EmployeeID string           `gorm:"index" json:"employee_id"`
	Employee   Employee         `gorm:"foreignKey:EmployeeID" json:"employee"`
	VehicleID  string           `gorm:"not null;index" json:"vehicle_id"`
	Vehicle    TransportVehicle `gorm:"foreignKey:VehicleID" json:"vehicle"`
	PickupStop string           `json:"pickup_stop"`
	StartDate  time.Time        `gorm:"not null" json:"start_date"`
	EndDate    *time.Time       `json:"end_date"`
	Status     string           `gorm:"default:'active'" json:"status"` // active, inactive
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

func (ta *TransportAllocation) BeforeCreate(tx *gorm.DB) error {
	if ta.ID == "" {
		ta.ID = uuid.NewString()
	}
	return nil
}
