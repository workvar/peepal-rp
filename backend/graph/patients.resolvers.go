package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Patients module (healthcare industry). Reads are open to
// any authenticated user in the tenant (the matrix + industry gate govern
// them); writes have a staff-level role floor refined by the access matrix.

// Patients lists patients with optional search/status filters and pagination.
func (r *queryResolver) Patients(ctx context.Context, search *string, status *string, limit *int, offset *int) ([]*model.Patient, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := patientFilterQuery(r.DB.WithContext(ctx), auth.TenantID, search, status)

	max := 50
	if limit != nil && *limit > 0 {
		max = *limit
	}
	if offset != nil && *offset > 0 {
		q = q.Offset(*offset)
	}

	var rows []models.Patient
	if err := q.Order("created_at DESC").Limit(max).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Patient, len(rows))
	for i, p := range rows {
		out[i] = patientToModel(p)
	}
	return out, nil
}

// PatientsCount returns the total matching the same filters as Patients.
func (r *queryResolver) PatientsCount(ctx context.Context, search *string, status *string) (int, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return 0, err
	}
	var n int64
	if err := patientFilterQuery(r.DB.WithContext(ctx), auth.TenantID, search, status).
		Model(&models.Patient{}).Count(&n).Error; err != nil {
		return 0, err
	}
	return int(n), nil
}

// Patient fetches a single patient by ID.
func (r *queryResolver) Patient(ctx context.Context, id string) (*model.Patient, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var p models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&p).Error; err != nil {
		return nil, ErrNotFound
	}
	return patientToModel(p), nil
}

// CreatePatient registers a patient, generating an MRN when none is supplied.
func (r *mutationResolver) CreatePatient(ctx context.Context, input model.CreatePatientInput) (*model.Patient, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	first := strings.TrimSpace(input.FirstName)
	if first == "" {
		return nil, errors.New("first name is required")
	}

	mrn := strings.TrimSpace(strVal(input.Mrn))
	if mrn == "" {
		mrn, err = nextMRN(r, ctx, auth.TenantID)
		if err != nil {
			return nil, err
		}
	}
	uhid, err := nextUHID(r, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}

	p := models.Patient{
		ID:                uuid.NewString(),
		TenantID:          auth.TenantID,
		MRN:               mrn,
		UHID:              uhid,
		FirstName:         first,
		LastName:          strings.TrimSpace(strVal(input.LastName)),
		Gender:            strVal(input.Gender),
		DateOfBirth:       strVal(input.DateOfBirth),
		BloodGroup:        strVal(input.BloodGroup),
		Phone:             strVal(input.Phone),
		Email:             strVal(input.Email),
		Address:           strVal(input.Address),
		City:              strVal(input.City),
		State:             strVal(input.State),
		Pincode:           strVal(input.Pincode),
		EmergencyName:     strVal(input.EmergencyName),
		EmergencyPhone:    strVal(input.EmergencyPhone),
		Allergies:         strVal(input.Allergies),
		ChronicConditions: strVal(input.ChronicConditions),
		Status:            "active",
	}
	if err := r.DB.WithContext(ctx).Create(&p).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") ||
			strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, GQLErr("a patient with this MRN already exists")
		}
		return nil, err
	}
	return patientToModel(p), nil
}

// UpdatePatient applies partial updates to a patient record.
func (r *mutationResolver) UpdatePatient(ctx context.Context, id string, input model.UpdatePatientInput) (*model.Patient, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "mrn", input.Mrn)
	setStr(updates, "first_name", input.FirstName)
	setStr(updates, "last_name", input.LastName)
	setStr(updates, "gender", input.Gender)
	setStr(updates, "date_of_birth", input.DateOfBirth)
	setStr(updates, "blood_group", input.BloodGroup)
	setStr(updates, "phone", input.Phone)
	setStr(updates, "email", input.Email)
	setStr(updates, "address", input.Address)
	setStr(updates, "city", input.City)
	setStr(updates, "state", input.State)
	setStr(updates, "pincode", input.Pincode)
	setStr(updates, "emergency_name", input.EmergencyName)
	setStr(updates, "emergency_phone", input.EmergencyPhone)
	setStr(updates, "allergies", input.Allergies)
	setStr(updates, "chronic_conditions", input.ChronicConditions)
	if input.Status != nil {
		s := strings.TrimSpace(*input.Status)
		if s != "active" && s != "inactive" && s != "deceased" {
			return nil, GQLErr("status must be active, inactive, or deceased")
		}
		updates["status"] = s
	}

	res := r.DB.WithContext(ctx).Model(&models.Patient{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var p models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&p).Error; err != nil {
		return nil, err
	}
	return patientToModel(p), nil
}

// DeletePatient removes a patient and all their clinical records.
func (r *mutationResolver) DeletePatient(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var p models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&p).Error; err != nil {
		return false, ErrNotFound
	}
	tx := r.DB.WithContext(ctx).Begin()
	if tx.Error != nil {
		return false, tx.Error
	}
	if err := deletePatientCascade(tx, auth.TenantID, p.ID); err != nil {
		tx.Rollback()
		return false, err
	}
	return true, tx.Commit().Error
}

// --- helpers ---

// nextMRN generates the next sequential MRN for a tenant (MRN-00001, …),
// skipping over values already taken (e.g. imported records).
func nextMRN(r *mutationResolver, ctx context.Context, tenantID string) (string, error) {
	var n int64
	if err := r.DB.WithContext(ctx).Model(&models.Patient{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("MRN-%05d", n+1+int64(i))
		var exists int64
		if err := r.DB.WithContext(ctx).Model(&models.Patient{}).
			Where("tenant_id = ? AND mrn = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique MRN")
}

// nextUHID generates the next sequential lifetime Unique Health ID for a
// tenant (UH-000001, …), mirroring nextMRN. UHID and MRN are independent
// sequences: MRN is the chart number, UHID is the lifetime identity number
// that (conceptually) survives a chart re-issue.
func nextUHID(r *mutationResolver, ctx context.Context, tenantID string) (string, error) {
	var n int64
	if err := r.DB.WithContext(ctx).Model(&models.Patient{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("UH-%06d", n+1+int64(i))
		var exists int64
		if err := r.DB.WithContext(ctx).Model(&models.Patient{}).
			Where("tenant_id = ? AND uhid = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique UHID")
}
