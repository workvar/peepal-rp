package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (r *queryResolver) Subjects(ctx context.Context, departmentID *string, search *string) ([]*model.Subject, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).
		Preload("Department").
		Where("tenant_id = ?", auth.TenantID)
	if departmentID != nil && *departmentID != "" {
		query = query.Where("department_id = ?", *departmentID)
	}
	if search != nil && *search != "" {
		q := "%" + strings.ToLower(*search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ?", q, q)
	}
	var rows []models.Subject
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Subject, len(rows))
	for i, s := range rows {
		out[i] = subjectToModel(s)
	}
	return out, nil
}

func (r *queryResolver) Subject(ctx context.Context, id string) (*model.Subject, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var s models.Subject
	if err := r.DB.WithContext(ctx).
		Preload("Department").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return subjectToModel(s), nil
}

func (r *queryResolver) AcademicYears(ctx context.Context) ([]*model.AcademicYear, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.AcademicYear
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", auth.TenantID).
		Order("start_date DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AcademicYear, len(rows))
	for i, ay := range rows {
		out[i] = academicYearToModel(ay)
	}
	return out, nil
}

func (r *queryResolver) ExamSchedules(ctx context.Context, semesterNumber *int, examType *string) ([]*model.ExamSchedule, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if semesterNumber != nil {
		query = query.Where("semester_number = ?", *semesterNumber)
	}
	if examType != nil && *examType != "" {
		query = query.Where("exam_type = ?", *examType)
	}
	var rows []models.ExamSchedule
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.ExamSchedule, len(rows))
	for i, e := range rows {
		out[i] = examScheduleToModel(e)
	}
	return out, nil
}

func (r *mutationResolver) CreateSubject(ctx context.Context, input model.CreateSubjectInput) (*model.Subject, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	s := models.Subject{
		ID:       uuid.NewString(),
		TenantID: auth.TenantID,
		Name:     input.Name,
		Code:     input.Code,
	}
	if input.DepartmentID != nil {
		s.DepartmentID = *input.DepartmentID
	}
	if input.Credits != nil {
		s.Credits = *input.Credits
	}
	if input.TeachingHours != nil {
		s.TeachingHours = *input.TeachingHours
	}
	if input.LabHours != nil {
		s.LabHours = *input.LabHours
	}
	if input.SemesterNumber != nil {
		s.SemesterNumber = *input.SemesterNumber
	}
	if input.Description != nil {
		s.Description = *input.Description
	}
	if input.SyllabusURL != nil {
		s.SyllabusURL = *input.SyllabusURL
	}
	s.CourseOutcomes = outcomesToText(input.CourseOutcomes)
	s.UnitsJSON = unitsInputToJSON(input.Units)
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Department").Where("id = ?", s.ID).First(&s).Error; err != nil {
		return nil, err
	}
	return subjectToModel(s), nil
}

func (r *mutationResolver) UpdateSubject(ctx context.Context, id string, input model.UpdateSubjectInput) (*model.Subject, error) {
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
	if input.DepartmentID != nil {
		updates["department_id"] = *input.DepartmentID
	}
	if input.Credits != nil {
		updates["credits"] = *input.Credits
	}
	if input.TeachingHours != nil {
		updates["teaching_hours"] = *input.TeachingHours
	}
	if input.LabHours != nil {
		updates["lab_hours"] = *input.LabHours
	}
	if input.SemesterNumber != nil {
		updates["semester_number"] = *input.SemesterNumber
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.SyllabusURL != nil {
		updates["syllabus_url"] = *input.SyllabusURL
	}
	if input.CourseOutcomes != nil {
		updates["course_outcomes"] = outcomesToText(input.CourseOutcomes)
	}
	if input.Units != nil {
		updates["units_json"] = unitsInputToJSON(input.Units)
	}
	res := r.DB.WithContext(ctx).
		Model(&models.Subject{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var s models.Subject
	if err := r.DB.WithContext(ctx).Preload("Department").Where("id = ?", id).First(&s).Error; err != nil {
		return nil, err
	}
	return subjectToModel(s), nil
}

func (r *mutationResolver) DeleteSubject(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Subject{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) CreateExamSchedule(ctx context.Context, input model.CreateExamScheduleInput) (*model.ExamSchedule, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	e := models.ExamSchedule{
		ID:       uuid.NewString(),
		TenantID: auth.TenantID,
		Name:     input.Name,
		ExamType: input.ExamType,
	}
	if input.SemesterNumber != nil {
		e.SemesterNumber = *input.SemesterNumber
	}
	if input.Instructions != nil {
		e.Instructions = *input.Instructions
	}
	if input.AcademicYearID != nil {
		e.AcademicYearID = *input.AcademicYearID
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, parseErr := time.Parse("2006-01-02", *input.StartDate); parseErr == nil {
			e.StartDate = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, parseErr := time.Parse("2006-01-02", *input.EndDate); parseErr == nil {
			e.EndDate = t
		}
	}
	if err := r.DB.WithContext(ctx).Create(&e).Error; err != nil {
		return nil, err
	}
	return examScheduleToModel(e), nil
}

func (r *mutationResolver) UpdateExamSchedule(ctx context.Context, id string, input model.UpdateExamScheduleInput) (*model.ExamSchedule, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.ExamType != nil {
		updates["exam_type"] = *input.ExamType
	}
	if input.SemesterNumber != nil {
		updates["semester_number"] = *input.SemesterNumber
	}
	if input.Instructions != nil {
		updates["instructions"] = *input.Instructions
	}
	if input.AcademicYearID != nil {
		updates["academic_year_id"] = *input.AcademicYearID
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, parseErr := time.Parse("2006-01-02", *input.StartDate); parseErr == nil {
			updates["start_date"] = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, parseErr := time.Parse("2006-01-02", *input.EndDate); parseErr == nil {
			updates["end_date"] = t
		}
	}
	res := r.DB.WithContext(ctx).
		Model(&models.ExamSchedule{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var e models.ExamSchedule
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&e).Error; err != nil {
		return nil, err
	}
	return examScheduleToModel(e), nil
}

func (r *mutationResolver) PublishExamSchedule(ctx context.Context, id string, published bool) (*model.ExamSchedule, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).
		Model(&models.ExamSchedule{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("published", published)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var e models.ExamSchedule
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&e).Error; err != nil {
		return nil, err
	}
	return examScheduleToModel(e), nil
}

func (r *mutationResolver) DeleteExamSchedule(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.ExamSchedule{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) DeleteSemester(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Semester{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) DeleteAcademicYear(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	// Delete child semesters first to avoid FK violations.
	r.DB.WithContext(ctx).
		Where("academic_year_id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Semester{})
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.AcademicYear{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// --- helpers ---

func subjectToModel(s models.Subject) *model.Subject {
	m := &model.Subject{
		ID:   s.ID,
		Name: s.Name,
		Code: s.Code,
	}
	m.Credits = toIntPtr(s.Credits)
	m.TeachingHours = toIntPtr(s.TeachingHours)
	m.LabHours = toIntPtr(s.LabHours)
	m.SemesterNumber = toIntPtr(s.SemesterNumber)
	m.Description = toStrPtr(s.Description)
	m.SyllabusURL = toStrPtr(s.SyllabusURL)
	m.DepartmentID = toStrPtr(s.DepartmentID)
	if s.Department.ID != "" {
		m.Department = &model.Department{ID: s.Department.ID, Name: s.Department.Name}
	}
	m.CourseOutcomes = outcomesToList(s.CourseOutcomes)
	m.Units = unitsFromJSON(s.UnitsJSON)
	return m
}

func academicYearToModel(ay models.AcademicYear) *model.AcademicYear {
	return &model.AcademicYear{
		ID:        ay.ID,
		Name:      ay.Name,
		StartDate: ay.StartDate.Format("2006-01-02"),
		EndDate:   ay.EndDate.Format("2006-01-02"),
		IsCurrent: ay.IsCurrent,
	}
}

func examScheduleToModel(e models.ExamSchedule) *model.ExamSchedule {
	m := &model.ExamSchedule{
		ID:        e.ID,
		Name:      e.Name,
		ExamType:  e.ExamType,
		Published: e.Published,
	}
	m.SemesterNumber = toIntPtr(e.SemesterNumber)
	m.Instructions = toStrPtr(e.Instructions)
	m.AcademicYearID = toStrPtr(e.AcademicYearID)
	if !e.StartDate.IsZero() {
		d := e.StartDate.Format("2006-01-02")
		m.StartDate = &d
	}
	if !e.EndDate.IsZero() {
		d := e.EndDate.Format("2006-01-02")
		m.EndDate = &d
	}
	return m
}
