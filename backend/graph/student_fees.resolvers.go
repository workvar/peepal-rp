package graph

// Materialized student fee records and their discounts.

import (
	"context"
	"errors"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func studentFeeQuery(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Student").Preload("Student.User").Preload("Student.Course").
		Preload("FeeAllocation").
		Preload("FeeAllocation.Installments", func(d *gorm.DB) *gorm.DB { return d.Order("sequence") }).
		Preload("AddOns").Preload("AddOns.FeeAddOn").
		Preload("Discounts").
		Preload("Installments", func(d *gorm.DB) *gorm.DB { return d.Order("sequence") })
}

func (r *Resolver) loadStudentFee(ctx context.Context, tenantID, id string) (models.StudentFee, error) {
	var sf models.StudentFee
	err := studentFeeQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&sf).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return sf, ErrNotFound
	}
	return sf, err
}

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) StudentFees(ctx context.Context, studentID *string, feeAllocationID *string, status *string, courseID *string) ([]*model.StudentFee, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	q := studentFeeQuery(r.DB.WithContext(ctx)).Where("student_fees.tenant_id = ?", auth.TenantID)
	if studentID != nil && *studentID != "" {
		q = q.Where("student_fees.student_id = ?", *studentID)
	}
	if feeAllocationID != nil && *feeAllocationID != "" {
		q = q.Where("student_fees.fee_allocation_id = ?", *feeAllocationID)
	}
	if status != nil && *status != "" {
		q = q.Where("student_fees.status = ?", *status)
	}
	if courseID != nil && *courseID != "" {
		q = q.Joins("JOIN students ON students.id = student_fees.student_id").
			Where("students.course_id = ?", *courseID)
	}
	var fees []models.StudentFee
	if err := q.Order("student_fees.created_at DESC").Find(&fees).Error; err != nil {
		return nil, err
	}
	out := make([]*model.StudentFee, len(fees))
	for i, sf := range fees {
		out[i] = studentFeeToModel(sf)
	}
	return out, nil
}

func (r *queryResolver) MyStudentFees(ctx context.Context) ([]*model.StudentFee, error) {
	// Self-service: resolves the caller's own student record.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var student models.Student
	if err := r.DB.WithContext(ctx).Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).First(&student).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	var fees []models.StudentFee
	if err := studentFeeQuery(r.DB.WithContext(ctx)).
		Where("student_id = ? AND tenant_id = ?", student.ID, auth.TenantID).
		Order("created_at DESC").Find(&fees).Error; err != nil {
		return nil, err
	}
	out := make([]*model.StudentFee, len(fees))
	for i, sf := range fees {
		out[i] = studentFeeToModel(sf)
	}
	return out, nil
}

// ─── Discount Mutations ───────────────────────────────────────────────────────

func (r *mutationResolver) AddStudentFeeDiscount(ctx context.Context, input model.AddStudentFeeDiscountInput) (*model.StudentFee, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	sf, err := r.loadStudentFee(ctx, auth.TenantID, input.StudentFeeID)
	if err != nil {
		return nil, err
	}
	if sf.PaidAmount > 0 {
		return nil, GQLErr("discounts cannot change after payments exist")
	}
	if input.Label == "" {
		return nil, GQLErr("label is required")
	}
	amount := 0.0
	switch input.DiscountType {
	case models.DiscountFixed:
		if input.Value <= 0 {
			return nil, GQLErr("discount amount must be greater than zero")
		}
		amount = input.Value
	case models.DiscountPercent:
		if input.Value <= 0 || input.Value > 100 {
			return nil, GQLErr("percentage must be between 0 and 100")
		}
		amount = round2(sf.GrossAmount * input.Value / 100)
	default:
		return nil, GQLErr("discountType must be fixed or percent")
	}
	discount := models.StudentFeeDiscount{
		TenantID:     auth.TenantID,
		StudentFeeID: sf.ID,
		Label:        input.Label,
		DiscountType: input.DiscountType,
		Value:        input.Value,
		Amount:       amount,
		Remarks:      strVal(input.Remarks),
		CreatedBy:    auth.UserID,
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&discount).Error; err != nil {
			return err
		}
		return r.recomputeStudentFee(tx, &sf)
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

func (r *mutationResolver) RemoveStudentFeeDiscount(ctx context.Context, id string) (*model.StudentFee, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var discount models.StudentFeeDiscount
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&discount).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	sf, err := r.loadStudentFee(ctx, auth.TenantID, discount.StudentFeeID)
	if err != nil {
		return nil, err
	}
	if sf.PaidAmount > 0 {
		return nil, GQLErr("discounts cannot change after payments exist")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&discount).Error; err != nil {
			return err
		}
		return r.recomputeStudentFee(tx, &sf)
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
