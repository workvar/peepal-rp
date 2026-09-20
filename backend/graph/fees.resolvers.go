package graph

// Fee categories (master fee codes) and course fee structures (per-course
// variations with per-year line items). Allocations live in
// fee_allocations.resolvers.go.

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func feeStructureQuery(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Course").Preload("Batch").
		Preload("Items", func(d *gorm.DB) *gorm.DB { return d.Order("year_number, created_at") }).
		Preload("Items.FeeCategory")
}

// feeStructureToModelFull attaches the allocation count to a converted
// structure.
func (r *Resolver) feeStructureToModelFull(ctx context.Context, fs models.FeeStructure) *model.FeeStructure {
	m := feeStructureToModel(fs)
	var count int64
	r.DB.WithContext(ctx).Model(&models.FeeAllocation{}).
		Where("fee_structure_id = ?", fs.ID).Count(&count)
	m.AllocationCount = int(count)
	return m
}

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) FeeCategories(ctx context.Context) ([]*model.FeeCategory, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var cats []models.FeeCategory
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Order("name").Find(&cats).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeeCategory, len(cats))
	for i, c := range cats {
		out[i] = feeCategoryToModel(c)
	}
	return out, nil
}

func (r *queryResolver) FeeStructures(ctx context.Context, courseID *string) ([]*model.FeeStructure, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := feeStructureQuery(r.DB.WithContext(ctx)).Where("fee_structures.tenant_id = ?", auth.TenantID)
	if courseID != nil && *courseID != "" {
		q = q.Where("fee_structures.course_id = ?", *courseID)
	}
	var structures []models.FeeStructure
	if err := q.Order("created_at DESC").Find(&structures).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeeStructure, len(structures))
	for i, fs := range structures {
		out[i] = r.feeStructureToModelFull(ctx, fs)
	}
	return out, nil
}

func (r *queryResolver) FeeStructure(ctx context.Context, id string) (*model.FeeStructure, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var fs models.FeeStructure
	if err := feeStructureQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&fs).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r.feeStructureToModelFull(ctx, fs), nil
}

// ─── Category Mutations ───────────────────────────────────────────────────────

func (r *mutationResolver) CreateFeeCategory(ctx context.Context, input model.CreateFeeCategoryInput) (*model.FeeCategory, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Name == "" || input.Code == "" {
		return nil, GQLErr("name and code are required")
	}
	cat := models.FeeCategory{
		TenantID:    auth.TenantID,
		Name:        input.Name,
		Code:        input.Code,
		Description: strVal(input.Description),
		IsActive:    true,
	}
	if err := r.DB.WithContext(ctx).Create(&cat).Error; err != nil {
		return nil, err
	}
	return feeCategoryToModel(cat), nil
}

func (r *mutationResolver) UpdateFeeCategory(ctx context.Context, id string, input model.UpdateFeeCategoryInput) (*model.FeeCategory, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var cat models.FeeCategory
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&cat).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&cat).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return feeCategoryToModel(cat), nil
}

func (r *mutationResolver) DeleteFeeCategory(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var used int64
	r.DB.WithContext(ctx).Model(&models.FeeStructureItem{}).
		Where("tenant_id = ? AND fee_category_id = ?", auth.TenantID, id).Count(&used)
	if used > 0 {
		return false, GQLErr("category is used by a fee structure; remove it there first")
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.FeeCategory{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Structure Mutations ──────────────────────────────────────────────────────

func validateStructureItems(items []*model.FeeStructureItemInput) error {
	if len(items) == 0 {
		return GQLErr("a fee structure needs at least one line item")
	}
	seen := map[string]bool{}
	for _, it := range items {
		if it.Amount <= 0 {
			return GQLErr("item amounts must be greater than zero")
		}
		if it.YearNumber < 1 {
			return GQLErr("item year numbers must be 1 or higher")
		}
		key := fmt.Sprintf("%s#%d", it.FeeCategoryID, it.YearNumber)
		if seen[key] {
			return GQLErr("each fee category can appear only once per year")
		}
		seen[key] = true
	}
	return nil
}

// insertStructureItems persists validated line items for a structure.
func insertStructureItems(tx *gorm.DB, tenantID, structureID string, items []*model.FeeStructureItemInput) error {
	for _, it := range items {
		item := models.FeeStructureItem{
			TenantID:       tenantID,
			FeeStructureID: structureID,
			FeeCategoryID:  it.FeeCategoryID,
			YearNumber:     it.YearNumber,
			Amount:         it.Amount,
		}
		if err := tx.Create(&item).Error; err != nil {
			return err
		}
	}
	return nil
}

// resolveStructureBatch validates an optional batch id against the course.
func (r *Resolver) resolveStructureBatch(ctx context.Context, tenantID, courseID string, batchID *string) (*string, error) {
	if batchID == nil || strings.TrimSpace(*batchID) == "" {
		return nil, nil
	}
	var batch models.CourseBatch
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND course_id = ?", *batchID, tenantID, courseID).
		First(&batch).Error; err != nil {
		return nil, GQLErr("batch not found under the selected course")
	}
	return &batch.ID, nil
}

func (r *mutationResolver) CreateFeeStructure(ctx context.Context, input model.CreateFeeStructureInput) (*model.FeeStructure, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Name == "" || input.Code == "" {
		return nil, GQLErr("name and code are required")
	}
	var course models.Course
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", input.CourseID, auth.TenantID).First(&course).Error; err != nil {
		return nil, GQLErr("course not found")
	}
	if err := validateStructureItems(input.Items); err != nil {
		return nil, err
	}
	batchID, err := r.resolveStructureBatch(ctx, auth.TenantID, course.ID, input.BatchID)
	if err != nil {
		return nil, err
	}
	fs := models.FeeStructure{
		TenantID:    auth.TenantID,
		CourseID:    course.ID,
		Name:        input.Name,
		Code:        input.Code,
		BatchID:     batchID,
		Description: strVal(input.Description),
		IsActive:    true,
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&fs).Error; err != nil {
			return err
		}
		return insertStructureItems(tx, auth.TenantID, fs.ID, input.Items)
	})
	if err != nil {
		return nil, err
	}
	return r.Query().FeeStructure(ctx, fs.ID)
}

func (r *mutationResolver) UpdateFeeStructure(ctx context.Context, id string, input model.UpdateFeeStructureInput) (*model.FeeStructure, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var fs models.FeeStructure
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&fs).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{}
		if input.Name != nil {
			updates["name"] = *input.Name
		}
		if input.Description != nil {
			updates["description"] = *input.Description
		}
		if input.IsActive != nil {
			updates["is_active"] = *input.IsActive
		}
		if input.BatchID != nil {
			batchID, err := r.resolveStructureBatch(ctx, auth.TenantID, fs.CourseID, input.BatchID)
			if err != nil {
				return err
			}
			updates["batch_id"] = batchID
		}
		if len(updates) > 0 {
			if err := tx.Model(&fs).Updates(updates).Error; err != nil {
				return err
			}
		}
		if input.Items != nil {
			var allocations int64
			tx.Model(&models.FeeAllocation{}).Where("fee_structure_id = ?", fs.ID).Count(&allocations)
			if allocations > 0 {
				return GQLErr("items are locked because allocations use this structure; create a new variation instead")
			}
			if err := validateStructureItems(input.Items); err != nil {
				return err
			}
			if err := tx.Where("fee_structure_id = ?", fs.ID).Delete(&models.FeeStructureItem{}).Error; err != nil {
				return err
			}
			if err := insertStructureItems(tx, auth.TenantID, fs.ID, input.Items); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.Query().FeeStructure(ctx, fs.ID)
}

func (r *mutationResolver) DeleteFeeStructure(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var allocations int64
	r.DB.WithContext(ctx).Model(&models.FeeAllocation{}).
		Where("tenant_id = ? AND fee_structure_id = ?", auth.TenantID, id).Count(&allocations)
	if allocations > 0 {
		return false, GQLErr("structure has allocations; delete those first")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("fee_structure_id = ?", id).Delete(&models.FeeStructureItem{}).Error; err != nil {
			return err
		}
		res := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.FeeStructure{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

// CloneFeeStructure duplicates a structure with all its items as a new
// variation under the same course — the quick way to create an NRI,
// management-quota, or scholarship tier from the regular fees.
func (r *mutationResolver) CloneFeeStructure(ctx context.Context, id string, name string, code string) (*model.FeeStructure, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if name == "" || code == "" {
		return nil, GQLErr("name and code are required")
	}
	var src models.FeeStructure
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Preload("Items").First(&src).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	clone := models.FeeStructure{
		TenantID:    auth.TenantID,
		CourseID:    src.CourseID,
		Name:        name,
		Code:        code,
		BatchID:     src.BatchID,
		Description: src.Description,
		IsActive:    true,
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&clone).Error; err != nil {
			return err
		}
		for _, it := range src.Items {
			item := models.FeeStructureItem{
				TenantID:       auth.TenantID,
				FeeStructureID: clone.ID,
				FeeCategoryID:  it.FeeCategoryID,
				YearNumber:     it.YearNumber,
				Amount:         it.Amount,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.Query().FeeStructure(ctx, clone.ID)
}
