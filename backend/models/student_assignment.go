package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Student coursework (Phase 6a).
//
// Deliberately distinct from the employee L&D LearningAssignment in
// models/learning.go: that one is a quiz/task inside a learning goal for
// staff, this one is homework a teacher sets for a course-semester-section
// and students submit against.

const (
	AssignmentDraft     = "draft"
	AssignmentPublished = "published"
	AssignmentClosed    = "closed"
)

const (
	SubmissionSubmitted = "submitted"
	SubmissionGraded    = "graded"
	SubmissionReturned  = "returned"
)

// StudentAssignment is one piece of coursework set by a teacher. Scope reuses
// the same course/semester/section/subject ids the timetable and marks
// modules key on, so "who is this for" needs no new grouping concept.
type StudentAssignment struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	Title       string `gorm:"not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`

	CourseID  string  `gorm:"index" json:"course_id"`
	Course    Course  `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	Semester  int     `json:"semester"`
	Section   string  `json:"section"`
	SubjectID string  `gorm:"index" json:"subject_id"`
	Subject   Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`

	TeacherID string   `gorm:"not null;index" json:"teacher_id"`
	Teacher   Employee `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`

	MaxMarks float64 `gorm:"default:0" json:"max_marks"`
	DueDate  string  `gorm:"index" json:"due_date"` // YYYY-MM-DD

	// Optional teacher handout, uploaded through the existing upload route;
	// only the resulting URL is stored (same as AttachmentURL elsewhere).
	AttachmentURL string `json:"attachment_url"`

	// draft → published (students can see & submit) → closed (read-only).
	Status string `gorm:"default:'draft';index" json:"status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (a *StudentAssignment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// AssignmentSubmission is one student's answer to one assignment. The
// composite unique index means a resubmission updates the existing row rather
// than piling up duplicates, so "did this student submit?" is a single lookup.
type AssignmentSubmission struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"tenant_id"`

	AssignmentID string            `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"assignment_id"`
	Assignment   StudentAssignment `gorm:"foreignKey:AssignmentID" json:"assignment,omitempty"`
	StudentID    string            `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"student_id"`
	Student      Student           `gorm:"foreignKey:StudentID" json:"student,omitempty"`

	SubmittedAt   string `gorm:"index" json:"submitted_at"` // YYYY-MM-DD
	Text          string `gorm:"type:text" json:"text"`     // typed answer
	AttachmentURL string `json:"attachment_url"`            // uploaded file

	// Grading, written by the teacher.
	Status       string   `gorm:"default:'submitted';index" json:"status"`
	MarksAwarded *float64 `json:"marks_awarded"`
	Feedback     string   `gorm:"type:text" json:"feedback"`
	GradedByID   string   `gorm:"index" json:"graded_by_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *AssignmentSubmission) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
