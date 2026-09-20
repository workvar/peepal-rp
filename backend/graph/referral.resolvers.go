package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for Referrals — healthcare industry, Phase 5. Outbound referrals of
// a patient to another facility or specialist.

var referralUrgencies = map[string]bool{
	models.ReferralRoutine: true, models.ReferralUrgent: true, models.ReferralEmergency: true,
}

func (r *queryResolver) Referrals(ctx context.Context, status *string, settlementStatus *string) ([]*model.Referral, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("FromClinician.User").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if settlementStatus != nil && *settlementStatus != "" {
		q = q.Where("settlement_status = ?", *settlementStatus)
	}
	var rows []models.Referral
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	// Payee employee names are looked up in bulk to avoid an N+1 preload for a
	// field that's usually blank (only referrals paid to an internal doctor).
	payeeIDs := make([]string, 0)
	for _, ref := range rows {
		if ref.PayeeEmployeeID != "" {
			payeeIDs = append(payeeIDs, ref.PayeeEmployeeID)
		}
	}
	payeeNames := map[string]string{}
	if len(payeeIDs) > 0 {
		var employees []models.Employee
		if err := r.DB.WithContext(ctx).Preload("User").
			Where("id IN ? AND tenant_id = ?", payeeIDs, auth.TenantID).Find(&employees).Error; err == nil {
			for _, e := range employees {
				payeeNames[e.ID] = employeeName(e)
			}
		}
	}
	out := make([]*model.Referral, len(rows))
	for i, ref := range rows {
		out[i] = referralToModel(ref)
		if ref.PayeeEmployeeID != "" {
			out[i].PayeeEmployeeName = toStrPtr(payeeNames[ref.PayeeEmployeeID])
		}
	}
	return out, nil
}

func (r *mutationResolver) CreateReferral(ctx context.Context, input model.CreateReferralInput) (*model.Referral, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	referredTo := strings.TrimSpace(input.ReferredTo)
	if referredTo == "" {
		return nil, GQLErr("referral destination is required")
	}
	from := strVal(input.FromClinicianID)
	if from != "" && !employeeExists(r.DB, ctx, auth.TenantID, from) {
		return nil, GQLErr("referring clinician not found")
	}
	urgency := models.ReferralRoutine
	if input.Urgency != nil && *input.Urgency != "" {
		if !referralUrgencies[*input.Urgency] {
			return nil, GQLErr("urgency must be routine, urgent, or emergency")
		}
		urgency = *input.Urgency
	}
	ref := models.Referral{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, FromClinicianID: from,
		ReferredTo: referredTo, Specialty: strVal(input.Specialty),
		Reason: strVal(input.Reason), Urgency: urgency,
		ReferralDate: time.Now().Format("2006-01-02"), Status: models.ReferralPending,
		Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&ref).Error; err != nil {
		return nil, err
	}
	return r.reloadReferral(ctx, auth.TenantID, ref.ID)
}

func (r *mutationResolver) SetReferralStatus(ctx context.Context, id string, status string) (*model.Referral, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	valid := map[string]bool{
		models.ReferralPending: true, models.ReferralAccepted: true,
		models.ReferralCompleted: true, models.ReferralDeclined: true,
	}
	if !valid[status] {
		return nil, GQLErr("invalid status")
	}
	res := r.DB.WithContext(ctx).Model(&models.Referral{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadReferral(ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteReferral(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Referral{})
	return res.RowsAffected > 0, res.Error
}

func (r *mutationResolver) reloadReferral(ctx context.Context, tenantID, id string) (*model.Referral, error) {
	var ref models.Referral
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("FromClinician.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&ref).Error; err != nil {
		return nil, err
	}
	return referralToModel(ref), nil
}

func referralToModel(ref models.Referral) *model.Referral {
	m := &model.Referral{
		ID: ref.ID, PatientID: ref.PatientID, PatientName: patientDisplayName(ref.Patient), PatientMrn: ref.Patient.MRN,
		FromClinicianID: toStrPtr(ref.FromClinicianID), ReferredTo: ref.ReferredTo,
		Specialty: toStrPtr(ref.Specialty), Reason: toStrPtr(ref.Reason), Urgency: ref.Urgency,
		ReferralDate: toStrPtr(ref.ReferralDate), Status: ref.Status, Notes: toStrPtr(ref.Notes),
		CommissionType: ref.CommissionType, CommissionValue: ref.CommissionValue,
		CommissionBase: ref.CommissionBase, CommissionAmount: ref.CommissionAmount,
		PayeeType: toStrPtr(ref.PayeeType), PayeeName: toStrPtr(ref.PayeeName),
		PayeeEmployeeID: toStrPtr(ref.PayeeEmployeeID), SettlementStatus: ref.SettlementStatus,
		SettledOn: toStrPtr(ref.SettledOn),
		CreatedAt: rfc3339OrNil(ref.CreatedAt),
	}
	if ref.FromClinicianID != "" {
		m.FromClinicianName = toStrPtr(employeeName(ref.FromClinician))
	}
	return m
}

// referralCommissionTypes/referralPayeeTypes gate the free-text status fields.
var referralCommissionTypes = map[string]bool{
	models.ReferralCommissionNone: true, models.ReferralCommissionFlat: true, models.ReferralCommissionPercent: true,
}
var referralPayeeTypes = map[string]bool{"doctor": true, "centre": true}

// SetReferralCommission sets or clears a referral's commission terms and
// computes CommissionAmount (flat = value; percent = base * value / 100).
// Once settled, terms are frozen — call this before settleReferral.
func (r *mutationResolver) SetReferralCommission(ctx context.Context, id string, input model.SetReferralCommissionInput) (*model.Referral, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var ref models.Referral
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&ref).Error; err != nil {
		return nil, ErrNotFound
	}
	if ref.SettlementStatus == models.ReferralSettlementSettled {
		return nil, GQLErr("commission is already settled and can no longer be changed")
	}
	cType := strings.TrimSpace(input.CommissionType)
	if !referralCommissionTypes[cType] {
		return nil, GQLErr("commissionType must be none, flat, or percent")
	}
	payeeType := strVal(input.PayeeType)
	if payeeType != "" && !referralPayeeTypes[payeeType] {
		return nil, GQLErr("payeeType must be doctor or centre")
	}
	payeeEmployeeID := strVal(input.PayeeEmployeeID)
	if payeeEmployeeID != "" && !employeeExists(r.DB, ctx, auth.TenantID, payeeEmployeeID) {
		return nil, GQLErr("payee employee not found")
	}

	value := floatVal(input.CommissionValue)
	base := floatVal(input.CommissionBase)
	var amount float64
	switch cType {
	case models.ReferralCommissionFlat:
		amount = value
	case models.ReferralCommissionPercent:
		if value < 0 || value > 100 {
			return nil, GQLErr("commissionValue must be between 0 and 100 for a percent commission")
		}
		amount = base * value / 100
	default: // none
		value, base, amount = 0, 0, 0
	}

	updates := map[string]interface{}{
		"commission_type": cType, "commission_value": value,
		"commission_base": base, "commission_amount": ledgerRound(amount),
		"payee_type": payeeType, "payee_name": strVal(input.PayeeName),
		"payee_employee_id": payeeEmployeeID,
	}
	if err := r.DB.WithContext(ctx).Model(&models.Referral{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return r.reloadReferral(ctx, auth.TenantID, id)
}

// SettleReferral freezes the commission and posts the payable to the GL: debit
// referral_commission_expense, credit ap_vendors. A zero-amount commission
// (type "none" or unset) just flips the status — postBatch already no-ops a
// batch whose lines net to zero, so this is safe to call unconditionally.
func (r *mutationResolver) SettleReferral(ctx context.Context, id string) (*model.Referral, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var ref models.Referral
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&ref).Error; err != nil {
		return nil, ErrNotFound
	}
	if ref.SettlementStatus == models.ReferralSettlementSettled {
		return nil, GQLErr("referral is already settled")
	}

	settledOn := time.Now().Format("2006-01-02")
	tx := r.DB.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	if err := tx.Model(&models.Referral{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(map[string]interface{}{
			"settlement_status": models.ReferralSettlementSettled, "settled_on": settledOn,
		}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	if ref.CommissionAmount > 0 {
		memo := "Referral commission — " + ref.ReferredTo
		if ref.PayeeName != "" {
			memo += " (" + ref.PayeeName + ")"
		}
		if err := postBatch(tx, auth.TenantID, settledOn, memo, "referral_commission", ref.ID, []postLine{
			{AccountKey: "referral_commission_expense", Debit: ref.CommissionAmount},
			{AccountKey: "ap_vendors", Credit: ref.CommissionAmount},
		}); err != nil {
			tx.Rollback()
			return nil, err
		}
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	return r.reloadReferral(ctx, auth.TenantID, id)
}
