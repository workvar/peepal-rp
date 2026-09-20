package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// floatPtr returns a pointer to v, for Field.Min / Field.Max bounds.
func floatPtr(v float64) *float64 { return &v }

var hostelRoomsSchema = &Schema{
	Resource:    "hostel_rooms",
	Title:       "Hostel Rooms",
	Description: "Create hostel rooms in bulk. Each row defines one room inside an existing block. Reference the block by its name (for example Block A) or its ID.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "block", Label: "Block", Type: FieldString, Required: true,
			Description: "Name (for example Block A) or ID of the block this room belongs to. The block must already exist.",
			Example:     "Block A",
		},
		{
			Name: "room_number", Label: "Room Number", Type: FieldString, Required: true,
			Description: "Room number, unique within its block.",
			Example:     "101",
		},
		{
			Name: "floor", Label: "Floor", Type: FieldInt, Required: true,
			Description: "Floor the room is on. Use 0 for the ground floor.",
			Min:         floatPtr(0),
			Example:     "1",
		},
		{
			Name: "capacity", Label: "Capacity", Type: FieldInt, Required: true,
			Description: "Number of beds in the room. Must be at least 1.",
			Min:         floatPtr(1),
			Example:     "4",
		},
		{
			Name: "room_type", Label: "Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"single", "shared", "deluxe"},
			Description:   "Room category. Matches the options on the New Room form.",
			Example:       "shared",
		},
		{
			Name: "class", Label: "Room Class", Type: FieldString,
			Description: "Optional. Name (for example 3-Sharing AC) or ID of a room class to link this room to. The room inherits the class rate unless a rate override is given below.",
		},
		{
			Name: "rate_type", Label: "Rate Override Type", Type: FieldEnum,
			AllowedValues: []string{"monthly", "semester", "annual"},
			Description:   "Optional per-room rate override. Leave blank to inherit the class rate, or to fall back to the monthly fee.",
		},
		{
			Name: "rate_amount", Label: "Rate Override Amount", Type: FieldFloat,
			Description: "Amount for the rate override, in the unit named by rate_type. Only used when rate_type is set.",
			Min:         floatPtr(0),
		},
		{
			Name: "monthly_fee", Label: "Monthly Fee (fallback)", Type: FieldFloat,
			Description: "Fallback fee, used only when the room has no class and no rate override.",
			Min:         floatPtr(0),
			Example:     "5000",
		},
	},
	Create: createHostelRoomRow,
}

func createHostelRoomRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	blockID, err := resolveHostelBlockID(ctx.TenantID, row["block"])
	if err != nil {
		return "", err
	}

	roomNumber := strings.TrimSpace(row["room_number"])
	if roomNumber == "" {
		return "", errors.New("room_number is required")
	}

	capacity := ParseInt(row["capacity"])
	if capacity < 1 {
		return "", errors.New("capacity must be at least 1")
	}

	// Optional room class link (by name or ID).
	classID, err := resolveRoomClassID(ctx.TenantID, row["class"])
	if err != nil {
		return "", err
	}

	// Optional per-room rate override.
	rateType := strings.ToLower(strings.TrimSpace(row["rate_type"]))
	if rateType != "" {
		switch rateType {
		case "monthly", "semester", "annual":
		default:
			return "", errors.New("rate_type must be monthly, semester, or annual")
		}
	}

	// Reject duplicates so re-running an upload does not create copies.
	var existing models.HostelRoom
	if err := database.DB.
		Where("tenant_id = ? AND block_id = ? AND room_number = ?", ctx.TenantID, blockID, roomNumber).
		First(&existing).Error; err == nil {
		return "", errors.New("a room with this number already exists in the block: " + roomNumber)
	}

	rm := models.HostelRoom{
		TenantID:   ctx.TenantID,
		BlockID:    blockID,
		RoomNumber: roomNumber,
		Floor:      ParseInt(row["floor"]),
		Capacity:   capacity,
		Occupied:   0,
		RoomType:   strings.ToLower(strings.TrimSpace(row["room_type"])),
		Status:     "available",
		MonthlyFee: ParseFloat(row["monthly_fee"]),
		RateType:   rateType,
		RateAmount: ParseFloat(row["rate_amount"]),
	}
	if classID != "" {
		rm.RoomClassID = &classID
	}
	if err := database.DB.Create(&rm).Error; err != nil {
		return "", err
	}
	return rm.ID, nil
}

func init() { Register(hostelRoomsSchema) }
