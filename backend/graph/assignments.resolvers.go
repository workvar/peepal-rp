package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Teacher/admin side of student coursework (Phase 6a). The student side lives
// in assignments_portal.resolvers.go; shared mapping helpers are in
// assignments_helpers.go.

// StudentAssignments lists coursework. Teachers only ever see assignments
// they set (there is no shared-ownership concept here); admins see the whole
// tenant. Same "self unless privileged" shape as DutyRoster.
func (r *queryResolver) StudentAssignments(ctx context.Context, courseID *string, subjectID *string, semester *int, section *string, status *string) ([]*model.StudentAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	q := assignmentQuery(r.DB, ctx, auth.TenantID)

	if !callerIsAssignmentAdmin(auth) {
		teacher, err := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
		if err != nil {
			return nil, err
		}
		q = q.Where("teacher_id = ?", teacher.ID)
	}
	if courseID != nil && *courseID != "" {
		q = q.Where("course_id = ?", *courseID)
	}
	if subjectID != nil && *subjectID != "" {
		q = q.Where("subject_id = ?", *subjectID)
	}
	if semester != nil && *semester > 0 {
		q = q.Where("semester = ?", *semester)
	}
	if section != nil && *section != "" {
		q = q.Where("section = ?", *section)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}

	var rows []models.StudentAssignment
	if err := q.Order("due_date DESC, created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	counts := submissionCounts(r.DB, ctx, auth.TenantID, assignmentIDs(rows))
	out := make([]*model.StudentAssignment, len(rows))
	for i, row := range rows {
		out[i] = assignmentToModel(row, counts[row.ID])
	}
	return out, nil
}

func (r *queryResolver) StudentAssignment(ctx context.Context, id string) (*model.StudentAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	row, err := loadAssignment(r.DB, ctx, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, row); err != nil {
		return nil, err
	}
	counts := submissionCounts(r.DB, ctx, auth.TenantID, []string{row.ID})
	return assignmentToModel(row, counts[row.ID]), nil
}

// AssignmentSubmissions is the grading list for one assignment.
func (r *queryResolver) AssignmentSubmissions(ctx context.Context, assignmentID string) ([]*model.AssignmentSubmission, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	assignment, err := loadAssignment(r.DB, ctx, auth.TenantID, assignmentID)
	if err != nil {
		return nil, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, assignment); err != nil {
		return nil, err
	}

	var rows []models.AssignmentSubmission
	if err := r.DB.WithContext(ctx).Preload("Student.User").
		Where("tenant_id = ? AND assignment_id = ?", auth.TenantID, assignmentID).
		Order("created_at ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AssignmentSubmission, len(rows))
	for i, row := range rows {
		out[i] = submissionToModel(row, assignment)
	}
	return out, nil
}

func (r *mutationResolver) CreateStudentAssignment(ctx context.Context, input model.CreateStudentAssignmentInput) (*model.StudentAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	teacher, err := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	if input.Title == "" {
		return nil, GQLErr("title is required")
	}
	if input.DueDate != nil && *input.DueDate != "" && !validYMD(*input.DueDate) {
		return nil, GQLErr("dueDate must be YYYY-MM-DD")
	}

	row := models.StudentAssignment{
		TenantID:      auth.TenantID,
		Title:         input.Title,
		Description:   strVal(input.Description),
		CourseID:      strVal(input.CourseID),
		Semester:      intVal(input.Semester),
		Section:       strVal(input.Section),
		SubjectID:     strVal(input.SubjectID),
		TeacherID:     teacher.ID,
		MaxMarks:      floatVal(input.MaxMarks),
		DueDate:       strVal(input.DueDate),
		AttachmentURL: strVal(input.AttachmentURL),
		Status:        models.AssignmentDraft,
	}
	if err := r.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, err
	}
	return r.reloadAssignment(ctx, auth.TenantID, row.ID)
}

func (r *mutationResolver) UpdateStudentAssignment(ctx context.Context, id string, input model.UpdateStudentAssignmentInput) (*model.StudentAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	existing, err := loadAssignment(r.DB, ctx, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, existing); err != nil {
		return nil, err
	}
	if existing.Status == models.AssignmentClosed {
		return nil, GQLErr("a closed assignment can no longer be edited")
	}

	updates := map[string]interface{}{}
	setStr(updates, "title", input.Title)
	setStr(updates, "description", input.Description)
	setStr(updates, "course_id", input.CourseID)
	setStr(updates, "section", input.Section)
	setStr(updates, "subject_id", input.SubjectID)
	setStr(updates, "attachment_url", input.AttachmentURL)
	if input.Semester != nil {
		updates["semester"] = *input.Semester
	}
	if input.MaxMarks != nil {
		updates["max_marks"] = *input.MaxMarks
	}
	if input.DueDate != nil {
		if *input.DueDate != "" && !validYMD(*input.DueDate) {
			return nil, GQLErr("dueDate must be YYYY-MM-DD")
		}
		updates["due_date"] = *input.DueDate
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&models.StudentAssignment{}).
			Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return r.reloadAssignment(ctx, auth.TenantID, id)
}

// PublishStudentAssignment makes a draft visible to students.
func (r *mutationResolver) PublishStudentAssignment(ctx context.Context, id string) (*model.StudentAssignment, error) {
	return r.setAssignmentStatus(ctx, id, models.AssignmentPublished)
}

// CloseStudentAssignment stops accepting submissions. Existing submissions
// stay and can still be graded.
func (r *mutationResolver) CloseStudentAssignment(ctx context.Context, id string) (*model.StudentAssignment, error) {
	return r.setAssignmentStatus(ctx, id, models.AssignmentClosed)
}

// DeleteStudentAssignment removes the assignment and its submissions together
// so no orphan submission rows survive.
func (r *mutationResolver) DeleteStudentAssignment(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return false, err
	}
	existing, err := loadAssignment(r.DB, ctx, auth.TenantID, id)
	if err != nil {
		return false, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, existing); err != nil {
		return false, err
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tenant_id = ? AND assignment_id = ?", auth.TenantID, id).
			Delete(&models.AssignmentSubmission{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
			Delete(&models.StudentAssignment{}).Error
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

// GradeAssignmentSubmission awards marks and feedback. Marks are validated
// against the parent assignment's maxMarks so a typo can't exceed the total.
func (r *mutationResolver) GradeAssignmentSubmission(ctx context.Context, id string, marksAwarded float64, feedback *string) (*model.AssignmentSubmission, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	var sub models.AssignmentSubmission
	if err := r.DB.WithContext(ctx).Preload("Student.User").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&sub).Error; err != nil {
		return nil, ErrNotFound
	}
	assignment, err := loadAssignment(r.DB, ctx, auth.TenantID, sub.AssignmentID)
	if err != nil {
		return nil, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, assignment); err != nil {
		return nil, err
	}
	if marksAwarded < 0 {
		return nil, GQLErr("marks cannot be negative")
	}
	if assignment.MaxMarks > 0 && marksAwarded > assignment.MaxMarks {
		return nil, GQLErr("marks cannot exceed the assignment's maximum")
	}

	grader, gerr := employeeForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	graderID := ""
	if gerr == nil {
		graderID = grader.ID
	}
	updates := map[string]interface{}{
		"marks_awarded": marksAwarded,
		"feedback":      strVal(feedback),
		"status":        models.SubmissionGraded,
		"graded_by_id":  graderID,
		"updated_at":    time.Now(),
	}
	if err := r.DB.WithContext(ctx).Model(&models.AssignmentSubmission{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Student.User").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&sub).Error; err != nil {
		return nil, err
	}
	return submissionToModel(sub, assignment), nil
}

// setAssignmentStatus is the shared publish/close path.
func (r *mutationResolver) setAssignmentStatus(ctx context.Context, id, status string) (*model.StudentAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	existing, err := loadAssignment(r.DB, ctx, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	if err := assertOwnsAssignment(r.DB, ctx, auth, existing); err != nil {
		return nil, err
	}
	if existing.Status == status {
		return r.reloadAssignment(ctx, auth.TenantID, id)
	}
	if status == models.AssignmentPublished && existing.Status == models.AssignmentClosed {
		return nil, GQLErr("a closed assignment cannot be re-published")
	}
	if err := r.DB.WithContext(ctx).Model(&models.StudentAssignment{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("status", status).Error; err != nil {
		return nil, err
	}
	return r.reloadAssignment(ctx, auth.TenantID, id)
}

func (r *mutationResolver) reloadAssignment(ctx context.Context, tenantID, id string) (*model.StudentAssignment, error) {
	row, err := loadAssignment(r.DB, ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	counts := submissionCounts(r.DB, ctx, tenantID, []string{id})
	return assignmentToModel(row, counts[id]), nil
}
