package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for Emergency / Triage — healthcare industry, Phase 4. Walk-in
// cases scored by acuity (1..5) and tracked to a disposition.

var triageStatuses = map[string]bool{
	models.TriageWaiting: true, models.TriageInTreatment: true, models.TriageDisposed: true,
}
var triageDispositions = map[string]bool{
	"admitted": true, "discharged": true, "referred": true, "lwbs": true, "deceased": true,
}

func (r *queryResolver) TriageCases(ctx context.Context, status *string, date *string) ([]*model.TriageCase, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("AssignedClinician.User").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if date != nil && *date != "" {
		// Match calendar day on arrival_time.
		q = q.Where("DATE(arrival_time) = ?", *date)
	}
	// Waiting cases first, then by acuity (most urgent first), then arrival.
	var rows []models.TriageCase
	if err := q.Order("triage_level ASC, arrival_time ASC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TriageCase, len(rows))
	for i, t := range rows {
		out[i] = triageToModel(t)
	}
	return out, nil
}

func (r *mutationResolver) CreateTriageCase(ctx context.Context, input model.CreateTriageCaseInput) (*model.TriageCase, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	level := 3
	if input.TriageLevel != nil {
		if *input.TriageLevel < 1 || *input.TriageLevel > 5 {
			return nil, GQLErr("triage level must be between 1 and 5")
		}
		level = *input.TriageLevel
	}
	clinician := strVal(input.AssignedClinicianID)
	if clinician != "" && !employeeExists(r.DB, ctx, auth.TenantID, clinician) {
		return nil, GQLErr("assigned clinician not found")
	}
	t := models.TriageCase{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, ChiefComplaint: strVal(input.ChiefComplaint),
		TriageLevel: level, Vitals: strVal(input.Vitals),
		AssignedClinicianID: clinician, Status: models.TriageWaiting,
		Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&t).Error; err != nil {
		return nil, err
	}
	return r.reloadTriage(ctx, auth.TenantID, t.ID)
}

func (r *mutationResolver) UpdateTriageCase(ctx context.Context, id string, input model.UpdateTriageCaseInput) (*model.TriageCase, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "vitals", input.Vitals)
	setStr(updates, "notes", input.Notes)
	if input.TriageLevel != nil {
		if *input.TriageLevel < 1 || *input.TriageLevel > 5 {
			return nil, GQLErr("triage level must be between 1 and 5")
		}
		updates["triage_level"] = *input.TriageLevel
	}
	if input.AssignedClinicianID != nil {
		if *input.AssignedClinicianID != "" && !employeeExists(r.DB, ctx, auth.TenantID, *input.AssignedClinicianID) {
			return nil, GQLErr("assigned clinician not found")
		}
		updates["assigned_clinician_id"] = *input.AssignedClinicianID
	}
	if input.Status != nil {
		if !triageStatuses[*input.Status] {
			return nil, GQLErr("invalid status")
		}
		updates["status"] = *input.Status
	}
	if input.Disposition != nil && *input.Disposition != "" {
		if !triageDispositions[*input.Disposition] {
			return nil, GQLErr("invalid disposition")
		}
		updates["disposition"] = *input.Disposition
		updates["status"] = models.TriageDisposed
	}
	if len(updates) == 0 {
		return nil, GQLErr("nothing to update")
	}
	res := r.DB.WithContext(ctx).Model(&models.TriageCase{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadTriage(ctx, auth.TenantID, id)
}

func (r *mutationResolver) reloadTriage(ctx context.Context, tenantID, id string) (*model.TriageCase, error) {
	var t models.TriageCase
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("AssignedClinician.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&t).Error; err != nil {
		return nil, err
	}
	return triageToModel(t), nil
}

func triageToModel(t models.TriageCase) *model.TriageCase {
	m := &model.TriageCase{
		ID: t.ID, PatientID: t.PatientID, PatientName: patientDisplayName(t.Patient), PatientMrn: t.Patient.MRN,
		ArrivalTime:    t.ArrivalTime.Format("2006-01-02T15:04:05Z07:00"),
		ChiefComplaint: toStrPtr(t.ChiefComplaint), TriageLevel: t.TriageLevel,
		Vitals: toStrPtr(t.Vitals), AssignedClinicianID: toStrPtr(t.AssignedClinicianID),
		Status: t.Status, Disposition: toStrPtr(t.Disposition), Notes: toStrPtr(t.Notes),
		CreatedAt: rfc3339OrNil(t.CreatedAt),
	}
	if t.AssignedClinicianID != "" {
		m.AssignedClinicianName = toStrPtr(strings.TrimSpace(employeeName(t.AssignedClinician)))
	}
	return m
}
