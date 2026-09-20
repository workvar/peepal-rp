package graph

import (
	"context"
	"errors"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Encounters module (OPD clinical visits, healthcare industry).

// Encounters lists clinical visits with optional patient/clinician/date/status filters.
func (r *queryResolver) Encounters(ctx context.Context, patientID *string, clinicianID *string, date *string, status *string) ([]*model.Encounter, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").
		Where("tenant_id = ?", auth.TenantID)
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if clinicianID != nil && *clinicianID != "" {
		q = q.Where("clinician_id = ?", *clinicianID)
	}
	if date != nil && *date != "" {
		q = q.Where("visit_date = ?", *date)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.Encounter
	if err := q.Order("visit_date DESC, created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Encounter, len(rows))
	for i, e := range rows {
		out[i] = encounterToModel(e)
	}
	return out, nil
}

// Encounter fetches a single clinical visit by ID.
func (r *queryResolver) Encounter(ctx context.Context, id string) (*model.Encounter, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var e models.Encounter
	if err := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&e).Error; err != nil {
		return nil, ErrNotFound
	}
	return encounterToModel(e), nil
}

// CreateEncounter records a clinical visit. When it comes from an appointment,
// that appointment is marked completed.
func (r *mutationResolver) CreateEncounter(ctx context.Context, input model.CreateEncounterInput) (*model.Encounter, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if err := verifyPatientAndClinician(r, ctx, auth.TenantID, input.PatientID, input.ClinicianID); err != nil {
		return nil, err
	}

	visitDate := strVal(input.VisitDate)
	if visitDate == "" {
		visitDate = time.Now().Format("2006-01-02")
	}

	visitType := models.VisitOPD
	if input.VisitType != nil && *input.VisitType != "" {
		if !models.ValidVisitType(*input.VisitType) {
			return nil, GQLErr("visit type must be opd, ipd, or emergency")
		}
		visitType = *input.VisitType
	}

	crNumber, err := nextCRNumber(r, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}

	e := models.Encounter{
		ID:             uuid.NewString(),
		TenantID:       auth.TenantID,
		PatientID:      input.PatientID,
		ClinicianID:    input.ClinicianID,
		AppointmentID:  strVal(input.AppointmentID),
		CRNumber:       crNumber,
		VisitType:      visitType,
		VisitDate:      visitDate,
		ChiefComplaint: strVal(input.ChiefComplaint),
		Diagnosis:      strVal(input.Diagnosis),
		Vitals:         strVal(input.Vitals),
		Prescription:   strVal(input.Prescription),
		Notes:          strVal(input.Notes),
		FollowUpDate:   strVal(input.FollowUpDate),
		Status:         models.EncounterOpen,
	}
	if err := r.DB.WithContext(ctx).Create(&e).Error; err != nil {
		return nil, err
	}

	// A visit that came from a booking completes that booking.
	if e.AppointmentID != "" {
		_ = r.DB.WithContext(ctx).Model(&models.Appointment{}).
			Where("id = ? AND tenant_id = ?", e.AppointmentID, auth.TenantID).
			Update("status", models.AppointmentCompleted).Error
	}

	return (&queryResolver{r.Resolver}).Encounter(ctx, e.ID)
}

// UpdateEncounter applies partial updates to a visit's findings or status.
func (r *mutationResolver) UpdateEncounter(ctx context.Context, id string, input model.UpdateEncounterInput) (*model.Encounter, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.ClinicianID != nil {
		var n int64
		if err := r.DB.WithContext(ctx).Model(&models.Employee{}).
			Where("id = ? AND tenant_id = ?", *input.ClinicianID, auth.TenantID).
			Count(&n).Error; err != nil {
			return nil, err
		}
		if n == 0 {
			return nil, GQLErr("clinician not found")
		}
		updates["clinician_id"] = *input.ClinicianID
	}
	setStr(updates, "visit_date", input.VisitDate)
	setStr(updates, "chief_complaint", input.ChiefComplaint)
	setStr(updates, "diagnosis", input.Diagnosis)
	setStr(updates, "vitals", input.Vitals)
	setStr(updates, "prescription", input.Prescription)
	setStr(updates, "notes", input.Notes)
	setStr(updates, "follow_up_date", input.FollowUpDate)
	if input.Status != nil {
		if *input.Status != models.EncounterOpen && *input.Status != models.EncounterClosed {
			return nil, GQLErr("status must be open or closed")
		}
		updates["status"] = *input.Status
	}

	res := r.DB.WithContext(ctx).Model(&models.Encounter{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return (&queryResolver{r.Resolver}).Encounter(ctx, id)
}

// DeleteEncounter removes a clinical visit. Admin only — visit records are
// medical history and should rarely be deleted.
func (r *mutationResolver) DeleteEncounter(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Encounter{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// nextCRNumber generates the next sequential Case Record number for a tenant
// (CR-000001, …), one per visit — distinct from the patient's lifetime UHID.
// Mirrors nextMRN/nextUHID's "count then probe for a free slot" approach.
func nextCRNumber(r *mutationResolver, ctx context.Context, tenantID string) (string, error) {
	var n int64
	if err := r.DB.WithContext(ctx).Model(&models.Encounter{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("CR-%06d", n+1+int64(i))
		var exists int64
		if err := r.DB.WithContext(ctx).Model(&models.Encounter{}).
			Where("tenant_id = ? AND cr_number = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique CR number")
}
