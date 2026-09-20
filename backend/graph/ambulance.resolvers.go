package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Ambulance module — healthcare industry, Phase 5. A fleet of
// vehicles with dispatchable trips (adapts the transport idea).

var ambulanceTypes = map[string]bool{
	"basic": true, "als": true, "icu": true, "mortuary": true,
}
var tripTypes = map[string]bool{
	"pickup": true, "transfer": true, "discharge": true, "other": true,
}

// ── Fleet ────────────────────────────────────────────────────────────────────

func (r *queryResolver) Ambulances(ctx context.Context, includeInactive *bool) ([]*model.Ambulance, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	var rows []models.Ambulance
	if err := q.Order("code ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Ambulance, len(rows))
	for i, a := range rows {
		out[i] = ambulanceToModel(a)
	}
	return out, nil
}

func (r *mutationResolver) CreateAmbulance(ctx context.Context, input model.CreateAmbulanceInput) (*model.Ambulance, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	if code == "" {
		return nil, GQLErr("ambulance code is required")
	}
	vtype := "basic"
	if input.VehicleType != nil && *input.VehicleType != "" {
		if !ambulanceTypes[*input.VehicleType] {
			return nil, GQLErr("vehicle type must be basic, als, icu, or mortuary")
		}
		vtype = *input.VehicleType
	}
	a := models.Ambulance{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Registration: strVal(input.Registration), VehicleType: vtype,
		DriverName: strVal(input.DriverName), DriverPhone: strVal(input.DriverPhone),
		Status: models.AmbulanceAvailable, Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, uniqueErr(err, "an ambulance with this code already exists")
	}
	return ambulanceToModel(a), nil
}

func (r *mutationResolver) UpdateAmbulance(ctx context.Context, id string, input model.UpdateAmbulanceInput) (*model.Ambulance, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "registration", input.Registration)
	setStr(updates, "driver_name", input.DriverName)
	setStr(updates, "driver_phone", input.DriverPhone)
	if input.VehicleType != nil {
		if !ambulanceTypes[*input.VehicleType] {
			return nil, GQLErr("invalid vehicle type")
		}
		updates["vehicle_type"] = *input.VehicleType
	}
	if input.Status != nil {
		if *input.Status != models.AmbulanceAvailable && *input.Status != models.AmbulanceMaintenance {
			return nil, GQLErr("status must be available or maintenance")
		}
		updates["status"] = *input.Status
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.Ambulance{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "an ambulance with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var a models.Ambulance
	r.DB.WithContext(ctx).First(&a, "id = ?", id)
	return ambulanceToModel(a), nil
}

func (r *mutationResolver) DeleteAmbulance(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var active int64
	r.DB.WithContext(ctx).Model(&models.AmbulanceTrip{}).
		Where("ambulance_id = ? AND tenant_id = ? AND status = ?", id, auth.TenantID, models.TripDispatched).Count(&active)
	if active > 0 {
		return false, GQLErr("ambulance is on an active trip")
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Ambulance{})
	return res.RowsAffected > 0, res.Error
}

// ── Trips ────────────────────────────────────────────────────────────────────

func (r *queryResolver) AmbulanceTrips(ctx context.Context, status *string, date *string) ([]*model.AmbulanceTrip, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Ambulance").Preload("Patient").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if date != nil && *date != "" {
		q = q.Where("DATE(dispatch_time) = ?", *date)
	}
	var rows []models.AmbulanceTrip
	if err := q.Order("dispatch_time DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AmbulanceTrip, len(rows))
	for i, t := range rows {
		out[i] = ambulanceTripToModel(t)
	}
	return out, nil
}

func (r *mutationResolver) DispatchAmbulance(ctx context.Context, input model.DispatchAmbulanceInput) (*model.AmbulanceTrip, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var amb models.Ambulance
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", input.AmbulanceID, auth.TenantID).First(&amb).Error; err != nil {
		return nil, GQLErr("ambulance not found")
	}
	if amb.Status != models.AmbulanceAvailable {
		return nil, GQLErr("ambulance is not available")
	}
	patientID := strVal(input.PatientID)
	if patientID != "" && !patientExists(r.DB, ctx, auth.TenantID, patientID) {
		return nil, GQLErr("patient not found")
	}
	tripType := "pickup"
	if input.TripType != nil && *input.TripType != "" {
		if !tripTypes[*input.TripType] {
			return nil, GQLErr("invalid trip type")
		}
		tripType = *input.TripType
	}
	trip := models.AmbulanceTrip{
		ID: uuid.NewString(), TenantID: auth.TenantID, AmbulanceID: amb.ID,
		PatientID: patientID, TripType: tripType,
		Origin: strVal(input.Origin), Destination: strVal(input.Destination),
		DispatchTime: time.Now(), Status: models.TripDispatched, Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&trip).Error; err != nil {
		return nil, err
	}
	r.DB.WithContext(ctx).Model(&models.Ambulance{}).Where("id = ?", amb.ID).Update("status", models.AmbulanceOnTrip)
	return r.reloadTrip(ctx, auth.TenantID, trip.ID)
}

func (r *mutationResolver) CompleteAmbulanceTrip(ctx context.Context, id string) (*model.AmbulanceTrip, error) {
	return r.endTrip(ctx, id, models.TripCompleted)
}

func (r *mutationResolver) CancelAmbulanceTrip(ctx context.Context, id string) (*model.AmbulanceTrip, error) {
	return r.endTrip(ctx, id, models.TripCancelled)
}

func (r *mutationResolver) endTrip(ctx context.Context, id, status string) (*model.AmbulanceTrip, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var trip models.AmbulanceTrip
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&trip).Error; err != nil {
		return nil, ErrNotFound
	}
	if trip.Status != models.TripDispatched {
		return nil, GQLErr("trip is not active")
	}
	now := time.Now()
	r.DB.WithContext(ctx).Model(&models.AmbulanceTrip{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": status, "return_time": now})
	// Free the vehicle (unless it's in maintenance).
	r.DB.WithContext(ctx).Model(&models.Ambulance{}).
		Where("id = ? AND status = ?", trip.AmbulanceID, models.AmbulanceOnTrip).
		Update("status", models.AmbulanceAvailable)
	return r.reloadTrip(ctx, auth.TenantID, id)
}

func (r *mutationResolver) reloadTrip(ctx context.Context, tenantID, id string) (*model.AmbulanceTrip, error) {
	var t models.AmbulanceTrip
	if err := r.DB.WithContext(ctx).Preload("Ambulance").Preload("Patient").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&t).Error; err != nil {
		return nil, err
	}
	return ambulanceTripToModel(t), nil
}

func ambulanceToModel(a models.Ambulance) *model.Ambulance {
	return &model.Ambulance{
		ID: a.ID, Code: a.Code, Registration: toStrPtr(a.Registration), VehicleType: a.VehicleType,
		DriverName: toStrPtr(a.DriverName), DriverPhone: toStrPtr(a.DriverPhone),
		Status: a.Status, Active: a.Active,
	}
}

func ambulanceTripToModel(t models.AmbulanceTrip) *model.AmbulanceTrip {
	m := &model.AmbulanceTrip{
		ID: t.ID, AmbulanceID: t.AmbulanceID, AmbulanceCode: t.Ambulance.Code,
		PatientID: toStrPtr(t.PatientID), TripType: t.TripType,
		Origin: toStrPtr(t.Origin), Destination: toStrPtr(t.Destination),
		DispatchTime: t.DispatchTime.Format("2006-01-02T15:04:05Z07:00"),
		ReturnTime:   rfc3339PtrOrNil(t.ReturnTime), Status: t.Status, Notes: toStrPtr(t.Notes),
		CreatedAt: rfc3339OrNil(t.CreatedAt),
	}
	if t.PatientID != "" && t.Patient.ID != "" {
		m.PatientName = toStrPtr(patientDisplayName(t.Patient))
	}
	return m
}
