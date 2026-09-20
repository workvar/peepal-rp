package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateHostelBlockRequest struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Floors int    `json:"floors"`
}

type CreateHostelRoomRequest struct {
	BlockID    string  `json:"block_id"`
	RoomNumber string  `json:"room_number"`
	Floor      int     `json:"floor"`
	Capacity   int     `json:"capacity"`
	RoomType   string  `json:"room_type"`
	MonthlyFee float64 `json:"monthly_fee"`
}

type UpdateHostelRoomRequest struct {
	RoomNumber string  `json:"room_number"`
	Floor      int     `json:"floor"`
	Capacity   int     `json:"capacity"`
	RoomType   string  `json:"room_type"`
	Status     string  `json:"status"`
	MonthlyFee float64 `json:"monthly_fee"`
}

type AllocateHostelRequest struct {
	StudentID string `json:"student_id"`
	RoomID    string `json:"room_id"`
	AllocDate string `json:"alloc_date"` // YYYY-MM-DD
}

type VacateHostelRequest struct {
	VacateDate string `json:"vacate_date"` // YYYY-MM-DD
}

// ────────────────── Hostel Blocks ──────────────────

// BulkDeleteHostelBlocks deletes multiple hostel blocks by ID (admin only).
func BulkDeleteHostelBlocks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.BodyParser(&req); err != nil || len(req.IDs) == 0 {
		return utils.BadRequest(c, "Provide at least one ID")
	}
	result := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND id IN ?", tenantID, req.IDs).Delete(&models.HostelBlock{})
	return utils.OK(c, fiber.Map{"deleted": result.RowsAffected}, fmt.Sprintf("%d block(s) deleted", result.RowsAffected))
}

// ListHostelBlocks returns all hostel blocks
func ListHostelBlocks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var blocks []models.HostelBlock
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Order("name asc").Find(&blocks)
	return utils.OK(c, blocks, "")
}

// CreateHostelBlock creates a new hostel block
func CreateHostelBlock(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateHostelBlockRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name == "" || req.Type == "" || req.Floors == 0 {
		return utils.BadRequest(c, "Name, type, and floors are required")
	}

	block := models.HostelBlock{
		TenantID: tenantID,
		Name:     req.Name,
		Type:     req.Type,
		Floors:   req.Floors,
	}

	if err := database.DB.WithContext(c.Context()).Create(&block).Error; err != nil {
		return utils.InternalError(c, "Could not create hostel block")
	}

	return utils.Created(c, block, "Hostel block created successfully")
}

// ────────────────── Hostel Rooms ──────────────────

// ListHostelRooms returns all hostel rooms
func ListHostelRooms(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var rooms []models.HostelRoom
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Block")

	if blockID := c.Query("block_id"); blockID != "" {
		query = query.Where("block_id = ?", blockID)
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("block_id, room_number asc").Find(&rooms)
	return utils.OK(c, rooms, "")
}

// CreateHostelRoom creates a new hostel room
func CreateHostelRoom(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateHostelRoomRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.BlockID == "" || req.RoomNumber == "" || req.Capacity == 0 || req.MonthlyFee <= 0 {
		return utils.BadRequest(c, "BlockID, room_number, capacity, and monthly_fee are required")
	}

	// Verify block exists
	var block models.HostelBlock
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.BlockID, tenantID).First(&block).Error; err != nil {
		return utils.BadRequest(c, "Hostel block not found")
	}

	room := models.HostelRoom{
		TenantID:    tenantID,
		BlockID:     req.BlockID,
		RoomNumber:  req.RoomNumber,
		Floor:       req.Floor,
		Capacity:    req.Capacity,
		Occupied:    0,
		RoomType:    req.RoomType,
		Status:      "available",
		MonthlyFee:  req.MonthlyFee,
	}

	if err := database.DB.WithContext(c.Context()).Create(&room).Error; err != nil {
		return utils.InternalError(c, "Could not create hostel room")
	}

	room.Block = block
	return utils.Created(c, room, "Hostel room created successfully")
}

// UpdateHostelRoom updates a hostel room
func UpdateHostelRoom(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var room models.HostelRoom
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&room).Error; err != nil {
		return utils.NotFound(c, "Hostel room not found")
	}

	var req UpdateHostelRoomRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.RoomNumber != "" {
		room.RoomNumber = req.RoomNumber
	}
	if req.Floor > 0 {
		room.Floor = req.Floor
	}
	if req.Capacity > 0 {
		room.Capacity = req.Capacity
	}
	if req.RoomType != "" {
		room.RoomType = req.RoomType
	}
	if req.Status != "" {
		room.Status = req.Status
	}
	if req.MonthlyFee > 0 {
		room.MonthlyFee = req.MonthlyFee
	}

	if err := database.DB.WithContext(c.Context()).Save(&room).Error; err != nil {
		return utils.InternalError(c, "Could not update hostel room")
	}

	database.DB.WithContext(c.Context()).Preload("Block").First(&room, "id = ?", id)
	return utils.OK(c, room, "Hostel room updated successfully")
}

// ────────────────── Hostel Allocations ──────────────────

// ListHostelAllocations returns all hostel allocations
func ListHostelAllocations(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var allocations []models.HostelAllocation
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("Student").
		Preload("Room").
		Preload("Room.Block")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("alloc_date desc").Find(&allocations)
	return utils.OK(c, allocations, "")
}

// AllocateHostelRoom allocates a hostel room to a student
func AllocateHostelRoom(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req AllocateHostelRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.StudentID == "" || req.RoomID == "" || req.AllocDate == "" {
		return utils.BadRequest(c, "StudentID, room_id, and alloc_date are required")
	}

	// Verify student exists
	var student models.Student
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.StudentID, tenantID).First(&student).Error; err != nil {
		return utils.BadRequest(c, "Student not found")
	}

	// Verify room exists
	var room models.HostelRoom
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.RoomID, tenantID).First(&room).Error; err != nil {
		return utils.BadRequest(c, "Hostel room not found")
	}

	// Check if room is full
	if room.Occupied >= room.Capacity {
		return utils.BadRequest(c, "Room is full")
	}

	// Parse allocation date
	allocDate, err := time.Parse("2006-01-02", req.AllocDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid alloc_date — use YYYY-MM-DD")
	}

	// Check if student already has active allocation
	var existingAlloc models.HostelAllocation
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND student_id = ? AND status = 'active'", tenantID, req.StudentID).First(&existingAlloc).Error; err == nil {
		return utils.BadRequest(c, "Student already has an active hostel allocation")
	}

	allocation := models.HostelAllocation{
		TenantID:  tenantID,
		StudentID: req.StudentID,
		RoomID:    req.RoomID,
		AllocDate: allocDate,
		Status:    "active",
	}

	if err := database.DB.WithContext(c.Context()).Create(&allocation).Error; err != nil {
		return utils.InternalError(c, "Could not allocate hostel room")
	}

	// Update room occupied count
	room.Occupied++
	if room.Occupied >= room.Capacity {
		room.Status = "full"
	}
	if err := database.DB.WithContext(c.Context()).Save(&room).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	allocation.Student = student
	allocation.Room = room
	return utils.Created(c, allocation, "Hostel room allocated successfully")
}

// VacateHostelRoom vacates a hostel room for a student
func VacateHostelRoom(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	allocationID := c.Params("id")

	var allocation models.HostelAllocation
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", allocationID, tenantID).First(&allocation).Error; err != nil {
		return utils.NotFound(c, "Hostel allocation not found")
	}

	var req VacateHostelRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.VacateDate == "" {
		return utils.BadRequest(c, "VacateDate is required")
	}

	vacateDate, err := time.Parse("2006-01-02", req.VacateDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid vacate_date — use YYYY-MM-DD")
	}

	allocation.VacateDate = &vacateDate
	allocation.Status = "vacated"

	if err := database.DB.WithContext(c.Context()).Save(&allocation).Error; err != nil {
		return utils.InternalError(c, "Could not vacate hostel room")
	}

	// Update room occupied count
	var room models.HostelRoom
	if err := database.DB.WithContext(c.Context()).Where("id = ?", allocation.RoomID).First(&room).Error; err == nil {
		room.Occupied--
		if room.Occupied < room.Capacity {
			room.Status = "available"
		}
		if err := database.DB.WithContext(c.Context()).Save(&room).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
	}

	database.DB.WithContext(c.Context()).Preload("Student").Preload("Room").First(&allocation, "id = ?", allocationID)
	return utils.OK(c, allocation, "Hostel room vacated successfully")
}
