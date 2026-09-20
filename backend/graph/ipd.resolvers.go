package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Ward + Bed resolvers — healthcare industry, Phase 3. Wards hold beds (grouped
// by bay); occupancy is derived from live admissions.

var wardTypes = map[string]bool{
	"general": true, "icu": true, "hdu": true, "maternity": true,
	"pediatric": true, "private": true, "isolation": true,
}
var wardGenders = map[string]bool{
	models.WardGenderAny: true, models.WardGenderMale: true, models.WardGenderFemale: true,
}

// ── Wards ────────────────────────────────────────────────────────────────────

func (r *queryResolver) Wards(ctx context.Context, includeInactive *bool) ([]*model.Ward, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Beds", func(d *gorm.DB) *gorm.DB { return d.Order("bed_number ASC") }).
		Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	var rows []models.Ward
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	occ, err := occupancyForTenant(r.DB, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}
	out := make([]*model.Ward, len(rows))
	for i, w := range rows {
		out[i] = wardToModel(w, occ)
	}
	return out, nil
}

func (r *queryResolver) Ward(ctx context.Context, id string) (*model.Ward, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var w models.Ward
	if err := r.DB.WithContext(ctx).
		Preload("Beds", func(d *gorm.DB) *gorm.DB { return d.Order("bed_number ASC") }).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&w).Error; err != nil {
		return nil, ErrNotFound
	}
	occ, err := occupancyForTenant(r.DB, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}
	return wardToModel(w, occ), nil
}

func (r *mutationResolver) CreateWard(ctx context.Context, input model.CreateWardInput) (*model.Ward, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("ward code and name are required")
	}
	wardType := "general"
	if input.WardType != nil && *input.WardType != "" {
		if !wardTypes[*input.WardType] {
			return nil, GQLErr("invalid ward type")
		}
		wardType = *input.WardType
	}
	gender := models.WardGenderAny
	if input.Gender != nil && *input.Gender != "" {
		if !wardGenders[*input.Gender] {
			return nil, GQLErr("gender must be any, male, or female")
		}
		gender = *input.Gender
	}
	w := models.Ward{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, WardType: wardType, Gender: gender,
		Floor: strVal(input.Floor), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&w).Error; err != nil {
		return nil, uniqueErr(err, "a ward with this code already exists")
	}
	return (&queryResolver{r.Resolver}).Ward(ctx, w.ID)
}

func (r *mutationResolver) UpdateWard(ctx context.Context, id string, input model.UpdateWardInput) (*model.Ward, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "floor", input.Floor)
	if input.WardType != nil {
		if !wardTypes[*input.WardType] {
			return nil, GQLErr("invalid ward type")
		}
		updates["ward_type"] = *input.WardType
	}
	if input.Gender != nil {
		if !wardGenders[*input.Gender] {
			return nil, GQLErr("gender must be any, male, or female")
		}
		updates["gender"] = *input.Gender
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.Ward{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a ward with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return (&queryResolver{r.Resolver}).Ward(ctx, id)
}

func (r *mutationResolver) DeleteWard(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var occupied int64
	r.DB.WithContext(ctx).Model(&models.Admission{}).
		Where("ward_id = ? AND tenant_id = ? AND status = ?", id, auth.TenantID, models.AdmissionAdmitted).
		Count(&occupied)
	if occupied > 0 {
		return false, GQLErr("ward has admitted patients; discharge or transfer them first")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("ward_id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Bed{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Ward{}).Error
	})
	return err == nil, err
}

// ── Beds ─────────────────────────────────────────────────────────────────────

func (r *queryResolver) Beds(ctx context.Context, wardID *string, status *string) ([]*model.Bed, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if wardID != nil && *wardID != "" {
		q = q.Where("ward_id = ?", *wardID)
	}
	var rows []models.Bed
	if err := q.Order("bed_number ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	occ, err := occupancyForTenant(r.DB, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}
	out := make([]*model.Bed, 0, len(rows))
	for _, b := range rows {
		m := bedToModel(b, occ)
		if status != nil && *status != "" && m.Status != *status {
			continue
		}
		out = append(out, m)
	}
	return out, nil
}

func (r *mutationResolver) CreateBed(ctx context.Context, input model.CreateBedInput) (*model.Bed, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	number := strings.TrimSpace(input.BedNumber)
	if number == "" {
		return nil, GQLErr("bed number is required")
	}
	var ward models.Ward
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.WardID, auth.TenantID).First(&ward).Error; err != nil {
		return nil, GQLErr("ward not found")
	}
	b := models.Bed{
		ID: uuid.NewString(), TenantID: auth.TenantID, WardID: ward.ID,
		BedNumber: number, Bay: strVal(input.Bay), Status: models.BedAvailable,
		DailyCharge: floatVal(input.DailyCharge),
	}
	if err := r.DB.WithContext(ctx).Create(&b).Error; err != nil {
		return nil, uniqueErr(err, "a bed with this number already exists in the ward")
	}
	return bedToModel(b, map[string]bedOccupancy{}), nil
}

func (r *mutationResolver) UpdateBed(ctx context.Context, id string, input model.UpdateBedInput) (*model.Bed, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	occ, err := occupancyForTenant(r.DB, ctx, auth.TenantID)
	if err != nil {
		return nil, err
	}
	if _, busy := occ[id]; busy {
		if input.Status != nil || input.BedNumber != nil {
			return nil, GQLErr("bed is occupied; discharge or transfer the patient first")
		}
	}
	updates := map[string]interface{}{}
	setStr(updates, "bed_number", input.BedNumber)
	setStr(updates, "bay", input.Bay)
	if input.DailyCharge != nil {
		updates["daily_charge"] = *input.DailyCharge
	}
	if input.Status != nil {
		if *input.Status != models.BedAvailable && *input.Status != models.BedMaintenance {
			return nil, GQLErr("status must be available or maintenance")
		}
		updates["status"] = *input.Status
	}
	res := r.DB.WithContext(ctx).Model(&models.Bed{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a bed with this number already exists in the ward")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var b models.Bed
	if err := r.DB.WithContext(ctx).Where("id = ?", id).First(&b).Error; err != nil {
		return nil, err
	}
	return bedToModel(b, occ), nil
}

func (r *mutationResolver) DeleteBed(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	occ, err := occupancyForTenant(r.DB, ctx, auth.TenantID)
	if err != nil {
		return false, err
	}
	if _, busy := occ[id]; busy {
		return false, GQLErr("bed is occupied; discharge the patient first")
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Bed{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
