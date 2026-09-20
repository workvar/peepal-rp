package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

func (r *queryResolver) Marks(ctx context.Context, studentID *string, subjectID *string, examType *string, semester *int, limit *int, offset *int, status *string) ([]*model.Mark, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Where("marks.tenant_id = ?", auth.TenantID).
		Order("marks.created_at DESC")

	// Row-level security: students only see their own marks
	if auth.Role == "student" {
		var s models.Student
		if err := r.DB.WithContext(ctx).
			Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).
			First(&s).Error; err != nil {
			return nil, ErrNotFound
		}
		query = query.Where("marks.student_id = ?", s.ID)
	} else if studentID != nil && *studentID != "" {
		query = query.Where("marks.student_id = ?", *studentID)
	}

	if subjectID != nil && *subjectID != "" {
		query = query.Where("marks.subject_id = ?", *subjectID)
	}
	if examType != nil && *examType != "" {
		query = query.Where("marks.exam_type = ?", *examType)
	}
	if semester != nil {
		query = query.Where("marks.semester = ?", *semester)
	}
	if status != nil && *status != "" {
		query = query.Where("marks.status = ?", *status)
	}

	pageLimit := 50
	if limit != nil && *limit > 0 && *limit <= 200 {
		pageLimit = *limit
	}
	query = query.Limit(pageLimit)
	if offset != nil && *offset > 0 {
		query = query.Offset(*offset)
	}

	var rows []models.Mark
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Mark, len(rows))
	for i, m := range rows {
		out[i] = markToModel(m)
	}
	return out, nil
}

func (r *queryResolver) MarksCount(ctx context.Context, studentID *string, subjectID *string, examType *string, status *string) (int, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return 0, err
	}
	query := r.DB.WithContext(ctx).Model(&models.Mark{}).
		Where("marks.tenant_id = ?", auth.TenantID)

	if auth.Role == "student" {
		var s models.Student
		if err := r.DB.WithContext(ctx).
			Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).
			First(&s).Error; err != nil {
			return 0, ErrNotFound
		}
		query = query.Where("marks.student_id = ?", s.ID)
	} else if studentID != nil && *studentID != "" {
		query = query.Where("marks.student_id = ?", *studentID)
	}
	if subjectID != nil && *subjectID != "" {
		query = query.Where("marks.subject_id = ?", *subjectID)
	}
	if examType != nil && *examType != "" {
		query = query.Where("marks.exam_type = ?", *examType)
	}
	if status != nil && *status != "" {
		query = query.Where("marks.status = ?", *status)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *queryResolver) PublishedResults(ctx context.Context, examType *string, subject *string, semester *int, courseID *string) ([]*model.Mark, error) {
	// Published results are intentionally visible to all authenticated users.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Course").
		Where("marks.tenant_id = ? AND marks.is_published = true", auth.TenantID)

	if examType != nil && *examType != "" {
		query = query.Where("marks.exam_type = ?", *examType)
	}
	if subject != nil && *subject != "" {
		query = query.Where("marks.subject = ?", *subject)
	}
	if semester != nil {
		query = query.Where("marks.semester = ?", *semester)
	}
	if courseID != nil && *courseID != "" {
		query = query.Joins("JOIN students ON marks.student_id = students.id AND students.tenant_id = marks.tenant_id").
			Where("students.course_id = ?", *courseID)
	}

	var rows []models.Mark
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Mark, len(rows))
	for i, m := range rows {
		out[i] = markToModel(m)
	}
	return out, nil
}

func (r *queryResolver) ResultSummary(ctx context.Context, courseID string, semester int) (*model.ResultSummary, error) {
	// Cross-student pass/fail aggregate: staff-facing.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}

	var total int64
	if err := r.DB.WithContext(ctx).
		Model(&models.Student{}).
		Where("tenant_id = ? AND course_id = ? AND semester = ?", auth.TenantID, courseID, semester).
		Count(&total).Error; err != nil {
		return nil, err
	}

	var failCount int64
	if err := r.DB.WithContext(ctx).
		Model(&models.Mark{}).
		Joins("JOIN students ON marks.student_id = students.id AND students.tenant_id = marks.tenant_id").
		Where("marks.tenant_id = ? AND students.course_id = ? AND marks.semester = ? AND marks.is_published = true AND marks.grade = 'F'",
			auth.TenantID, courseID, semester).
		Distinct("marks.student_id").
		Count(&failCount).Error; err != nil {
		return nil, err
	}

	passCount := int(total) - int(failCount)
	if passCount < 0 {
		passCount = 0
	}
	return &model.ResultSummary{
		TotalStudents: int(total),
		PassCount:     passCount,
		FailCount:     int(failCount),
	}, nil
}

func (r *mutationResolver) CreateMark(ctx context.Context, input model.CreateMarkInput) (*model.Mark, error) {
	// Teachers enter marks; admins may correct them.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	grade := calculateGrade(input.MarksObtained, input.MaxMarks)

	m := models.Mark{
		ID:             uuid.NewString(),
		TenantID:       auth.TenantID,
		StudentID:      input.StudentID,
		Subject:        input.Subject,
		ExamType:       input.ExamType,
		Semester:       input.Semester,
		MarksObtained:  input.MarksObtained,
		MaxMarks:       input.MaxMarks,
		Grade:          grade,
		EnteredBy:      strVal(input.EnteredBy),
		AssessmentType: strVal(input.AssessmentType),
		AcademicYearID: strVal(input.AcademicYearID),
	}
	if input.SubjectID != nil {
		m.SubjectID = *input.SubjectID
	}

	if err := r.DB.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Where("id = ? AND tenant_id = ?", m.ID, auth.TenantID).
		First(&m).Error; err != nil {
		return nil, err
	}
	return markToModel(m), nil
}

func (r *mutationResolver) UpdateMark(ctx context.Context, id string, input model.UpdateMarkInput) (*model.Mark, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	var m models.Mark
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&m).Error; err != nil {
		return nil, ErrNotFound
	}
	m.MarksObtained = input.MarksObtained
	m.MaxMarks = input.MaxMarks
	m.Grade = calculateGrade(input.MarksObtained, input.MaxMarks)
	if err := r.DB.WithContext(ctx).Save(&m).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).
		Preload("Student").Preload("Student.User").
		Where("id = ? AND tenant_id = ?", m.ID, auth.TenantID).
		First(&m).Error; err != nil {
		return nil, err
	}
	return markToModel(m), nil
}

func (r *mutationResolver) DeleteMark(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Mark{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *mutationResolver) DeleteMarks(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}
	res := r.DB.WithContext(ctx).
		Where("id IN ? AND tenant_id = ?", ids, auth.TenantID).
		Delete(&models.Mark{})
	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

func (r *mutationResolver) DeleteMarksByFilter(ctx context.Context, studentID *string, subjectID *string, examType *string, status *string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return 0, err
	}
	query := r.DB.WithContext(ctx).
		Where("tenant_id = ?", auth.TenantID)

	if studentID != nil && *studentID != "" {
		query = query.Where("student_id = ?", *studentID)
	}
	if subjectID != nil && *subjectID != "" {
		query = query.Where("subject_id = ?", *subjectID)
	}
	if examType != nil && *examType != "" {
		query = query.Where("exam_type = ?", *examType)
	}
	if status != nil && *status != "" {
		query = query.Where("status = ?", *status)
	}

	res := query.Delete(&models.Mark{})
	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

func (r *mutationResolver) PublishResults(ctx context.Context, input model.PublishResultsInput) (int, error) {
	// Publishing results tenant-wide is an admin action.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	now := time.Now()
	query := r.DB.WithContext(ctx).
		Model(&models.Mark{}).
		Where("tenant_id = ? AND is_published = false", auth.TenantID)

	if input.ExamType != nil && *input.ExamType != "" {
		query = query.Where("exam_type = ?", *input.ExamType)
	}
	if input.Subject != nil && *input.Subject != "" {
		query = query.Where("subject = ?", *input.Subject)
	}
	if input.Semester != nil {
		query = query.Where("semester = ?", *input.Semester)
	}
	if input.CourseID != nil && *input.CourseID != "" {
		query = query.Joins("JOIN students ON marks.student_id = students.id AND students.tenant_id = marks.tenant_id").
			Where("students.course_id = ?", *input.CourseID)
	}

	res := query.Updates(map[string]interface{}{
		"is_published": true,
		"published_at": now,
	})
	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

// --- helpers ---

func calculateGrade(obtained, max float64) string {
	if max == 0 {
		return "N/A"
	}
	pct := (obtained / max) * 100
	switch {
	case pct >= 90:
		return "O"
	case pct >= 80:
		return "A+"
	case pct >= 70:
		return "A"
	case pct >= 60:
		return "B+"
	case pct >= 50:
		return "B"
	case pct >= 40:
		return "C"
	default:
		return "F"
	}
}

func markToModel(m models.Mark) *model.Mark {
	out := &model.Mark{
		ID:            m.ID,
		StudentID:     m.StudentID,
		Subject:       m.Subject,
		ExamType:      m.ExamType,
		Semester:      m.Semester,
		MarksObtained: m.MarksObtained,
		MaxMarks:      m.MaxMarks,
		IsPublished:   m.IsPublished,
	}
	out.Grade = toStrPtr(m.Grade)
	out.EnteredBy = toStrPtr(m.EnteredBy)
	out.SubjectID = toStrPtr(m.SubjectID)
	out.AssessmentType = toStrPtr(m.AssessmentType)
	out.Status = toStrPtr(m.Status)
	out.AcademicYearID = toStrPtr(m.AcademicYearID)
	if m.PublishedAt != nil {
		d := m.PublishedAt.Format(time.RFC3339)
		out.PublishedAt = &d
	}
	if m.Student.ID != "" {
		out.Student = studentToModel(m.Student)
	}
	return out
}
