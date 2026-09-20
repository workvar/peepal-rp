package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Shared loading, ownership and mapping helpers for the assignment module
// (teacher resolvers in assignments.resolvers.go, student self-service in
// assignments_portal.resolvers.go).

// assignmentCount is the per-assignment submission tally shown on the list.
type assignmentCount struct {
	Submissions int
	Graded      int
}

func assignmentQuery(db *gorm.DB, ctx context.Context, tenantID string) *gorm.DB {
	return db.WithContext(ctx).
		Preload("Course").Preload("Subject").Preload("Teacher.User").
		Where("tenant_id = ?", tenantID)
}

func loadAssignment(db *gorm.DB, ctx context.Context, tenantID, id string) (models.StudentAssignment, error) {
	var row models.StudentAssignment
	if err := assignmentQuery(db, ctx, tenantID).Where("id = ?", id).First(&row).Error; err != nil {
		return models.StudentAssignment{}, ErrNotFound
	}
	return row, nil
}

// callerIsAssignmentAdmin reports whether the caller sees every teacher's
// assignments rather than only their own.
func callerIsAssignmentAdmin(auth AuthContext) bool {
	return auth.IsSuperAdmin || auth.Role == roleAdmin || auth.Role == string(models.RoleSuperAdmin)
}

// assertOwnsAssignment lets admins through and otherwise requires the caller
// to be the teacher who set the assignment.
func assertOwnsAssignment(db *gorm.DB, ctx context.Context, auth AuthContext, a models.StudentAssignment) error {
	if callerIsAssignmentAdmin(auth) {
		return nil
	}
	teacher, err := employeeForUser(db, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return err
	}
	if teacher.ID != a.TeacherID {
		return ErrForbidden
	}
	return nil
}

func assignmentIDs(rows []models.StudentAssignment) []string {
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.ID
	}
	return ids
}

// submissionCounts tallies submissions per assignment in one grouped query,
// so a list of N assignments doesn't fan out into N count queries.
func submissionCounts(db *gorm.DB, ctx context.Context, tenantID string, ids []string) map[string]assignmentCount {
	out := map[string]assignmentCount{}
	if len(ids) == 0 {
		return out
	}
	var rows []struct {
		AssignmentID string
		Total        int
		Graded       int
	}
	db.WithContext(ctx).Model(&models.AssignmentSubmission{}).
		Select("assignment_id, COUNT(*) AS total, SUM(CASE WHEN status = 'graded' THEN 1 ELSE 0 END) AS graded").
		Where("tenant_id = ? AND assignment_id IN ?", tenantID, ids).
		Group("assignment_id").Scan(&rows)
	for _, row := range rows {
		out[row.AssignmentID] = assignmentCount{Submissions: row.Total, Graded: row.Graded}
	}
	return out
}

func assignmentToModel(a models.StudentAssignment, c assignmentCount) *model.StudentAssignment {
	m := &model.StudentAssignment{
		ID:              a.ID,
		Title:           a.Title,
		Description:     toStrPtr(a.Description),
		CourseID:        toStrPtr(a.CourseID),
		CourseName:      toStrPtr(a.Course.Name),
		Semester:        toIntPtr(a.Semester),
		Section:         toStrPtr(a.Section),
		SubjectID:       toStrPtr(a.SubjectID),
		SubjectName:     toStrPtr(a.Subject.Name),
		TeacherID:       a.TeacherID,
		TeacherName:     employeeName(a.Teacher),
		MaxMarks:        a.MaxMarks,
		DueDate:         toStrPtr(a.DueDate),
		AttachmentURL:   toStrPtr(a.AttachmentURL),
		Status:          a.Status,
		SubmissionCount: c.Submissions,
		GradedCount:     c.Graded,
		CreatedAt:       rfc3339OrNil(a.CreatedAt),
	}
	return m
}

func submissionToModel(s models.AssignmentSubmission, a models.StudentAssignment) *model.AssignmentSubmission {
	return &model.AssignmentSubmission{
		ID:              s.ID,
		AssignmentID:    s.AssignmentID,
		AssignmentTitle: toStrPtr(a.Title),
		MaxMarks:        a.MaxMarks,
		StudentID:       s.StudentID,
		StudentName:     studentRosterName(s.Student),
		RollNumber:      toStrPtr(s.Student.RollNumber),
		SubmittedAt:     toStrPtr(s.SubmittedAt),
		Text:            toStrPtr(s.Text),
		AttachmentURL:   toStrPtr(s.AttachmentURL),
		Status:          s.Status,
		MarksAwarded:    s.MarksAwarded,
		Feedback:        toStrPtr(s.Feedback),
		CreatedAt:       rfc3339OrNil(s.CreatedAt),
	}
}

// studentRosterName prefers the linked user's name and falls back to the
// roll number so a row never renders blank.
func studentRosterName(s models.Student) string {
	if s.User.Name != "" {
		return s.User.Name
	}
	if s.RollNumber != "" {
		return s.RollNumber
	}
	return "Unknown"
}

// employeeForUser resolves the Employee profile behind a login account. Used
// wherever a teacher/staff caller must be identified as an employee row.
func employeeForUser(db *gorm.DB, ctx context.Context, tenantID, userID string) (models.Employee, error) {
	var emp models.Employee
	if err := db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&emp).Error; err != nil {
		return models.Employee{}, GQLErr("no employee profile found for your account")
	}
	return emp, nil
}

// studentForUser resolves the Student profile behind a login account.
func studentForUser(db *gorm.DB, ctx context.Context, tenantID, userID string) (models.Student, error) {
	var s models.Student
	if err := db.WithContext(ctx).Preload("User").
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&s).Error; err != nil {
		return models.Student{}, GQLErr("no student profile found for your account")
	}
	return s, nil
}

// validYMD accepts only a strict YYYY-MM-DD calendar date, matching how every
// date column in this codebase is stored.
func validYMD(s string) bool {
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

// today is the tenant-agnostic current date in the same YYYY-MM-DD form.
func today() string {
	return time.Now().Format("2006-01-02")
}
