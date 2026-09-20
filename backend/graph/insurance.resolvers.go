package graph

import (
	"context"
	"fmt"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Resolvers for Insurance / TPA claims — healthcare industry, Phase 4. CRUD is
// GraphQL; submitting a claim for approval is a REST action (handlers/
// insurance_claims.go) that reuses the shared approval engine.

var payerTypes = map[string]bool{
	"insurer": true, "tpa": true, "government": true, "corporate": true,
}

// ── Payers ───────────────────────────────────────────────────────────────────

func (r *queryResolver) InsurancePayers(ctx context.Context, includeInactive *bool) ([]*model.InsurancePayer, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	var rows []models.InsurancePayer
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.InsurancePayer, len(rows))
	for i, p := range rows {
		out[i] = payerToModel(p)
	}
	return out, nil
}

func (r *mutationResolver) CreateInsurancePayer(ctx context.Context, input model.CreateInsurancePayerInput) (*model.InsurancePayer, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("payer code and name are required")
	}
	ptype := "insurer"
	if input.PayerType != nil && *input.PayerType != "" {
		if !payerTypes[*input.PayerType] {
			return nil, GQLErr("payer type must be insurer, tpa, government, or corporate")
		}
		ptype = *input.PayerType
	}
	p := models.InsurancePayer{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, PayerType: ptype,
		ContactName: strVal(input.ContactName), Phone: strVal(input.Phone),
		Email: strVal(input.Email), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&p).Error; err != nil {
		return nil, uniqueErr(err, "a payer with this code already exists")
	}
	return payerToModel(p), nil
}

func (r *mutationResolver) UpdateInsurancePayer(ctx context.Context, id string, input model.UpdateInsurancePayerInput) (*model.InsurancePayer, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "contact_name", input.ContactName)
	setStr(updates, "phone", input.Phone)
	setStr(updates, "email", input.Email)
	if input.PayerType != nil {
		if !payerTypes[*input.PayerType] {
			return nil, GQLErr("invalid payer type")
		}
		updates["payer_type"] = *input.PayerType
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.InsurancePayer{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a payer with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var p models.InsurancePayer
	r.DB.WithContext(ctx).First(&p, "id = ?", id)
	return payerToModel(p), nil
}

func (r *mutationResolver) DeleteInsurancePayer(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var used int64
	r.DB.WithContext(ctx).Model(&models.InsuranceClaim{}).
		Where("payer_id = ? AND tenant_id = ?", id, auth.TenantID).Count(&used)
	if used > 0 {
		return false, GQLErr("payer has claims; deactivate it instead")
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.InsurancePayer{})
	return res.RowsAffected > 0, res.Error
}

// ── Claims ───────────────────────────────────────────────────────────────────

func (r *queryResolver) InsuranceClaims(ctx context.Context, patientID *string, payerID *string, status *string) ([]*model.InsuranceClaim, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("Payer").
		Where("tenant_id = ?", auth.TenantID)
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if payerID != nil && *payerID != "" {
		q = q.Where("payer_id = ?", *payerID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.InsuranceClaim
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.InsuranceClaim, len(rows))
	for i, c := range rows {
		out[i] = claimToModel(c)
	}
	return out, nil
}

func (r *queryResolver) InsuranceClaim(ctx context.Context, id string) (*model.InsuranceClaim, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var c models.InsuranceClaim
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Payer").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&c).Error; err != nil {
		return nil, ErrNotFound
	}
	return claimToModel(c), nil
}

func (r *mutationResolver) CreateInsuranceClaim(ctx context.Context, input model.CreateInsuranceClaimInput) (*model.InsuranceClaim, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	var payer models.InsurancePayer
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.PayerID, auth.TenantID).First(&payer).Error; err != nil {
		return nil, GQLErr("payer not found")
	}
	c := models.InsuranceClaim{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, PayerID: payer.ID,
		AdmissionID: strVal(input.AdmissionID), InvoiceID: strVal(input.InvoiceID),
		PolicyNumber: strVal(input.PolicyNumber), Diagnosis: strVal(input.Diagnosis),
		ClaimAmount: floatVal(input.ClaimAmount), Status: models.ClaimDraft,
		Notes: strVal(input.Notes),
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		num, nerr := nextClaimNumber(tx, auth.TenantID)
		if nerr != nil {
			return nerr
		}
		c.ClaimNumber = num
		return tx.Create(&c).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).InsuranceClaim(ctx, c.ID)
}

func (r *mutationResolver) UpdateInsuranceClaim(ctx context.Context, id string, input model.UpdateInsuranceClaimInput) (*model.InsuranceClaim, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var c models.InsuranceClaim
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&c).Error; err != nil {
		return nil, ErrNotFound
	}
	if c.Status != models.ClaimDraft && c.Status != models.ClaimRejected {
		return nil, GQLErr("only draft or rejected claims can be edited")
	}
	updates := map[string]interface{}{}
	setStr(updates, "policy_number", input.PolicyNumber)
	setStr(updates, "diagnosis", input.Diagnosis)
	setStr(updates, "notes", input.Notes)
	if input.PayerID != nil && *input.PayerID != "" {
		if !payerExists(r.DB, ctx, auth.TenantID, *input.PayerID) {
			return nil, GQLErr("payer not found")
		}
		updates["payer_id"] = *input.PayerID
	}
	if input.ClaimAmount != nil {
		updates["claim_amount"] = *input.ClaimAmount
	}
	if input.ApprovedAmount != nil {
		updates["approved_amount"] = *input.ApprovedAmount
	}
	if err := r.DB.WithContext(ctx).Model(&models.InsuranceClaim{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).InsuranceClaim(ctx, id)
}

func (r *mutationResolver) DeleteInsuranceClaim(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.InsuranceClaim{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// SettleInsuranceClaim marks an approved claim settled (final step after the
// insurer reimburses). Optionally records the finally approved amount.
func (r *mutationResolver) SettleInsuranceClaim(ctx context.Context, id string, approvedAmount *float64) (*model.InsuranceClaim, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var c models.InsuranceClaim
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&c).Error; err != nil {
		return nil, ErrNotFound
	}
	if c.Status != models.ClaimApproved {
		return nil, GQLErr("only approved claims can be settled")
	}
	now := time.Now()
	updates := map[string]interface{}{"status": models.ClaimSettled, "settled_at": now}
	if approvedAmount != nil {
		updates["approved_amount"] = *approvedAmount
	}
	if err := r.DB.WithContext(ctx).Model(&models.InsuranceClaim{}).
		Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).InsuranceClaim(ctx, id)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func payerExists(db *gorm.DB, ctx context.Context, tenantID, id string) bool {
	var n int64
	db.WithContext(ctx).Model(&models.InsurancePayer{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).Count(&n)
	return n > 0
}

func nextClaimNumber(tx *gorm.DB, tenantID string) (string, error) {
	var n int64
	if err := tx.Model(&models.InsuranceClaim{}).Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("CLM-%05d", n+1+int64(i))
		var exists int64
		if err := tx.Model(&models.InsuranceClaim{}).
			Where("tenant_id = ? AND claim_number = ?", tenantID, candidate).Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not generate a unique claim number")
}

func payerToModel(p models.InsurancePayer) *model.InsurancePayer {
	return &model.InsurancePayer{
		ID: p.ID, Code: p.Code, Name: p.Name, PayerType: p.PayerType,
		ContactName: toStrPtr(p.ContactName), Phone: toStrPtr(p.Phone),
		Email: toStrPtr(p.Email), Active: p.Active,
	}
}

func claimToModel(c models.InsuranceClaim) *model.InsuranceClaim {
	m := &model.InsuranceClaim{
		ID: c.ID, ClaimNumber: c.ClaimNumber,
		PatientID: c.PatientID, PatientName: patientDisplayName(c.Patient), PatientMrn: c.Patient.MRN,
		AdmissionID: toStrPtr(c.AdmissionID), InvoiceID: toStrPtr(c.InvoiceID),
		PayerID: toStrPtr(c.PayerID), PolicyNumber: toStrPtr(c.PolicyNumber),
		Diagnosis: toStrPtr(c.Diagnosis), ClaimAmount: c.ClaimAmount, ApprovedAmount: c.ApprovedAmount,
		Status: c.Status, Notes: toStrPtr(c.Notes),
		SubmittedAt: rfc3339PtrOrNil(c.SubmittedAt), SettledAt: rfc3339PtrOrNil(c.SettledAt),
		CreatedAt: rfc3339OrNil(c.CreatedAt),
	}
	if c.PayerID != "" && c.Payer.ID != "" {
		m.PayerName = toStrPtr(c.Payer.Name)
	}
	return m
}
