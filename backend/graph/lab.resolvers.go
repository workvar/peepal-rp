package graph

import (
	"context"
	"strings"

	"collegeerp/database"
	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Laboratory (LIS) module — healthcare industry, Phase 3.
// Test catalog, orders placed from encounters, and results with reference-range
// flagging.

var labSampleTypes = map[string]bool{
	"blood": true, "urine": true, "stool": true, "swab": true, "other": true,
}

// ── Test catalog ─────────────────────────────────────────────────────────────

func (r *queryResolver) LabTests(ctx context.Context, search *string, includeInactive *bool) ([]*model.LabTest, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	// Best-effort: seed the standard panels once per tenant on first read.
	// Never blocks the query if it fails (e.g. a mid-seed code collision).
	_ = database.EnsureLabTestTemplates(r.DB.WithContext(ctx), auth.TenantID)
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	if search != nil && strings.TrimSpace(*search) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(*search)) + "%"
		q = q.Where("(LOWER(name) LIKE ? OR LOWER(code) LIKE ?)", like, like)
	}
	var rows []models.LabTest
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LabTest, len(rows))
	for i, t := range rows {
		out[i] = labTestToModel(t)
	}
	return out, nil
}

func (r *mutationResolver) CreateLabTest(ctx context.Context, input model.CreateLabTestInput) (*model.LabTest, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("test code and name are required")
	}
	sample := "blood"
	if input.SampleType != nil && *input.SampleType != "" {
		if !labSampleTypes[*input.SampleType] {
			return nil, GQLErr("sample type must be blood, urine, stool, swab, or other")
		}
		sample = *input.SampleType
	}
	t := models.LabTest{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, Category: strVal(input.Category),
		Panel: strVal(input.Panel), Method: strVal(input.Method),
		SampleType: sample, Unit: strVal(input.Unit),
		RefLow: floatVal(input.RefLow), RefHigh: floatVal(input.RefHigh),
		RefText: strVal(input.RefText), Price: floatVal(input.Price), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&t).Error; err != nil {
		return nil, uniqueErr(err, "a test with this code already exists")
	}
	return labTestToModel(t), nil
}

func (r *mutationResolver) UpdateLabTest(ctx context.Context, id string, input model.UpdateLabTestInput) (*model.LabTest, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "category", input.Category)
	setStr(updates, "panel", input.Panel)
	setStr(updates, "method", input.Method)
	setStr(updates, "unit", input.Unit)
	setStr(updates, "ref_text", input.RefText)
	if input.SampleType != nil {
		if !labSampleTypes[*input.SampleType] {
			return nil, GQLErr("sample type must be blood, urine, stool, swab, or other")
		}
		updates["sample_type"] = *input.SampleType
	}
	if input.RefLow != nil {
		updates["ref_low"] = *input.RefLow
	}
	if input.RefHigh != nil {
		updates["ref_high"] = *input.RefHigh
	}
	if input.Price != nil {
		updates["price"] = *input.Price
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.LabTest{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a test with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var t models.LabTest
	if err := r.DB.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		return nil, err
	}
	return labTestToModel(t), nil
}

func (r *mutationResolver) DeleteLabTest(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.LabTest{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
