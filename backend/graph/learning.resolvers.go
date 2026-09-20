package graph

// Learning Matrix goal, section, and unit resolvers. Progress and assignment
// resolvers live in learning_progress.resolvers.go; shared helpers and model
// converters live in learning_helpers.go.
//
// NOTE: This file refers to types in graph/model that are produced by
// gqlgen from the schema changes. After pulling these changes, run:
//
//	cd backend && go run github.com/99designs/gqlgen generate
//
// ...so the model package picks up LearningGoal, LearningSection,
// LearningItem, GoalAssignmentItem, EmployeeGoalProgress, ItemProgress,
// ModuleVideoUpload, and the matching input structs.

import (
	"context"
	"errors"
	"fmt"

	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// ─── Queries ──────────────────────────────────────────────────────────────

func (r *queryResolver) LearningGoals(ctx context.Context) ([]*model.LearningGoal, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var goals []models.LearningGoal
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", auth.TenantID).
		Order("created_at desc").
		Find(&goals).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LearningGoal, len(goals))
	for i, g := range goals {
		out[i] = goalToModel(r.DB.WithContext(ctx), g)
	}
	return out, nil
}

func (r *queryResolver) LearningGoal(ctx context.Context, id string) (*model.LearningGoal, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var g models.LearningGoal
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return goalToModel(r.DB.WithContext(ctx), g), nil
}

// ─── Mutations: Goal ──────────────────────────────────────────────────────

func (r *mutationResolver) CreateLearningGoal(ctx context.Context, input model.CreateLearningGoalInput) (*model.LearningGoal, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	g := models.LearningGoal{
		TenantID:    auth.TenantID,
		Title:       input.Title,
		Description: stringOrEmpty(input.Description),
		DueDate:     parseDatePtr(input.DueDate),
		IsMandatory: input.IsMandatory,
	}
	if err := r.DB.WithContext(ctx).Create(&g).Error; err != nil {
		return nil, err
	}
	return goalToModel(r.DB.WithContext(ctx), g), nil
}

func (r *mutationResolver) UpdateLearningGoal(ctx context.Context, id string, input model.UpdateLearningGoalInput) (*model.LearningGoal, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var g models.LearningGoal
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&g).Error; err != nil {
		return nil, ErrNotFound
	}
	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.DueDate != nil {
		updates["due_date"] = parseDatePtr(input.DueDate)
	}
	if input.IsMandatory != nil {
		updates["is_mandatory"] = *input.IsMandatory
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&g).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.DB.WithContext(ctx).First(&g, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return goalToModel(r.DB.WithContext(ctx), g), nil
}

func (r *mutationResolver) DeleteLearningGoal(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	return true, r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Cascade: goal → sections → units/assignments → progress
		var sectionIDs []string
		tx.Model(&models.LearningSection{}).
			Where("goal_id = ?", id).Pluck("id", &sectionIDs)
		if len(sectionIDs) > 0 {
			tx.Where("section_id IN ?", sectionIDs).Delete(&models.LearningUnit{})
			tx.Where("section_id IN ?", sectionIDs).Delete(&models.LearningAssignment{})
		}
		tx.Where("goal_id = ?", id).Delete(&models.LearningSection{})

		// Delete progress rows + their children
		var progIDs []string
		tx.Model(&models.EmployeeGoalProgress{}).
			Where("goal_id = ?", id).Pluck("id", &progIDs)
		if len(progIDs) > 0 {
			tx.Where("employee_goal_progress_id IN ?", progIDs).Delete(&models.UnitProgress{})
			tx.Where("employee_goal_progress_id IN ?", progIDs).Delete(&models.AssignmentProgress{})
		}
		tx.Where("goal_id = ?", id).Delete(&models.EmployeeGoalProgress{})
		tx.Where("goal_id = ?", id).Delete(&models.GoalAssignment{})

		res := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.LearningGoal{})
		if res.RowsAffected == 0 {
			return ErrNotFound
		}
		return res.Error
	})
}

// ─── Mutations: Section ───────────────────────────────────────────────────

func (r *mutationResolver) CreateLearningSection(ctx context.Context, input model.CreateLearningSectionInput) (*model.LearningSection, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	if err := r.assertGoalInTenant(ctx, input.GoalID, auth.TenantID); err != nil {
		return nil, err
	}
	s := models.LearningSection{
		GoalID:     input.GoalID,
		Title:      input.Title,
		OrderIndex: input.OrderIndex,
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	return sectionToModel(r.DB.WithContext(ctx), s), nil
}

func (r *mutationResolver) UpdateLearningSection(ctx context.Context, id string, input model.UpdateLearningSectionInput) (*model.LearningSection, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var s models.LearningSection
	if err := r.DB.WithContext(ctx).First(&s, "id = ?", id).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertGoalInTenant(ctx, s.GoalID, auth.TenantID); err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.OrderIndex != nil {
		updates["order_index"] = *input.OrderIndex
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&s).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	r.DB.WithContext(ctx).First(&s, "id = ?", id)
	return sectionToModel(r.DB.WithContext(ctx), s), nil
}

func (r *mutationResolver) DeleteLearningSection(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	var s models.LearningSection
	if err := r.DB.WithContext(ctx).First(&s, "id = ?", id).Error; err != nil {
		return false, ErrNotFound
	}
	if err := r.assertGoalInTenant(ctx, s.GoalID, auth.TenantID); err != nil {
		return false, err
	}
	return true, r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		tx.Where("section_id = ?", id).Delete(&models.LearningUnit{})
		tx.Where("section_id = ?", id).Delete(&models.LearningAssignment{})
		return tx.Delete(&s).Error
	})
}

// ─── Mutations: Unit ──────────────────────────────────────────────────────

func (r *mutationResolver) CreateLearningUnit(ctx context.Context, input model.CreateLearningUnitInput) (*model.LearningItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	if err := r.assertSectionInTenant(ctx, input.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	orderIndex := input.OrderIndex
	if orderIndex <= 0 {
		orderIndex = r.nextSectionOrderIndex(ctx, input.SectionID)
	}
	u := models.LearningUnit{
		SectionID:   input.SectionID,
		Title:       input.Title,
		Description: stringOrEmpty(input.Description),
		OrderIndex:  orderIndex,
		VideoType:   stringOrDefault(input.VideoType, "none"),
		VideoURL:    stringOrEmpty(input.VideoURL),
		Content:     stringOrEmpty(input.Content),
	}
	if u.VideoType == "external" && u.VideoURL == "" {
		return nil, fmt.Errorf("%w: videoUrl required for external videos", ErrValidation)
	}
	if err := r.DB.WithContext(ctx).Create(&u).Error; err != nil {
		return nil, err
	}
	return unitToItemModel(u), nil
}

func (r *mutationResolver) UpdateLearningUnit(ctx context.Context, id string, input model.UpdateLearningUnitInput) (*model.LearningItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var u models.LearningUnit
	if err := r.DB.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, u.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.OrderIndex != nil {
		updates["order_index"] = *input.OrderIndex
	}
	if input.VideoType != nil {
		updates["video_type"] = *input.VideoType
	}
	if input.VideoURL != nil {
		updates["video_url"] = *input.VideoURL
	}
	if input.Content != nil {
		updates["content"] = *input.Content
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&u).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	r.DB.WithContext(ctx).First(&u, "id = ?", id)
	return unitToItemModel(u), nil
}

func (r *mutationResolver) DeleteLearningUnit(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	var u models.LearningUnit
	if err := r.DB.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		return false, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, u.SectionID, auth.TenantID); err != nil {
		return false, err
	}
	return true, r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		tx.Where("unit_id = ?", id).Delete(&models.UnitProgress{})
		return tx.Delete(&u).Error
	})
}

func (r *mutationResolver) UploadUnitVideo(ctx context.Context, unitID, filename, contentType string) (*model.ModuleVideoUpload, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var u models.LearningUnit
	if err := r.DB.WithContext(ctx).First(&u, "id = ?", unitID).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, u.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	storage := utils.NewVideoStorage()
	uploadURL, storagePath, err := storage.Reserve(unitID, filename, contentType)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}
	return &model.ModuleVideoUpload{
		UnitID:           unitID,
		UploadURL:        uploadURL,
		VideoStoragePath: storagePath,
	}, nil
}
