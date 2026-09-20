package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Queries ───────────────────────────────────────────────────────────────────

func (r *queryResolver) TransportRoutes(ctx context.Context) ([]*model.TransportRoute, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var routes []models.TransportRoute
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Order("route_name asc").Find(&routes).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TransportRoute, len(routes))
	for i, rt := range routes {
		out[i] = transportRouteToModel(rt)
	}
	return out, nil
}

func (r *queryResolver) TransportVehicles(ctx context.Context, routeID *string) ([]*model.TransportVehicle, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).Preload("Route")
	if routeID != nil && *routeID != "" {
		q = q.Where("route_id = ?", *routeID)
	}
	var vehicles []models.TransportVehicle
	if err := q.Order("vehicle_number asc").Find(&vehicles).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TransportVehicle, len(vehicles))
	for i, v := range vehicles {
		out[i] = transportVehicleToModel(v)
	}
	return out, nil
}

func (r *queryResolver) TransportAllocations(ctx context.Context) ([]*model.TransportAllocation, error) {
	// Cross-user allocation list: transport office roles only.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var allocs []models.TransportAllocation
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("Student").Preload("Student.User").
		Preload("Employee").Preload("Employee.User").
		Preload("Vehicle").Preload("Vehicle.Route").
		Order("start_date desc").Find(&allocs).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TransportAllocation, len(allocs))
	for i, a := range allocs {
		out[i] = transportAllocationToModel(a)
	}
	return out, nil
}

// ── Mutations ─────────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateTransportRoute(ctx context.Context, input model.CreateTransportRouteInput) (*model.TransportRoute, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	rt := models.TransportRoute{
		TenantID:   auth.TenantID,
		RouteName:  input.RouteName,
		StartPoint: input.StartPoint,
		EndPoint:   input.EndPoint,
	}
	if input.Stops != nil {
		rt.Stops = *input.Stops
	}
	if input.Distance != nil {
		rt.Distance = *input.Distance
	}
	if err := r.DB.Create(&rt).Error; err != nil {
		return nil, err
	}
	return transportRouteToModel(rt), nil
}

func (r *mutationResolver) UpdateTransportRoute(ctx context.Context, id string, input model.UpdateTransportRouteInput) (*model.TransportRoute, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var rt models.TransportRoute
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&rt).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.RouteName != nil {
		rt.RouteName = *input.RouteName
	}
	if input.StartPoint != nil {
		rt.StartPoint = *input.StartPoint
	}
	if input.EndPoint != nil {
		rt.EndPoint = *input.EndPoint
	}
	if input.Stops != nil {
		rt.Stops = *input.Stops
	}
	if input.Distance != nil {
		rt.Distance = *input.Distance
	}
	r.DB.Save(&rt)
	return transportRouteToModel(rt), nil
}

func (r *mutationResolver) DeleteTransportRoute(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.TransportRoute{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) CreateTransportVehicle(ctx context.Context, input model.CreateTransportVehicleInput) (*model.TransportVehicle, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var route models.TransportRoute
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.RouteID, auth.TenantID).First(&route).Error; err != nil {
		return nil, GQLErr("transport route not found")
	}
	v := models.TransportVehicle{
		TenantID:      auth.TenantID,
		VehicleNumber: input.VehicleNumber,
		VehicleType:   input.VehicleType,
		Capacity:      input.Capacity,
		RouteID:       input.RouteID,
		Status:        "active",
	}
	if input.DriverName != nil {
		v.DriverName = *input.DriverName
	}
	if input.DriverPhone != nil {
		v.DriverPhone = *input.DriverPhone
	}
	// Canonical driver link (Phase 6): validated here because there are no DB
	// foreign keys, so a bad id would otherwise silently orphan the link.
	if input.DriverEmployeeID != nil && *input.DriverEmployeeID != "" {
		if !employeeExists(r.DB, ctx, auth.TenantID, *input.DriverEmployeeID) {
			return nil, GQLErr("driver employee not found")
		}
		v.DriverEmployeeID = *input.DriverEmployeeID
	}
	if err := r.DB.Create(&v).Error; err != nil {
		return nil, err
	}
	v.Route = route
	return transportVehicleToModel(v), nil
}

func (r *mutationResolver) UpdateTransportVehicle(ctx context.Context, id string, input model.UpdateTransportVehicleInput) (*model.TransportVehicle, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var v models.TransportVehicle
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&v).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.VehicleNumber != nil {
		v.VehicleNumber = *input.VehicleNumber
	}
	if input.VehicleType != nil {
		v.VehicleType = *input.VehicleType
	}
	if input.Capacity != nil {
		v.Capacity = *input.Capacity
	}
	if input.DriverName != nil {
		v.DriverName = *input.DriverName
	}
	if input.DriverPhone != nil {
		v.DriverPhone = *input.DriverPhone
	}
	if input.RouteID != nil {
		v.RouteID = *input.RouteID
	}
	if input.Status != nil {
		v.Status = *input.Status
	}
	if input.DriverEmployeeID != nil {
		if *input.DriverEmployeeID != "" && !employeeExists(r.DB, ctx, auth.TenantID, *input.DriverEmployeeID) {
			return nil, GQLErr("driver employee not found")
		}
		v.DriverEmployeeID = *input.DriverEmployeeID
	}
	r.DB.Save(&v)
	r.DB.Preload("Route").First(&v, "id = ?", id)
	return transportVehicleToModel(v), nil
}

func (r *mutationResolver) DeleteTransportVehicle(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.TransportVehicle{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) AllocateTransportVehicle(ctx context.Context, input model.AllocateTransportInput) (*model.TransportAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	// An allocation is for exactly one person — a student or a staff member.
	studentID := ""
	if input.StudentID != nil {
		studentID = strings.TrimSpace(*input.StudentID)
	}
	employeeID := ""
	if input.EmployeeID != nil {
		employeeID = strings.TrimSpace(*input.EmployeeID)
	}
	if (studentID == "") == (employeeID == "") {
		return nil, GQLErr("provide exactly one of studentId or employeeId")
	}

	var vehicle models.TransportVehicle
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.VehicleID, auth.TenantID).
		Preload("Route").First(&vehicle).Error; err != nil {
		return nil, GQLErr("transport vehicle not found")
	}
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, GQLErr("invalid start_date — use YYYY-MM-DD")
	}

	alloc := models.TransportAllocation{
		TenantID:  auth.TenantID,
		VehicleID: input.VehicleID,
		StartDate: startDate,
		Status:    "active",
	}
	if input.PickupStop != nil {
		alloc.PickupStop = *input.PickupStop
	}

	var student models.Student
	var employee models.Employee
	if studentID != "" {
		if err := r.DB.Where("id = ? AND tenant_id = ?", studentID, auth.TenantID).
			Preload("User").First(&student).Error; err != nil {
			return nil, GQLErr("student not found")
		}
		var existing models.TransportAllocation
		if err := r.DB.Where("tenant_id = ? AND student_id = ? AND status = 'active'", auth.TenantID, studentID).
			First(&existing).Error; err == nil {
			return nil, GQLErr("student already has an active transport allocation")
		}
		alloc.AllocType = "student"
		alloc.StudentID = studentID
	} else {
		if err := r.DB.Where("id = ? AND tenant_id = ?", employeeID, auth.TenantID).
			Preload("User").First(&employee).Error; err != nil {
			return nil, GQLErr("staff member not found")
		}
		var existing models.TransportAllocation
		if err := r.DB.Where("tenant_id = ? AND employee_id = ? AND status = 'active'", auth.TenantID, employeeID).
			First(&existing).Error; err == nil {
			return nil, GQLErr("staff member already has an active transport allocation")
		}
		alloc.AllocType = "staff"
		alloc.EmployeeID = employeeID
	}

	if err := r.DB.Create(&alloc).Error; err != nil {
		return nil, err
	}
	alloc.Student = student
	alloc.Employee = employee
	alloc.Vehicle = vehicle
	// Seamless fees: auto-attach the transport add-on to the student's current
	// course year (no-op if no transport add-on is configured or no fee yet).
	if alloc.AllocType == "student" {
		r.attachFacilityAddOn(auth.TenantID, studentID, models.FeeAddOnTransport, 0, auth.UserID)
	}
	return transportAllocationToModel(alloc), nil
}

func (r *mutationResolver) RemoveTransportAllocation(ctx context.Context, id string, input model.RemoveTransportAllocationInput) (*model.TransportAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var alloc models.TransportAllocation
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&alloc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return nil, GQLErr("invalid end_date — use YYYY-MM-DD")
	}
	alloc.EndDate = &endDate
	alloc.Status = "inactive"
	r.DB.Save(&alloc)
	// Seamless fees: detach the transport add-on for unpaid current-year fees.
	if alloc.AllocType == "student" && alloc.StudentID != "" {
		r.detachFacilityAddOn(auth.TenantID, alloc.StudentID, models.FeeAddOnTransport)
	}
	r.DB.Preload("Student").Preload("Vehicle").Preload("Vehicle.Route").First(&alloc, "id = ?", id)
	return transportAllocationToModel(alloc), nil
}

// ── Bulk delete ─────────────────────────────────────────────────────────────

func (r *mutationResolver) BulkDeleteTransportRoutes(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	res := r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.TransportRoute{})
	return int(res.RowsAffected), res.Error
}

func (r *mutationResolver) BulkDeleteTransportVehicles(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	// Remove dependent allocations first so none dangle on a missing vehicle,
	// mirroring how hostel room deletes clear their allocations.
	r.DB.Where("tenant_id = ? AND vehicle_id IN ?", auth.TenantID, ids).Delete(&models.TransportAllocation{})
	res := r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.TransportVehicle{})
	return int(res.RowsAffected), res.Error
}

func (r *mutationResolver) BulkDeleteTransportAllocations(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	res := r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.TransportAllocation{})
	return int(res.RowsAffected), res.Error
}

// ── helpers ───────────────────────────────────────────────────────────────────

func transportRouteToModel(rt models.TransportRoute) *model.TransportRoute {
	return &model.TransportRoute{
		ID:         rt.ID,
		RouteName:  rt.RouteName,
		StartPoint: rt.StartPoint,
		EndPoint:   rt.EndPoint,
		Stops:      rt.Stops,
		Distance:   rt.Distance,
	}
}

func transportVehicleToModel(v models.TransportVehicle) *model.TransportVehicle {
	m := &model.TransportVehicle{
		ID:            v.ID,
		VehicleNumber: v.VehicleNumber,
		VehicleType:   v.VehicleType,
		Capacity:      v.Capacity,
		DriverName:    v.DriverName,
		DriverPhone:   v.DriverPhone,
		RouteID:       v.RouteID,
		Status:        v.Status,
		Latitude:      v.Latitude,
		Longitude:     v.Longitude,
	}
	m.DriverEmployeeID = toStrPtr(v.DriverEmployeeID)
	if v.LastPingAt != nil {
		m.LastPingAt = rfc3339OrNil(*v.LastPingAt)
	}
	if v.Route.ID != "" {
		m.Route = transportRouteToModel(v.Route)
	}
	return m
}

func transportAllocationToModel(a models.TransportAllocation) *model.TransportAllocation {
	m := &model.TransportAllocation{
		ID:         a.ID,
		AllocType:  a.AllocType,
		StudentID:  a.StudentID,
		EmployeeID: a.EmployeeID,
		VehicleID:  a.VehicleID,
		PickupStop: a.PickupStop,
		StartDate:  a.StartDate.Format("2006-01-02"),
		Status:     a.Status,
	}
	// Back-fill the type for any row created before alloc_type existed.
	if m.AllocType == "" {
		if a.EmployeeID != "" {
			m.AllocType = "staff"
		} else {
			m.AllocType = "student"
		}
	}
	if a.EndDate != nil {
		s := a.EndDate.Format("2006-01-02")
		m.EndDate = &s
	}
	if a.Student.ID != "" {
		m.Student = studentToModel(a.Student)
	}
	if a.Employee.ID != "" {
		m.Employee = employeeToModel(a.Employee)
	}
	if a.Vehicle.ID != "" {
		m.Vehicle = transportVehicleToModel(a.Vehicle)
	}
	return m
}
