package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var transportVehiclesSchema = &Schema{
	Resource:    "transport_vehicles",
	Title:       "Transport Vehicles",
	Description: "Add transport vehicles in bulk. Each row defines one vehicle and links it to an existing route by name or ID. Vehicle numbers must be unique — duplicates are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "vehicle_number", Label: "Vehicle Number", Type: FieldString, Required: true,
			Description: "Unique registration number, for example MH01AB1234.",
			Example:     "MH01AB1234",
		},
		{
			Name: "vehicle_type", Label: "Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"bus", "van", "minibus", "auto"},
			Description:   "Vehicle category. Matches the options on the New Vehicle form.",
			Example:       "bus",
		},
		{
			Name: "capacity", Label: "Capacity", Type: FieldInt, Required: true,
			Description: "Number of seats. Must be at least 1.",
			Min:         floatPtr(1),
			Example:     "40",
		},
		{
			Name: "route", Label: "Route", Type: FieldString, Required: true,
			Description: "Name (for example Route A) or ID of the route this vehicle runs. The route must already exist.",
			Example:     "Route A",
		},
		{
			Name: "driver_name", Label: "Driver Name", Type: FieldString,
			Example: "Ramesh Kumar",
		},
		{
			Name: "driver_phone", Label: "Driver Phone", Type: FieldString,
			Example: "+91-9876543210",
		},
		{
			Name: "status", Label: "Status", Type: FieldEnum,
			AllowedValues: []string{"active", "maintenance", "inactive"},
			Description:   "Optional. Defaults to 'active' when blank.",
			Example:       "active",
		},
	},
	Create: createTransportVehicleRow,
}

func createTransportVehicleRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	vehicleNumber := strings.TrimSpace(row["vehicle_number"])
	if vehicleNumber == "" {
		return "", errors.New("vehicle_number is required")
	}

	capacity := ParseInt(row["capacity"])
	if capacity < 1 {
		return "", errors.New("capacity must be at least 1")
	}

	routeID, err := resolveTransportRouteID(ctx.TenantID, row["route"])
	if err != nil {
		return "", err
	}

	// Reject duplicates so re-running an upload does not create copies. Backed
	// by the (tenant_id, vehicle_number) unique index on TransportVehicle.
	var existing models.TransportVehicle
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(vehicle_number) = LOWER(?)", ctx.TenantID, vehicleNumber).
		First(&existing).Error; err == nil {
		return "", errors.New("a vehicle with this number already exists: " + vehicleNumber)
	}

	status := strings.ToLower(strings.TrimSpace(row["status"]))
	if status == "" {
		status = "active"
	}

	v := models.TransportVehicle{
		TenantID:      ctx.TenantID,
		VehicleNumber: vehicleNumber,
		VehicleType:   strings.ToLower(strings.TrimSpace(row["vehicle_type"])),
		Capacity:      capacity,
		DriverName:    strings.TrimSpace(row["driver_name"]),
		DriverPhone:   strings.TrimSpace(row["driver_phone"]),
		RouteID:       routeID,
		Status:        status,
	}
	if err := database.DB.Create(&v).Error; err != nil {
		return "", errors.New("could not create vehicle — number may already exist")
	}
	return v.ID, nil
}

func init() { Register(transportVehiclesSchema) }
