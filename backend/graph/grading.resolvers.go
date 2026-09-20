package graph

import (
	"context"
	"errors"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GradingScheme returns the tenant's grading configuration, lazily seeding a
// sensible default (10-point Indian scale) on first read so the admin page and
// the student portal always have something to work with.
func (r *queryResolver) GradingScheme(ctx context.Context) (*model.GradingScheme, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	scheme, err := loadOrCreateScheme(ctx, r.DB, auth.TenantID)
	if err != nil {
		return nil, err
	}
	return gradingSchemeToModel(scheme), nil
}

// SaveGradingScheme upserts the tenant's scheme and replaces its grade bands in
// one transaction. Admin only.
func (r *mutationResolver) SaveGradingScheme(ctx context.Context, input model.SaveGradingSchemeInput) (*model.GradingScheme, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if err := validateSchemeInput(input); err != nil {
		return nil, err
	}

	var scheme models.GradingScheme
	findErr := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).First(&scheme).Error
	isNew := errors.Is(findErr, gorm.ErrRecordNotFound)
	if findErr != nil && !isNew {
		return nil, findErr
	}

	scheme.TenantID = auth.TenantID
	scheme.Mode = input.Mode
	scheme.GpaMax = input.GpaMax
	scheme.PassThreshold = input.PassThreshold
	scheme.Decimals = input.Decimals
	scheme.CreditWeighted = input.CreditWeighted
	scheme.WeightedByExamType = input.WeightedByExamType

	txErr := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if isNew {
			scheme.ID = uuid.NewString()
			if err := tx.Create(&scheme).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Save(&scheme).Error; err != nil {
				return err
			}
			if err := tx.Where("scheme_id = ?", scheme.ID).Delete(&models.GradeBand{}).Error; err != nil {
				return err
			}
		}
		for _, b := range input.Bands {
			band := models.GradeBand{
				ID:         uuid.NewString(),
				SchemeID:   scheme.ID,
				TenantID:   auth.TenantID,
				Letter:     b.Letter,
				MinPercent: b.MinPercent,
				MaxPercent: b.MaxPercent,
				GradePoint: b.GradePoint,
				IsPass:     b.IsPass,
				SortOrder:  b.SortOrder,
			}
			if err := tx.Create(&band).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}

	saved, err := loadOrCreateScheme(ctx, r.DB, auth.TenantID)
	if err != nil {
		return nil, err
	}
	return gradingSchemeToModel(saved), nil
}

// StudentAcademicResult computes a student's semester-wise and cumulative
// results from their published marks. Students get their own; admins/teachers
// may pass a studentId.
func (r *queryResolver) StudentAcademicResult(ctx context.Context, studentID *string) (*model.AcademicResult, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var student models.Student
	q := r.DB.WithContext(ctx).Preload("User").Preload("Course").Where("tenant_id = ?", auth.TenantID)
	switch auth.Role {
	case roleStudent:
		q = q.Where("user_id = ?", auth.UserID)
	case roleAdmin, roleTeacher:
		if studentID == nil || *studentID == "" {
			return nil, errors.New("studentId is required")
		}
		q = q.Where("id = ?", *studentID)
	default:
		return nil, ErrForbidden
	}
	if err := q.First(&student).Error; err != nil {
		return nil, ErrNotFound
	}

	scheme, err := loadOrCreateScheme(ctx, r.DB, auth.TenantID)
	if err != nil {
		return nil, err
	}
	return computeAcademicResult(ctx, r.DB, auth.TenantID, student, scheme)
}

// --- conversion + validation ---

func gradingSchemeToModel(s models.GradingScheme) *model.GradingScheme {
	bands := make([]*model.GradeBand, len(s.Bands))
	for i, b := range s.Bands {
		bands[i] = &model.GradeBand{
			ID:         b.ID,
			Letter:     b.Letter,
			MinPercent: b.MinPercent,
			MaxPercent: b.MaxPercent,
			GradePoint: b.GradePoint,
			IsPass:     b.IsPass,
			SortOrder:  b.SortOrder,
		}
	}
	return &model.GradingScheme{
		ID:                 s.ID,
		Mode:               s.Mode,
		GpaMax:             s.GpaMax,
		PassThreshold:      s.PassThreshold,
		Decimals:           s.Decimals,
		CreditWeighted:     s.CreditWeighted,
		WeightedByExamType: s.WeightedByExamType,
		Bands:              bands,
	}
}

func validateSchemeInput(in model.SaveGradingSchemeInput) error {
	allowed := map[string]bool{"cgpa": true, "gpa": true, "percentage": true, "letter": true, "pass_fail": true}
	if !allowed[in.Mode] {
		return errors.New("invalid grading mode")
	}
	if in.GpaMax <= 0 {
		return errors.New("gpaMax must be a positive number")
	}
	if len(in.Bands) == 0 {
		return errors.New("at least one grade band is required")
	}
	return nil
}
