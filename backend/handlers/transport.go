package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateTransportRouteRequest struct {
	RouteName  string  `json:"route_name"`
	StartPoint string  `json:"start_point"`
	EndPoint   string  `json:"end_point"`
	Stops      string  `json:"stops"`
	Distance   float64 `json:"distance"`
}

type UpdateTransportRouteRequest struct {
	RouteName  string  `json:"route_name"`
	StartPoint string  `json:"start_point"`
	EndPoint   string  `json:"end_point"`
	Stops      string  `json:"stops"`
	Distance   float64 `json:"distance"`
}

type CreateTransportVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number"`
	VehicleType   string `json:"vehicle_type"`
	Capacity      int    `json:"capacity"`
	DriverName    string `json:"driver_name"`
	DriverPhone   string `json:"driver_phone"`
	RouteID       string `json:"route_id"`
}

type UpdateTransportVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number"`
	VehicleType   string `json:"vehicle_type"`
	Capacity      int    `json:"capacity"`
	DriverName    string `json:"driver_name"`
	DriverPhone   string `json:"driver_phone"`
	RouteID       string `json:"route_id"`
	Status        string `json:"status"`
}

type AllocateTransportRequest struct {
	StudentID  string `json:"student_id"`
	VehicleID  string `json:"vehicle_id"`
	PickupStop string `json:"pickup_stop"`
	StartDate  string `json:"start_date"` // YYYY-MM-DD
}

type RemoveTransportRequest struct {
	EndDate string `json:"end_date"` // YYYY-MM-DD
}

// ────────────────── Transport Routes ──────────────────

// ListRoutes returns all transport routes
func ListRoutes(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var routes []models.TransportRoute
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Order("route_name asc").Find(&routes)
	return utils.OK(c, routes, "")
}

// CreateRoute creates a new transport route
func CreateRoute(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateTransportRouteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.RouteName == "" || req.StartPoint == "" || req.EndPoint == "" {
		return utils.BadRequest(c, "RouteName, start_point, and end_point are required")
	}

	route := models.TransportRoute{
		TenantID:   tenantID,
		RouteName:  req.RouteName,
		StartPoint: req.StartPoint,
		EndPoint:   req.EndPoint,
		Stops:      req.Stops,
		Distance:   req.Distance,
	}

	if err := database.DB.WithContext(c.Context()).Create(&route).Error; err != nil {
		return utils.InternalError(c, "Could not create transport route")
	}

	return utils.Created(c, route, "Transport route created successfully")
}

// UpdateRoute updates a transport route
func UpdateRoute(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var route models.TransportRoute
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&route).Error; err != nil {
		return utils.NotFound(c, "Transport route not found")
	}

	var req UpdateTransportRouteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.RouteName != "" {
		route.RouteName = req.RouteName
	}
	if req.StartPoint != "" {
		route.StartPoint = req.StartPoint
	}
	if req.EndPoint != "" {
		route.EndPoint = req.EndPoint
	}
	if req.Stops != "" {
		route.Stops = req.Stops
	}
	if req.Distance > 0 {
		route.Distance = req.Distance
	}

	if err := database.DB.WithContext(c.Context()).Save(&route).Error; err != nil {
		return utils.InternalError(c, "Could not update transport route")
	}

	return utils.OK(c, route, "Transport route updated successfully")
}

// DeleteRoute deletes a transport route
func DeleteRoute(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var route models.TransportRoute
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&route).Error; err != nil {
		return utils.NotFound(c, "Transport route not found")
	}

	if err := database.DB.WithContext(c.Context()).Delete(&route).Error; err != nil {
		return utils.InternalError(c, "Could not delete transport route")
	}

	return utils.OK(c, nil, "Transport route deleted successfully")
}

// ────────────────── Transport Vehicles ──────────────────

// ListVehicles returns all transport vehicles
func ListVehicles(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var vehicles []models.TransportVehicle
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("Route")

	if routeID := c.Query("route_id"); routeID != "" {
		query = query.Where("route_id = ?", routeID)
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("vehicle_number asc").Find(&vehicles)
	return utils.OK(c, vehicles, "")
}

// CreateVehicle creates a new transport vehicle
func CreateVehicle(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateTransportVehicleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.VehicleNumber == "" || req.VehicleType == "" || req.Capacity == 0 || req.RouteID == "" {
		return utils.BadRequest(c, "VehicleNumber, vehicle_type, capacity, and route_id are required")
	}

	// Verify route exists
	var route models.TransportRoute
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.RouteID, tenantID).First(&route).Error; err != nil {
		return utils.BadRequest(c, "Transport route not found")
	}

	vehicle := models.TransportVehicle{
		TenantID:      tenantID,
		VehicleNumber: req.VehicleNumber,
		VehicleType:   req.VehicleType,
		Capacity:      req.Capacity,
		DriverName:    req.DriverName,
		DriverPhone:   req.DriverPhone,
		RouteID:       req.RouteID,
		Status:        "active",
	}

	if err := database.DB.WithContext(c.Context()).Create(&vehicle).Error; err != nil {
		return utils.InternalError(c, "Could not create transport vehicle")
	}

	vehicle.Route = route
	return utils.Created(c, vehicle, "Transport vehicle created successfully")
}

// UpdateVehicle updates a transport vehicle
func UpdateVehicle(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var vehicle models.TransportVehicle
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&vehicle).Error; err != nil {
		return utils.NotFound(c, "Transport vehicle not found")
	}

	var req UpdateTransportVehicleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.VehicleNumber != "" {
		vehicle.VehicleNumber = req.VehicleNumber
	}
	if req.VehicleType != "" {
		vehicle.VehicleType = req.VehicleType
	}
	if req.Capacity > 0 {
		vehicle.Capacity = req.Capacity
	}
	if req.DriverName != "" {
		vehicle.DriverName = req.DriverName
	}
	if req.DriverPhone != "" {
		vehicle.DriverPhone = req.DriverPhone
	}
	if req.RouteID != "" {
		vehicle.RouteID = req.RouteID
	}
	if req.Status != "" {
		vehicle.Status = req.Status
	}

	if err := database.DB.WithContext(c.Context()).Save(&vehicle).Error; err != nil {
		return utils.InternalError(c, "Could not update transport vehicle")
	}

	database.DB.WithContext(c.Context()).Preload("Route").First(&vehicle, "id = ?", id)
	return utils.OK(c, vehicle, "Transport vehicle updated successfully")
}

// DeleteVehicle deletes a transport vehicle
func DeleteVehicle(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var vehicle models.TransportVehicle
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&vehicle).Error; err != nil {
		return utils.NotFound(c, "Transport vehicle not found")
	}

	if err := database.DB.WithContext(c.Context()).Delete(&vehicle).Error; err != nil {
		return utils.InternalError(c, "Could not delete transport vehicle")
	}

	return utils.OK(c, nil, "Transport vehicle deleted successfully")
}

// ────────────────── Transport Allocations ──────────────────

// ListTransportAllocations returns all transport allocations
func ListTransportAllocations(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var allocations []models.TransportAllocation
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("Student").
		Preload("Vehicle").
		Preload("Vehicle.Route")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("start_date desc").Find(&allocations)
	return utils.OK(c, allocations, "")
}

// AllocateTransport allocates a vehicle to a student
func AllocateTransport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req AllocateTransportRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.StudentID == "" || req.VehicleID == "" || req.StartDate == "" {
		return utils.BadRequest(c, "StudentID, vehicle_id, and start_date are required")
	}

	// Verify student exists
	var student models.Student
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.StudentID, tenantID).First(&student).Error; err != nil {
		return utils.BadRequest(c, "Student not found")
	}

	// Verify vehicle exists
	var vehicle models.TransportVehicle
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.VehicleID, tenantID).
		Preload("Route").First(&vehicle).Error; err != nil {
		return utils.BadRequest(c, "Transport vehicle not found")
	}

	// Parse start date
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid start_date — use YYYY-MM-DD")
	}

	// Check if student already has active allocation
	var existingAlloc models.TransportAllocation
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND student_id = ? AND status = 'active'", tenantID, req.StudentID).First(&existingAlloc).Error; err == nil {
		return utils.BadRequest(c, "Student already has an active transport allocation")
	}

	allocation := models.TransportAllocation{
		TenantID:   tenantID,
		StudentID:  req.StudentID,
		VehicleID:  req.VehicleID,
		PickupStop: req.PickupStop,
		StartDate:  startDate,
		Status:     "active",
	}

	if err := database.DB.WithContext(c.Context()).Create(&allocation).Error; err != nil {
		return utils.InternalError(c, "Could not allocate transport")
	}

	allocation.Student = student
	allocation.Vehicle = vehicle
	return utils.Created(c, allocation, "Transport allocated successfully")
}

// RemoveTransportAllocation removes a transport allocation from a student
func RemoveTransportAllocation(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	allocationID := c.Params("id")

	var allocation models.TransportAllocation
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", allocationID, tenantID).First(&allocation).Error; err != nil {
		return utils.NotFound(c, "Transport allocation not found")
	}

	var req RemoveTransportRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.EndDate == "" {
		return utils.BadRequest(c, "EndDate is required")
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid end_date — use YYYY-MM-DD")
	}

	allocation.EndDate = &endDate
	allocation.Status = "inactive"

	if err := database.DB.WithContext(c.Context()).Save(&allocation).Error; err != nil {
		return utils.InternalError(c, "Could not remove transport allocation")
	}

	database.DB.WithContext(c.Context()).Preload("Student").Preload("Vehicle").Preload("Vehicle.Route").First(&allocation, "id = ?", allocationID)
	return utils.OK(c, allocation, "Transport allocation removed successfully")
}
