package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Blood bank — healthcare industry, Phase 5. A stock of
// blood units + patient blood requests.

var bloodGroups = map[string]bool{
	"A+": true, "A-": true, "B+": true, "B-": true,
	"AB+": true, "AB-": true, "O+": true, "O-": true,
}
var bloodComponents = map[string]bool{
	"whole": true, "rbc": true, "plasma": true, "platelets": true, "cryo": true,
}

// ── Units ────────────────────────────────────────────────────────────────────

func (r *queryResolver) BloodUnits(ctx context.Context, bloodGroup *string, status *string, component *string) ([]*model.BloodUnit, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("IssuedTo").Where("tenant_id = ?", auth.TenantID)
	if bloodGroup != nil && *bloodGroup != "" {
		q = q.Where("blood_group = ?", *bloodGroup)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if component != nil && *component != "" {
		q = q.Where("component = ?", *component)
	}
	var rows []models.BloodUnit
	if err := q.Order("expiry_date ASC").Limit(1000).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.BloodUnit, len(rows))
	for i, u := range rows {
		out[i] = bloodUnitToModel(u)
	}
	return out, nil
}

func (r *mutationResolver) AddBloodUnit(ctx context.Context, input model.CreateBloodUnitInput) (*model.BloodUnit, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	bag := strings.TrimSpace(input.BagNumber)
	if bag == "" {
		return nil, GQLErr("bag number is required")
	}
	if !bloodGroups[input.BloodGroup] {
		return nil, GQLErr("invalid blood group")
	}
	component := "whole"
	if input.Component != nil && *input.Component != "" {
		if !bloodComponents[*input.Component] {
			return nil, GQLErr("invalid component")
		}
		component = *input.Component
	}
	u := models.BloodUnit{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		BagNumber: bag, BloodGroup: input.BloodGroup, Component: component,
		VolumeMl: intVal(input.VolumeMl), DonorName: strVal(input.DonorName),
		CollectedDate: strVal(input.CollectedDate), ExpiryDate: strVal(input.ExpiryDate),
		Status: models.BloodAvailable,
	}
	if err := r.DB.WithContext(ctx).Create(&u).Error; err != nil {
		return nil, uniqueErr(err, "a unit with this bag number already exists")
	}
	return bloodUnitToModel(u), nil
}

func (r *mutationResolver) UpdateBloodUnitStatus(ctx context.Context, id string, status string) (*model.BloodUnit, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	allowed := map[string]bool{
		models.BloodAvailable: true, models.BloodReserved: true,
		models.BloodExpired: true, models.BloodDiscarded: true,
	}
	if !allowed[status] {
		return nil, GQLErr("status must be available, reserved, expired, or discarded")
	}
	res := r.DB.WithContext(ctx).Model(&models.BloodUnit{}).
		Where("id = ? AND tenant_id = ? AND status <> ?", id, auth.TenantID, models.BloodIssued).
		Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, GQLErr("unit not found or already issued")
	}
	return r.reloadBloodUnit(ctx, auth.TenantID, id)
}

func (r *mutationResolver) IssueBloodUnit(ctx context.Context, id string, patientID string) (*model.BloodUnit, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, patientID) {
		return nil, GQLErr("patient not found")
	}
	res := r.DB.WithContext(ctx).Model(&models.BloodUnit{}).
		Where("id = ? AND tenant_id = ? AND status IN ?", id, auth.TenantID, []string{models.BloodAvailable, models.BloodReserved}).
		Updates(map[string]interface{}{
			"status": models.BloodIssued, "issued_to_id": patientID,
			"issued_date": time.Now().Format("2006-01-02"),
		})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, GQLErr("unit not available to issue")
	}
	return r.reloadBloodUnit(ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteBloodUnit(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND status <> ?", id, auth.TenantID, models.BloodIssued).
		Delete(&models.BloodUnit{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// ── Requests ─────────────────────────────────────────────────────────────────

func (r *queryResolver) BloodRequests(ctx context.Context, status *string) ([]*model.BloodRequest, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("RequestedBy.User").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.BloodRequest
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.BloodRequest, len(rows))
	for i, br := range rows {
		out[i] = bloodRequestToModel(br)
	}
	return out, nil
}

func (r *mutationResolver) CreateBloodRequest(ctx context.Context, input model.CreateBloodRequestInput) (*model.BloodRequest, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	if !bloodGroups[input.BloodGroup] {
		return nil, GQLErr("invalid blood group")
	}
	requestedBy := strVal(input.RequestedByID)
	if requestedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, requestedBy) {
		return nil, GQLErr("requesting clinician not found")
	}
	component := "whole"
	if input.Component != nil && *input.Component != "" {
		component = *input.Component
	}
	units := 1
	if input.UnitsRequired != nil && *input.UnitsRequired > 0 {
		units = *input.UnitsRequired
	}
	br := models.BloodRequest{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, BloodGroup: input.BloodGroup, Component: component,
		UnitsRequired: units, RequestedByID: requestedBy,
		RequestDate: time.Now().Format("2006-01-02"), Status: models.BloodReqPending,
		Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&br).Error; err != nil {
		return nil, err
	}
	return r.reloadBloodRequest(ctx, auth.TenantID, br.ID)
}

func (r *mutationResolver) FulfillBloodRequest(ctx context.Context, id string) (*model.BloodRequest, error) {
	return r.setBloodRequestStatus(ctx, id, models.BloodReqFulfilled)
}

func (r *mutationResolver) CancelBloodRequest(ctx context.Context, id string) (*model.BloodRequest, error) {
	return r.setBloodRequestStatus(ctx, id, models.BloodReqCancelled)
}

func (r *mutationResolver) setBloodRequestStatus(ctx context.Context, id, status string) (*model.BloodRequest, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.BloodRequest{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadBloodRequest(ctx, auth.TenantID, id)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func (r *mutationResolver) reloadBloodUnit(ctx context.Context, tenantID, id string) (*model.BloodUnit, error) {
	var u models.BloodUnit
	if err := r.DB.WithContext(ctx).Preload("IssuedTo").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&u).Error; err != nil {
		return nil, err
	}
	return bloodUnitToModel(u), nil
}

func (r *mutationResolver) reloadBloodRequest(ctx context.Context, tenantID, id string) (*model.BloodRequest, error) {
	var br models.BloodRequest
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("RequestedBy.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&br).Error; err != nil {
		return nil, err
	}
	return bloodRequestToModel(br), nil
}

func bloodUnitToModel(u models.BloodUnit) *model.BloodUnit {
	m := &model.BloodUnit{
		ID: u.ID, BagNumber: u.BagNumber, BloodGroup: u.BloodGroup, Component: u.Component,
		VolumeMl: u.VolumeMl, DonorName: toStrPtr(u.DonorName),
		CollectedDate: toStrPtr(u.CollectedDate), ExpiryDate: toStrPtr(u.ExpiryDate),
		Status: u.Status, IssuedToID: toStrPtr(u.IssuedToID), IssuedDate: toStrPtr(u.IssuedDate),
		CreatedAt: rfc3339OrNil(u.CreatedAt),
	}
	if u.IssuedToID != "" && u.IssuedTo.ID != "" {
		m.IssuedToName = toStrPtr(patientDisplayName(u.IssuedTo))
	}
	return m
}

func bloodRequestToModel(br models.BloodRequest) *model.BloodRequest {
	m := &model.BloodRequest{
		ID: br.ID, PatientID: br.PatientID, PatientName: patientDisplayName(br.Patient), PatientMrn: br.Patient.MRN,
		BloodGroup: br.BloodGroup, Component: br.Component, UnitsRequired: br.UnitsRequired,
		RequestDate: toStrPtr(br.RequestDate), Status: br.Status, Notes: toStrPtr(br.Notes),
		CreatedAt: rfc3339OrNil(br.CreatedAt),
	}
	if br.RequestedByID != "" {
		m.RequestedByName = toStrPtr(employeeName(br.RequestedBy))
	}
	return m
}
