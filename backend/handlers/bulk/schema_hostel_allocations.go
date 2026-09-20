package bulk

import (
	"errors"

	"collegeerp/database"
	"collegeerp/models"

	"gorm.io/gorm"
)

var hostelAllocationsSchema = &Schema{
	Resource:    "hostel_allocations",
	Title:       "Hostel Allocations",
	Description: "Allocate students to hostel rooms in bulk. Each row assigns one student to one room and increments that room's occupancy. Full rooms, and students who already hold an active allocation, are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "student", Label: "Student (Roll No. or ID)", Type: FieldString, Required: true,
			Description: "Roll number (for example CS2021001) or ID of the student being allocated.",
			Example:     "CS2021001",
		},
		{
			Name: "block", Label: "Block", Type: FieldString,
			Description: "Name or ID of the room's block. Required unless room_number holds a room ID.",
			Example:     "Block A",
		},
		{
			Name: "room_number", Label: "Room Number", Type: FieldString, Required: true,
			Description: "Room number within the block, or the room's ID (in which case block may be left blank).",
			Example:     "101",
		},
		{
			Name: "alloc_date", Label: "Allocation Date", Type: FieldDate, Required: true,
			Description: "Date the allocation starts, formatted YYYY-MM-DD.",
			Example:     "2026-06-01",
		},
	},
	Create: createHostelAllocationRow,
}

func createHostelAllocationRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	studentID, err := resolveStudentID(ctx.TenantID, row["student"])
	if err != nil {
		return "", err
	}

	room, err := resolveHostelRoom(ctx.TenantID, row["block"], row["room_number"])
	if err != nil {
		return "", err
	}
	if room.Occupied >= room.Capacity {
		return "", errors.New("room is full")
	}

	allocDate := ParseDate(row["alloc_date"])
	if allocDate.IsZero() {
		return "", errors.New("alloc_date is required (YYYY-MM-DD)")
	}

	// One active allocation per student, matching the AllocateHostelRoom resolver.
	var existing models.HostelAllocation
	if err := database.DB.
		Where("tenant_id = ? AND student_id = ? AND status = 'active'", ctx.TenantID, studentID).
		First(&existing).Error; err == nil {
		return "", errors.New("student already has an active hostel allocation")
	}

	alloc := models.HostelAllocation{
		TenantID:  ctx.TenantID,
		StudentID: studentID,
		RoomID:    room.ID,
		AllocDate: allocDate,
		Status:    "active",
	}

	// Create the allocation and bump room occupancy atomically.
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&alloc).Error; err != nil {
			return err
		}
		room.Occupied++
		if room.Occupied >= room.Capacity {
			room.Status = "full"
		}
		return tx.Save(room).Error
	})
	if err != nil {
		return "", err
	}
	return alloc.ID, nil
}

func init() { Register(hostelAllocationsSchema) }
