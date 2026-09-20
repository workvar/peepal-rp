package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Student self-service for coursework (Phase 6a). Like the other `my*`
// resolvers these are left out of opAccess: a student acting on their own
// submission is governed by the owner checks here, not by the access matrix.

// MyAssignments returns published assignments matching the caller's own
// course / semester / section, each paired with their own submission. The
// scope is taken from the student record, never from client input, so the
// query cannot be widened by a crafted request.
func (r *queryResolver) MyAssignments(ctx context.Context, status *string) ([]*model.MyAssignment, error) {
	auth, err := requireRole(ctx, roleStudent)
	if err != nil {
		return nil, err
	}
	student, err := studentForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}

	q := assignmentQuery(r.DB, ctx, auth.TenantID).
		Where("status IN ?", []string{models.AssignmentPublished, models.AssignmentClosed}).
		Where("course_id = ? AND semester = ?", student.CourseID, student.Semester)
	// A blank section on the assignment means "every section of this batch".
	q = q.Where("section = '' OR section = ?", student.Section)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}

	var rows []models.StudentAssignment
	if err := q.Order("due_date ASC, created_at DESC").Limit(300).Find(&rows).Error; err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []*model.MyAssignment{}, nil
	}

	// One query for every submission of this student across the listed
	// assignments, keyed by assignment id.
	var subs []models.AssignmentSubmission
	r.DB.WithContext(ctx).Preload("Student.User").
		Where("tenant_id = ? AND student_id = ? AND assignment_id IN ?",
			auth.TenantID, student.ID, assignmentIDs(rows)).
		Find(&subs)
	byAssignment := map[string]models.AssignmentSubmission{}
	for _, sub := range subs {
		byAssignment[sub.AssignmentID] = sub
	}
	counts := submissionCounts(r.DB, ctx, auth.TenantID, assignmentIDs(rows))

	out := make([]*model.MyAssignment, len(rows))
	for i, row := range rows {
		entry := &model.MyAssignment{
			Assignment: assignmentToModel(row, counts[row.ID]),
			CanSubmit:  row.Status == models.AssignmentPublished,
		}
		if sub, ok := byAssignment[row.ID]; ok {
			sub.Student = student
			entry.Submission = submissionToModel(sub, row)
			entry.Late = row.DueDate != "" && sub.SubmittedAt > row.DueDate
		}
		out[i] = entry
	}
	return out, nil
}

// SubmitAssignment upserts the caller's own submission. Resubmitting before
// the assignment closes overwrites the previous answer (the composite unique
// index guarantees one row per student per assignment); a graded submission
// is reopened as `submitted` so the teacher re-grades the new answer.
func (r *mutationResolver) SubmitAssignment(ctx context.Context, assignmentID string, input model.SubmitAssignmentInput) (*model.AssignmentSubmission, error) {
	auth, err := requireRole(ctx, roleStudent)
	if err != nil {
		return nil, err
	}
	student, err := studentForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	assignment, err := loadAssignment(r.DB, ctx, auth.TenantID, assignmentID)
	if err != nil {
		return nil, err
	}
	if assignment.Status != models.AssignmentPublished {
		return nil, GQLErr("this assignment is not open for submissions")
	}
	if assignment.CourseID != student.CourseID || assignment.Semester != student.Semester {
		return nil, ErrForbidden
	}
	if assignment.Section != "" && assignment.Section != student.Section {
		return nil, ErrForbidden
	}
	if strVal(input.Text) == "" && strVal(input.AttachmentURL) == "" {
		return nil, GQLErr("add an answer or attach a file before submitting")
	}

	var saved models.AssignmentSubmission
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.AssignmentSubmission
		lookup := tx.Where("tenant_id = ? AND assignment_id = ? AND student_id = ?",
			auth.TenantID, assignmentID, student.ID).First(&existing)

		if lookup.Error == nil {
			updates := map[string]interface{}{
				"text":           strVal(input.Text),
				"attachment_url": strVal(input.AttachmentURL),
				"submitted_at":   today(),
				"status":         models.SubmissionSubmitted,
				"marks_awarded":  nil,
				"feedback":       "",
				"graded_by_id":   "",
			}
			if err := tx.Model(&models.AssignmentSubmission{}).
				Where("id = ?", existing.ID).Updates(updates).Error; err != nil {
				return err
			}
			return tx.Where("id = ?", existing.ID).First(&saved).Error
		}

		saved = models.AssignmentSubmission{
			TenantID:      auth.TenantID,
			AssignmentID:  assignmentID,
			StudentID:     student.ID,
			SubmittedAt:   today(),
			Text:          strVal(input.Text),
			AttachmentURL: strVal(input.AttachmentURL),
			Status:        models.SubmissionSubmitted,
		}
		return tx.Create(&saved).Error
	})
	if err != nil {
		return nil, err
	}
	saved.Student = student
	return submissionToModel(saved, assignment), nil
}
