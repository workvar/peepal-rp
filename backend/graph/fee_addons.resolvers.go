package graph

// Fee add-ons: optional facility charges (Transport, Hostel, Mess…) defined
// once and attached to individual students per course year, on top of their
// base course fee. Attaching/removing recomputes the student's totals and
// unpaid installments (fee_logic.go), so opting out next year is one click.

import (
	"context"
	"errors"
	"fmt"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func feeAddOnToModel(a models.FeeAddOn) *model.FeeAddOn {
	m := &model.FeeAddOn{
		ID:            a.ID,
		Name:          a.Name,
		Code:          a.Code,
		Kind:          a.Kind,
		FeeCategoryID: a.FeeCategoryID,
		AmountPerYear: a.AmountPerYear,
		Description:   toStrPtr(a.Description),
		IsActive:      a.IsActive,
	}
	if a.FeeCategory.ID != "" {
		m.FeeCategory = feeCategoryToModel(a.FeeCategory)
	}
	return m
}

func studentFeeAddOnToModel(s models.StudentFeeAddOn) *model.StudentFeeAddOn {
	m := &model.StudentFeeAddOn{
		ID:         s.ID,
		FeeAddOnID: s.FeeAddOnID,
		YearNumber: s.YearNumber,
		Amount:     s.Amount,
	}
	if s.FeeAddOn.ID != "" {
		m.FeeAddOn = feeAddOnToModel(s.FeeAddOn)
	}
	return m
}

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) FeeAddOns(ctx context.Context) ([]*model.FeeAddOn, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var addOns []models.FeeAddOn
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).
		Preload("FeeCategory").Order("name").Find(&addOns).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeeAddOn, len(addOns))
	for i, a := range addOns {
		out[i] = feeAddOnToModel(a)
		var count int64
		r.DB.WithContext(ctx).Model(&models.StudentFeeAddOn{}).
			Where("fee_add_on_id = ?", a.ID).
			Distinct("student_fee_id").Count(&count)
		out[i].StudentCount = int(count)
	}
	return out, nil
}

// ─── Add-on Definition Mutations ──────────────────────────────────────────────

func (r *mutationResolver) CreateFeeAddOn(ctx context.Context, input model.CreateFeeAddOnInput) (*model.FeeAddOn, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Name == "" || input.Code == "" {
		return nil, GQLErr("name and code are required")
	}
	if input.AmountPerYear <= 0 {
		return nil, GQLErr("amountPerYear must be greater than zero")
	}
	var cat models.FeeCategory
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", input.FeeCategoryID, auth.TenantID).First(&cat).Error; err != nil {
		return nil, GQLErr("fee category not found")
	}
	kind, err := normalizeAddOnKind(strVal(input.Kind))
	if err != nil {
		return nil, err
	}
	addOn := models.FeeAddOn{
		TenantID:      auth.TenantID,
		Name:          input.Name,
		Code:          input.Code,
		Kind:          kind,
		FeeCategoryID: cat.ID,
		AmountPerYear: input.AmountPerYear,
		Description:   strVal(input.Description),
		IsActive:      true,
	}
	if err := r.DB.WithContext(ctx).Create(&addOn).Error; err != nil {
		return nil, err
	}
	addOn.FeeCategory = cat
	return feeAddOnToModel(addOn), nil
}

func (r *mutationResolver) UpdateFeeAddOn(ctx context.Context, id string, input model.UpdateFeeAddOnInput) (*model.FeeAddOn, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var addOn models.FeeAddOn
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Preload("FeeCategory").First(&addOn).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Kind != nil {
		kind, err := normalizeAddOnKind(*input.Kind)
		if err != nil {
			return nil, err
		}
		updates["kind"] = kind
	}
	if input.AmountPerYear != nil {
		if *input.AmountPerYear <= 0 {
			return nil, GQLErr("amountPerYear must be greater than zero")
		}
		updates["amount_per_year"] = *input.AmountPerYear
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&addOn).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return feeAddOnToModel(addOn), nil
}

func (r *mutationResolver) DeleteFeeAddOn(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var used int64
	r.DB.WithContext(ctx).Model(&models.StudentFeeAddOn{}).
		Where("tenant_id = ? AND fee_add_on_id = ?", auth.TenantID, id).Count(&used)
	if used > 0 {
		return false, GQLErr("add-on is attached to students; remove it from them first")
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.FeeAddOn{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Per-Student Attachment Mutations ─────────────────────────────────────────

// courseYearsForFee returns the course duration behind a student fee
// (0 = unknown, no validation possible).
func (r *Resolver) courseYearsForFee(ctx context.Context, sf models.StudentFee) int {
	var years int
	r.DB.WithContext(ctx).Model(&models.FeeAllocation{}).
		Joins("JOIN fee_structures ON fee_structures.id = fee_allocations.fee_structure_id").
		Joins("JOIN courses ON courses.id = fee_structures.course_id").
		Where("fee_allocations.id = ?", sf.FeeAllocationID).
		Select("COALESCE(courses.duration_years, 0)").Scan(&years)
	return years
}

func (r *mutationResolver) AddStudentFeeAddOn(ctx context.Context, input model.AddStudentFeeAddOnInput) (*model.StudentFee, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	sf, err := r.loadStudentFee(ctx, auth.TenantID, input.StudentFeeID)
	if err != nil {
		return nil, err
	}
	var addOn models.FeeAddOn
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", input.FeeAddOnID, auth.TenantID).First(&addOn).Error; err != nil {
		return nil, GQLErr("add-on not found")
	}
	if !addOn.IsActive {
		return nil, GQLErr("add-on is inactive")
	}
	if len(input.YearNumbers) == 0 {
		return nil, GQLErr("pick at least one course year")
	}
	maxYears := r.courseYearsForFee(ctx, sf)
	seen := map[int]bool{}
	for _, y := range input.YearNumbers {
		if y < 1 {
			return nil, GQLErr("year numbers must be 1 or higher")
		}
		if maxYears > 0 && y > maxYears {
			return nil, GQLErr(fmt.Sprintf("the course only has %d years", maxYears))
		}
		if seen[y] {
			return nil, GQLErr("duplicate year in the selection")
		}
		seen[y] = true
		var existing int64
		r.DB.WithContext(ctx).Model(&models.StudentFeeAddOn{}).
			Where("student_fee_id = ? AND fee_add_on_id = ? AND year_number = ?", sf.ID, addOn.ID, y).
			Count(&existing)
		if existing > 0 {
			return nil, GQLErr(fmt.Sprintf("%s is already attached for year %d", addOn.Name, y))
		}
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, y := range input.YearNumbers {
			row := models.StudentFeeAddOn{
				TenantID:     auth.TenantID,
				StudentFeeID: sf.ID,
				FeeAddOnID:   addOn.ID,
				YearNumber:   y,
				Amount:       addOn.AmountPerYear,
				CreatedBy:    auth.UserID,
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		if err := r.recomputeStudentFee(tx, &sf); err != nil {
			return err
		}
		return r.rebuildPaymentApplication(tx, sf.ID)
	})
	if err != nil {
		return nil, err
	}
	sf, err = r.loadStudentFee(ctx, auth.TenantID, sf.ID)
	if err != nil {
		return nil, err
	}
	return studentFeeToModel(sf), nil
}

func (r *mutationResolver) RemoveStudentFeeAddOn(ctx context.Context, id string) (*model.StudentFee, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var row models.StudentFeeAddOn
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	sf, err := r.loadStudentFee(ctx, auth.TenantID, row.StudentFeeID)
	if err != nil {
		return nil, err
	}
	// Removing the charge must not drop the bill below what was already paid.
	newNet := round2(sf.NetAmount - row.Amount)
	if newNet < sf.PaidAmount-0.005 {
		return nil, GQLErr("cannot remove: the student has already paid more than the remaining total; cancel payments first")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&row).Error; err != nil {
			return err
		}
		if err := r.recomputeStudentFee(tx, &sf); err != nil {
			return err
		}
		return r.rebuildPaymentApplication(tx, sf.ID)
	})
	if err != nil {
		return nil, err
	}
	sf, err = r.loadStudentFee(ctx, auth.TenantID, sf.ID)
	if err != nil {
		return nil, err
	}
	return studentFeeToModel(sf), nil
}
