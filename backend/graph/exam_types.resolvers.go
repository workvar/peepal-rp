package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// ExamTypes lists assessment definitions for a tenant. When departmentID is
// given, it returns that department's types plus any org-wide (blank-department)
// types, so a marks form can show exactly the options valid for a subject.
func (r *queryResolver) ExamTypes(ctx context.Context, departmentID *string, includeInactive *bool) ([]*model.ExamType, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).
		Preload("Department").
		Where("tenant_id = ?", auth.TenantID)
	if departmentID != nil && *departmentID != "" {
		// Explicit parens keep this OR scoped under the tenant_id AND above —
		// without them org-wide rows could leak across tenants.
		query = query.Where("(department_id = ? OR department_id = '')", *departmentID)
	}
	if includeInactive == nil || !*includeInactive {
		query = query.Where("active = ?", true)
	}
	var rows []models.ExamType
	if err := query.Order("department_id ASC, name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.ExamType, len(rows))
	for i, e := range rows {
		out[i] = examTypeToModel(e)
	}
	return out, nil
}

func (r *mutationResolver) CreateExamType(ctx context.Context, input model.CreateExamTypeInput) (*model.ExamType, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("exam name is required")
	}
	e := models.ExamType{
		ID:        uuid.NewString(),
		TenantID:  auth.TenantID,
		Name:      name,
		MaxMarks:  input.MaxMarks,
		Weightage: floatVal(input.Weightage),
		Active:    true,
	}
	if input.DepartmentID != nil {
		e.DepartmentID = strings.TrimSpace(*input.DepartmentID)
	}
	if input.Active != nil {
		e.Active = *input.Active
	}
	if e.MaxMarks <= 0 {
		e.MaxMarks = 100
	}
	if err := r.DB.WithContext(ctx).Create(&e).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Department").Where("id = ?", e.ID).First(&e).Error; err != nil {
		return nil, err
	}
	return examTypeToModel(e), nil
}

func (r *mutationResolver) UpdateExamType(ctx context.Context, id string, input model.UpdateExamTypeInput) (*model.ExamType, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = strings.TrimSpace(*input.Name)
	}
	if input.DepartmentID != nil {
		updates["department_id"] = strings.TrimSpace(*input.DepartmentID)
	}
	if input.MaxMarks != nil {
		updates["max_marks"] = *input.MaxMarks
	}
	if input.Weightage != nil {
		updates["weightage"] = *input.Weightage
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).
		Model(&models.ExamType{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var e models.ExamType
	if err := r.DB.WithContext(ctx).
		Preload("Department").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&e).Error; err != nil {
		return nil, err
	}
	return examTypeToModel(e), nil
}

func (r *mutationResolver) DeleteExamType(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.ExamType{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// --- helpers ---

func examTypeToModel(e models.ExamType) *model.ExamType {
	m := &model.ExamType{
		ID:       e.ID,
		Name:     e.Name,
		MaxMarks: e.MaxMarks,
		Active:   e.Active,
	}
	m.DepartmentID = toStrPtr(e.DepartmentID)
	if e.Weightage != 0 {
		w := e.Weightage
		m.Weightage = &w
	}
	if !e.CreatedAt.IsZero() {
		c := e.CreatedAt.Format(time.RFC3339)
		m.CreatedAt = &c
	}
	if e.Department.ID != "" {
		m.Department = &model.Department{ID: e.Department.ID, Name: e.Department.Name}
	}
	return m
}
