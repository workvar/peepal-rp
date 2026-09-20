package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func (r *mutationResolver) CreateCourse(ctx context.Context, input model.CreateCourseInput) (*model.Course, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	c := models.Course{
		TenantID: auth.TenantID,
		Name:     input.Name,
		Code:     input.Code,
	}
	if input.Description != nil {
		c.Description = *input.Description
	}
	if input.DurationYears != nil {
		c.DurationYears = *input.DurationYears
	}
	if input.TotalSemesters != nil {
		c.TotalSemesters = *input.TotalSemesters
	}
	if input.DepartmentID != nil {
		c.DepartmentID = *input.DepartmentID
	}
	if err := r.DB.WithContext(ctx).Create(&c).Error; err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, errors.New("a course with this code already exists")
		}
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Department").Where("id = ?", c.ID).First(&c).Error; err != nil {
		return nil, err
	}
	return courseToModel(c), nil
}

func (r *mutationResolver) UpdateCourse(ctx context.Context, id string, input model.UpdateCourseInput) (*model.Course, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Code != nil {
		updates["code"] = *input.Code
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.DurationYears != nil {
		updates["duration_years"] = *input.DurationYears
	}
	if input.TotalSemesters != nil {
		updates["total_semesters"] = *input.TotalSemesters
	}
	if input.DepartmentID != nil {
		updates["department_id"] = *input.DepartmentID
	}
	res := r.DB.WithContext(ctx).
		Model(&models.Course{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var c models.Course
	if err := r.DB.WithContext(ctx).Preload("Department").Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return courseToModel(c), nil
}

func (r *mutationResolver) DeleteCourse(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Course{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// courseToModel converts a DB Course to the GraphQL model.
func courseToModel(c models.Course) *model.Course {
	batches := make([]*model.CourseBatch, len(c.Batches))
	for i, b := range c.Batches {
		batches[i] = courseBatchToModel(b)
	}
	m := &model.Course{
		ID:      c.ID,
		Name:    c.Name,
		Code:    c.Code,
		Batches: batches,
	}
	if c.Description != "" {
		m.Description = &c.Description
	}
	if c.DurationYears != 0 {
		m.DurationYears = &c.DurationYears
	}
	if c.TotalSemesters != 0 {
		m.TotalSemesters = &c.TotalSemesters
	}
	if c.DepartmentID != "" {
		m.DepartmentID = &c.DepartmentID
	}
	if c.Department.ID != "" {
		m.Department = &model.Department{ID: c.Department.ID, Name: c.Department.Name}
	}
	return m
}

func courseBatchToModel(b models.CourseBatch) *model.CourseBatch {
	return &model.CourseBatch{
		ID:        b.ID,
		CourseID:  b.CourseID,
		Name:      b.Name,
		StartYear: b.StartYear,
		EndYear:   b.EndYear,
	}
}

// CourseBatches returns batches for a course (query resolver).
func (r *queryResolver) CourseBatches(ctx context.Context, courseID string) ([]*model.CourseBatch, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var batches []models.CourseBatch
	if err := r.DB.WithContext(ctx).
		Where("course_id = ? AND tenant_id = ?", courseID, auth.TenantID).
		Order("start_year ASC").
		Find(&batches).Error; err != nil {
		return nil, err
	}
	out := make([]*model.CourseBatch, len(batches))
	for i, b := range batches {
		out[i] = courseBatchToModel(b)
	}
	return out, nil
}

// CreateCourseBatch creates a batch under a course, auto-computing the name.
func (r *mutationResolver) CreateCourseBatch(ctx context.Context, courseID string, startYear int) (*model.CourseBatch, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	// Fetch course to get duration.
	var c models.Course
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", courseID, auth.TenantID).
		First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	duration := c.DurationYears
	if duration <= 0 {
		duration = 4
	}
	endYear := startYear + duration
	name := fmt.Sprintf("%d-%d", startYear, endYear)
	b := models.CourseBatch{
		TenantID:  auth.TenantID,
		CourseID:  courseID,
		StartYear: startYear,
		EndYear:   endYear,
		Name:      name,
	}
	if err := r.DB.WithContext(ctx).Create(&b).Error; err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, errors.New("batch already exists for this year")
		}
		return nil, err
	}
	return courseBatchToModel(b), nil
}

// DeleteCourseBatch removes a batch.
func (r *mutationResolver) DeleteCourseBatch(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.CourseBatch{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}
