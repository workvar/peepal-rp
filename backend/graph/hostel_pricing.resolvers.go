package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Pricing helpers ─────────────────────────────────────────────────────────────

// currentAYSemesterCount returns the number of semesters in the tenant's
// current academic year. Returns 0 when there is no current year or it has no
// semesters; callers treat 0 as "a semester equals the whole year".
func currentAYSemesterCount(db *gorm.DB, tenantID string) int {
	var ay models.AcademicYear
	if err := db.Where("tenant_id = ? AND is_current = ?", tenantID, true).First(&ay).Error; err != nil {
		return 0
	}
	var count int64
	db.Model(&models.Semester{}).
		Where("tenant_id = ? AND academic_year_id = ?", tenantID, ay.ID).
		Count(&count)
	return int(count)
}

// deriveRates converts a base (rateType, amount) into normalised semester,
// annual and monthly figures using n = number of semesters in the current
// academic year. The annual amount is split across n semesters; when n == 0 a
// semester equals the whole year. Monthly is the annual amount over 12.
func deriveRates(rateType string, amount float64, n int) (semester, annual, monthly float64) {
	switch normalizeRateType(rateType) {
	case "annual":
		annual = amount
	case "monthly":
		annual = amount * 12
	default: // "semester" (and anything unset) treats amount as the per-semester rate
		if n > 0 {
			annual = amount * float64(n)
		} else {
			annual = amount
		}
	}
	if n > 0 {
		semester = annual / float64(n)
	} else {
		semester = annual
	}
	monthly = annual / 12
	return
}

// normalizeRateType lower-cases and validates a rate type, returning "" if it
// is not one of monthly / semester / annual.
func normalizeRateType(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "monthly", "semester", "annual":
		return strings.ToLower(strings.TrimSpace(v))
	}
	return ""
}

// roomClassToModel maps a RoomClass record to its GraphQL model, filling the
// derived rate fields for the given semester count.
func roomClassToModel(rc models.RoomClass, n int) *model.RoomClass {
	sem, ann, mon := deriveRates(rc.RateType, rc.RateAmount, n)
	return &model.RoomClass{
		ID:           rc.ID,
		Name:         rc.Name,
		Description:  rc.Description,
		RateType:     rc.RateType,
		RateAmount:   rc.RateAmount,
		SemesterRate: sem,
		AnnualRate:   ann,
		MonthlyRate:  mon,
	}
}

// ── Query ───────────────────────────────────────────────────────────────────────

func (r *queryResolver) RoomClasses(ctx context.Context) ([]*model.RoomClass, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	var classes []models.RoomClass
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Order("name asc").Find(&classes).Error; err != nil {
		return nil, err
	}
	out := make([]*model.RoomClass, len(classes))
	for i, c := range classes {
		out[i] = roomClassToModel(c, n)
	}
	return out, nil
}

// ── Mutations ─────────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateRoomClass(ctx context.Context, input model.CreateRoomClassInput) (*model.RoomClass, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, GQLErr("name is required")
	}
	rateType := normalizeRateType(input.RateType)
	if rateType == "" {
		return nil, GQLErr("rateType must be monthly, semester, or annual")
	}
	rc := models.RoomClass{
		TenantID:   auth.TenantID,
		Name:       name,
		RateType:   rateType,
		RateAmount: input.RateAmount,
	}
	if input.Description != nil {
		rc.Description = *input.Description
	}
	if err := r.DB.Create(&rc).Error; err != nil {
		return nil, err
	}
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return roomClassToModel(rc, n), nil
}

func (r *mutationResolver) UpdateRoomClass(ctx context.Context, id string, input model.UpdateRoomClassInput) (*model.RoomClass, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var rc models.RoomClass
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&rc).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Name != nil {
		rc.Name = *input.Name
	}
	if input.Description != nil {
		rc.Description = *input.Description
	}
	if input.RateType != nil {
		rt := normalizeRateType(*input.RateType)
		if rt == "" {
			return nil, GQLErr("rateType must be monthly, semester, or annual")
		}
		rc.RateType = rt
	}
	if input.RateAmount != nil {
		rc.RateAmount = *input.RateAmount
	}
	if err := r.DB.Save(&rc).Error; err != nil {
		return nil, err
	}
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return roomClassToModel(rc, n), nil
}

func (r *mutationResolver) DeleteRoomClass(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	// Detach rooms pointing at this class so they fall back to their own
	// pricing rather than a dangling reference.
	r.DB.Model(&models.HostelRoom{}).
		Where("tenant_id = ? AND room_class_id = ?", auth.TenantID, id).
		Update("room_class_id", nil)
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.RoomClass{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *mutationResolver) BulkDeleteRoomClasses(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	var n int64
	err = r.DB.Transaction(func(tx *gorm.DB) error {
		// Unlink rooms using these classes so they fall back to their own rate.
		if err := tx.Model(&models.HostelRoom{}).
			Where("tenant_id = ? AND room_class_id IN ?", auth.TenantID, ids).
			Update("room_class_id", nil).Error; err != nil {
			return err
		}
		res := tx.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.RoomClass{})
		n = res.RowsAffected
		return res.Error
	})
	return int(n), err
}
