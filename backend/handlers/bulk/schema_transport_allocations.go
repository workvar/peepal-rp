package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var transportAllocationsSchema = &Schema{
	Resource:    "transport_allocations",
	Title:       "Transport Allocations",
	Description: "Assign students to transport vehicles in bulk. Each row links one student to one vehicle from a given start date. Students who already hold an active transport allocation are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "student", Label: "Student (Roll No. or ID)", Type: FieldString, Required: true,
			Description: "Roll number (for example CS2021001) or ID of the student being allocated.",
			Example:     "CS2021001",
		},
		{
			Name: "vehicle", Label: "Vehicle (Number or ID)", Type: FieldString, Required: true,
			Description: "Vehicle number (for example MH01AB1234) or ID of the vehicle to assign.",
			Example:     "MH01AB1234",
		},
		{
			Name: "start_date", Label: "Start Date", Type: FieldDate, Required: true,
			Description: "Date the allocation starts, formatted YYYY-MM-DD.",
			Example:     "2026-06-01",
		},
		{
			Name: "pickup_stop", Label: "Pickup Stop", Type: FieldString,
			Description: "Optional. Stop where the student boards.",
			Example:     "Park Road",
		},
	},
	Create: createTransportAllocationRow,
}

func createTransportAllocationRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	studentID, err := resolveStudentID(ctx.TenantID, row["student"])
	if err != nil {
		return "", err
	}

	vehicle, err := resolveTransportVehicle(ctx.TenantID, row["vehicle"])
	if err != nil {
		return "", err
	}

	startDate := ParseDate(row["start_date"])
	if startDate.IsZero() {
		return "", errors.New("start_date is required (YYYY-MM-DD)")
	}

	// One active allocation per student, matching the AllocateTransportVehicle
	// resolver and the partial unique index on transport_allocations.
	var existing models.TransportAllocation
	if err := database.DB.
		Where("tenant_id = ? AND student_id = ? AND status = 'active'", ctx.TenantID, studentID).
		First(&existing).Error; err == nil {
		return "", errors.New("student already has an active transport allocation")
	}

	alloc := models.TransportAllocation{
		TenantID:   ctx.TenantID,
		AllocType:  "student",
		StudentID:  studentID,
		VehicleID:  vehicle.ID,
		PickupStop: strings.TrimSpace(row["pickup_stop"]),
		StartDate:  startDate,
		Status:     "active",
	}
	if err := database.DB.Create(&alloc).Error; err != nil {
		return "", err
	}
	return alloc.ID, nil
}

func init() { Register(transportAllocationsSchema) }
