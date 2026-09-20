package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Live transport (Phase 6c): vehicle position pings for the map, and driver
// day sheets. The ping is a GraphQL mutation called by the driver's device on
// a timer; a dedicated REST ingest endpoint can be added later if a hardware
// tracker needs one, but that is out of Phase 6 scope.

// LiveVehicles feeds the map. Left out of opAccess (dashboard-style read) —
// requireAuth plus tenant scoping is the guard.
func (r *queryResolver) LiveVehicles(ctx context.Context) ([]*model.LiveVehicle, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.TransportVehicle
	if err := r.DB.WithContext(ctx).Preload("Route").Preload("DriverEmployee.User").
		Where("tenant_id = ?", auth.TenantID).
		Order("vehicle_number ASC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LiveVehicle, len(rows))
	for i, row := range rows {
		out[i] = liveVehicleToModel(row)
	}
	return out, nil
}

// PingVehicleLocation records a position report. Drivers sign in as staff, so
// staff may ping; the vehicle must belong to the caller's tenant.
func (r *mutationResolver) PingVehicleLocation(ctx context.Context, vehicleID string, latitude float64, longitude float64) (*model.LiveVehicle, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if latitude < -90 || latitude > 90 {
		return nil, GQLErr("latitude must be between -90 and 90")
	}
	if longitude < -180 || longitude > 180 {
		return nil, GQLErr("longitude must be between -180 and 180")
	}

	now := time.Now()
	res := r.DB.WithContext(ctx).Model(&models.TransportVehicle{}).
		Where("id = ? AND tenant_id = ?", vehicleID, auth.TenantID).
		Updates(map[string]interface{}{
			"latitude": latitude, "longitude": longitude, "last_ping_at": now,
		})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	var row models.TransportVehicle
	if err := r.DB.WithContext(ctx).Preload("Route").Preload("DriverEmployee.User").
		Where("id = ? AND tenant_id = ?", vehicleID, auth.TenantID).First(&row).Error; err != nil {
		return nil, err
	}
	return liveVehicleToModel(row), nil
}

// DriverAttendance lists day sheets. Non-admin callers are scoped to their own
// rows so a driver can check their own sheet without seeing the whole depot.
func (r *queryResolver) DriverAttendance(ctx context.Context, date *string, from *string, to *string, employeeID *string, vehicleID *string) ([]*model.DriverAttendance, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Employee.User").Preload("Vehicle").
		Where("tenant_id = ?", auth.TenantID)

	if !callerIsTransportAdmin(auth) {
		self, err := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
		if err != nil {
			return nil, err
		}
		q = q.Where("employee_id = ?", self.ID)
	} else if employeeID != nil && *employeeID != "" {
		q = q.Where("employee_id = ?", *employeeID)
	}
	if vehicleID != nil && *vehicleID != "" {
		q = q.Where("vehicle_id = ?", *vehicleID)
	}
	if date != nil && *date != "" {
		q = q.Where("date = ?", *date)
	}
	if from != nil && *from != "" {
		q = q.Where("date >= ?", *from)
	}
	if to != nil && *to != "" {
		q = q.Where("date <= ?", *to)
	}

	var rows []models.DriverAttendance
	if err := q.Order("date DESC, check_in_at ASC").Limit(1000).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.DriverAttendance, len(rows))
	for i, row := range rows {
		out[i] = driverAttendanceToModel(row)
	}
	return out, nil
}

// MarkDriverAttendance upserts a day sheet (one row per employee per date),
// so an admin correcting a driver's times edits rather than duplicates.
func (r *mutationResolver) MarkDriverAttendance(ctx context.Context, input model.DriverAttendanceInput) (*model.DriverAttendance, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if !validYMD(input.Date) {
		return nil, GQLErr("date must be YYYY-MM-DD")
	}
	if !employeeExists(r.DB, ctx, auth.TenantID, input.EmployeeID) {
		return nil, GQLErr("employee not found")
	}
	for _, t := range []*string{input.CheckInAt, input.CheckOutAt} {
		if t != nil && *t != "" && !validHHMM(*t) {
			return nil, GQLErr("check-in / check-out must be HH:MM")
		}
	}
	if vid := strVal(input.VehicleID); vid != "" && !vehicleExists(r.DB, ctx, auth.TenantID, vid) {
		return nil, GQLErr("vehicle not found")
	}

	saved, err := upsertDriverAttendance(r.DB, ctx, auth.TenantID, input.EmployeeID, input.Date,
		map[string]interface{}{
			"vehicle_id":   strVal(input.VehicleID),
			"check_in_at":  strVal(input.CheckInAt),
			"check_out_at": strVal(input.CheckOutAt),
			"status":       driverStatusOr(input.Status),
		})
	if err != nil {
		return nil, err
	}
	return loadDriverAttendance(r.DB, ctx, auth.TenantID, saved)
}

// DriverCheckIn stamps the caller on today's sheet against a vehicle. Only
// the first check-in of the day counts, so a double tap is harmless.
func (r *mutationResolver) DriverCheckIn(ctx context.Context, vehicleID string) (*model.DriverAttendance, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	self, err := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	if !vehicleExists(r.DB, ctx, auth.TenantID, vehicleID) {
		return nil, GQLErr("vehicle not found")
	}

	var existing models.DriverAttendance
	found := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND employee_id = ? AND date = ?", auth.TenantID, self.ID, today()).
		First(&existing).Error == nil
	if found && existing.CheckInAt != "" {
		return nil, GQLErr("you have already checked in today")
	}

	saved, err := upsertDriverAttendance(r.DB, ctx, auth.TenantID, self.ID, today(),
		map[string]interface{}{
			"vehicle_id":  vehicleID,
			"check_in_at": nowHHMM(),
			"status":      "present",
		})
	if err != nil {
		return nil, err
	}
	return loadDriverAttendance(r.DB, ctx, auth.TenantID, saved)
}

// DriverCheckOut closes today's sheet for the caller.
func (r *mutationResolver) DriverCheckOut(ctx context.Context) (*model.DriverAttendance, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	self, err := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	var existing models.DriverAttendance
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND employee_id = ? AND date = ?", auth.TenantID, self.ID, today()).
		First(&existing).Error; err != nil {
		return nil, GQLErr("you have not checked in today")
	}
	if err := r.DB.WithContext(ctx).Model(&models.DriverAttendance{}).
		Where("id = ?", existing.ID).Update("check_out_at", nowHHMM()).Error; err != nil {
		return nil, err
	}
	return loadDriverAttendance(r.DB, ctx, auth.TenantID, existing.ID)
}

func (r *mutationResolver) DeleteDriverAttendance(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.DriverAttendance{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func callerIsTransportAdmin(auth AuthContext) bool {
	return auth.IsSuperAdmin || auth.Role == roleAdmin || auth.Role == string(models.RoleSuperAdmin)
}

func driverStatusOr(s *string) string {
	if s == nil || *s == "" {
		return "present"
	}
	return *s
}

func nowHHMM() string {
	return time.Now().Format("15:04")
}

func vehicleExists(db *gorm.DB, ctx context.Context, tenantID, vehicleID string) bool {
	var n int64
	db.WithContext(ctx).Model(&models.TransportVehicle{}).
		Where("id = ? AND tenant_id = ?", vehicleID, tenantID).Count(&n)
	return n > 0
}

// upsertDriverAttendance writes one row per (employee, date), returning its
// id. Blank values in `updates` are skipped on update so a check-out call
// never wipes the earlier check-in.
func upsertDriverAttendance(db *gorm.DB, ctx context.Context, tenantID, employeeID, date string, updates map[string]interface{}) (string, error) {
	var id string
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.DriverAttendance
		if tx.Where("tenant_id = ? AND employee_id = ? AND date = ?", tenantID, employeeID, date).
			First(&existing).Error == nil {
			id = existing.ID
			clean := map[string]interface{}{}
			for k, v := range updates {
				if s, ok := v.(string); ok && s == "" {
					continue
				}
				clean[k] = v
			}
			if len(clean) == 0 {
				return nil
			}
			return tx.Model(&models.DriverAttendance{}).Where("id = ?", existing.ID).Updates(clean).Error
		}
		row := models.DriverAttendance{
			TenantID: tenantID, EmployeeID: employeeID, Date: date,
			VehicleID:  strFromAny(updates["vehicle_id"]),
			CheckInAt:  strFromAny(updates["check_in_at"]),
			CheckOutAt: strFromAny(updates["check_out_at"]),
			Status:     strFromAny(updates["status"]),
		}
		if row.Status == "" {
			row.Status = "present"
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
		id = row.ID
		return nil
	})
	return id, err
}

func strFromAny(v interface{}) string {
	s, _ := v.(string)
	return s
}

func loadDriverAttendance(db *gorm.DB, ctx context.Context, tenantID, id string) (*model.DriverAttendance, error) {
	var row models.DriverAttendance
	if err := db.WithContext(ctx).Preload("Employee.User").Preload("Vehicle").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&row).Error; err != nil {
		return nil, ErrNotFound
	}
	return driverAttendanceToModel(row), nil
}

func driverAttendanceToModel(d models.DriverAttendance) *model.DriverAttendance {
	return &model.DriverAttendance{
		ID:            d.ID,
		EmployeeID:    d.EmployeeID,
		EmployeeName:  employeeName(d.Employee),
		VehicleID:     toStrPtr(d.VehicleID),
		VehicleNumber: toStrPtr(d.Vehicle.VehicleNumber),
		Date:          d.Date,
		CheckInAt:     toStrPtr(d.CheckInAt),
		CheckOutAt:    toStrPtr(d.CheckOutAt),
		Status:        d.Status,
		CreatedAt:     rfc3339OrNil(d.CreatedAt),
	}
}

func liveVehicleToModel(v models.TransportVehicle) *model.LiveVehicle {
	m := &model.LiveVehicle{
		ID:               v.ID,
		VehicleNumber:    v.VehicleNumber,
		VehicleType:      v.VehicleType,
		Capacity:         v.Capacity,
		Status:           v.Status,
		RouteID:          toStrPtr(v.RouteID),
		RouteName:        toStrPtr(v.Route.RouteName),
		Latitude:         v.Latitude,
		Longitude:        v.Longitude,
		DriverEmployeeID: toStrPtr(v.DriverEmployeeID),
		DriverPhone:      toStrPtr(v.DriverPhone),
	}
	if v.LastPingAt != nil {
		m.LastPingAt = rfc3339OrNil(*v.LastPingAt)
	}
	// Prefer the linked employee's name; fall back to the legacy free-text
	// driver name so vehicles entered before Phase 6 still label correctly.
	if name := employeeName(v.DriverEmployee); name != "" && v.DriverEmployeeID != "" {
		m.DriverName = toStrPtr(name)
	} else {
		m.DriverName = toStrPtr(v.DriverName)
	}
	return m
}
