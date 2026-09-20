package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Curriculum lists every subject assigned to a course, across all semesters.
// The frontend groups them by semester and year. Visible to any authenticated
// user (it feeds read-only views too); writes are admin-only.
func (r *queryResolver) Curriculum(ctx context.Context, courseID string) ([]*model.CurriculumSubject, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.CurriculumSubject
	if err := r.DB.WithContext(ctx).
		Preload("Subject").
		Preload("Subject.Department").
		Where("tenant_id = ? AND course_id = ?", auth.TenantID, courseID).
		Order("semester_number ASC, sort_order ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.CurriculumSubject, len(rows))
	for i, c := range rows {
		out[i] = curriculumSubjectToModel(c)
	}
	return out, nil
}

// SetCurriculumSubjects replaces the full set of subjects for one (course,
// semester) pair. Sending an empty list clears that semester.
func (r *mutationResolver) SetCurriculumSubjects(ctx context.Context, input model.SetCurriculumSubjectsInput) ([]*model.CurriculumSubject, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := tx.Where("tenant_id = ? AND course_id = ? AND semester_number = ?",
			auth.TenantID, input.CourseID, input.SemesterNumber).
			Delete(&models.CurriculumSubject{}).Error; e != nil {
			return e
		}
		seen := map[string]bool{}
		order := 0
		for _, sid := range input.SubjectIds {
			if sid == "" || seen[sid] {
				continue
			}
			seen[sid] = true
			row := models.CurriculumSubject{
				ID:             uuid.NewString(),
				TenantID:       auth.TenantID,
				CourseID:       input.CourseID,
				SemesterNumber: input.SemesterNumber,
				SubjectID:      sid,
				SortOrder:      order,
			}
			if e := tx.Create(&row).Error; e != nil {
				return e
			}
			order++
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	var rows []models.CurriculumSubject
	if err := r.DB.WithContext(ctx).
		Preload("Subject").
		Preload("Subject.Department").
		Where("tenant_id = ? AND course_id = ? AND semester_number = ?",
			auth.TenantID, input.CourseID, input.SemesterNumber).
		Order("sort_order ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.CurriculumSubject, len(rows))
	for i, c := range rows {
		out[i] = curriculumSubjectToModel(c)
	}
	return out, nil
}

func curriculumSubjectToModel(c models.CurriculumSubject) *model.CurriculumSubject {
	m := &model.CurriculumSubject{
		ID:             c.ID,
		CourseID:       c.CourseID,
		SemesterNumber: c.SemesterNumber,
		Subject:        subjectToModel(c.Subject),
	}
	m.SortOrder = toIntPtr(c.SortOrder)
	return m
}
