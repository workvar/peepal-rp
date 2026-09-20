package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
)

// isUUID reports whether s parses as a UUID. The hostel CSVs accept either a
// human-friendly natural key (block name, roll number, room number) or the
// record's raw UUID; this is how a cell is classified between the two.
func isUUID(s string) bool {
	_, err := uuid.Parse(strings.TrimSpace(s))
	return err == nil
}

// resolveHostelBlockID maps a "block" cell to a block ID within the tenant.
// Accepts the block UUID or its name (case-insensitive).
func resolveHostelBlockID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("block is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(name) = LOWER(?)", value)
	}
	var block models.HostelBlock
	if err := q.First(&block).Error; err != nil {
		return "", errors.New("hostel block not found: " + value)
	}
	return block.ID, nil
}

// resolveStudentID maps a "student" cell to a student ID within the tenant.
// Accepts the student UUID or roll number (case-insensitive).
func resolveStudentID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("student is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(roll_number) = LOWER(?)", value)
	}
	var student models.Student
	if err := q.First(&student).Error; err != nil {
		return "", errors.New("student not found: " + value)
	}
	return student.ID, nil
}

// resolveRoomClassID maps a "class" cell to a room class ID within the tenant.
// Accepts the class UUID or its name (case-insensitive). Returns "" with no
// error when the cell is blank, since linking a class is optional.
func resolveRoomClassID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(name) = LOWER(?)", value)
	}
	var rc models.RoomClass
	if err := q.First(&rc).Error; err != nil {
		return "", errors.New("room class not found: " + value)
	}
	return rc.ID, nil
}

// resolveHostelRoom finds a room within the tenant from the "block" and
// "room_number" cells. A room UUID in roomCell is used directly (block is then
// ignored); otherwise the room is located by block + room number.
func resolveHostelRoom(tenantID, blockCell, roomCell string) (*models.HostelRoom, error) {
	roomCell = strings.TrimSpace(roomCell)
	if roomCell == "" {
		return nil, errors.New("room_number is required")
	}
	var room models.HostelRoom
	if isUUID(roomCell) {
		if err := database.DB.Where("id = ? AND tenant_id = ?", roomCell, tenantID).First(&room).Error; err != nil {
			return nil, errors.New("hostel room not found: " + roomCell)
		}
		return &room, nil
	}
	blockID, err := resolveHostelBlockID(tenantID, blockCell)
	if err != nil {
		return nil, err
	}
	if err := database.DB.
		Where("tenant_id = ? AND block_id = ? AND room_number = ?", tenantID, blockID, roomCell).
		First(&room).Error; err != nil {
		return nil, errors.New("hostel room not found: " + blockCell + " / " + roomCell)
	}
	return &room, nil
}
