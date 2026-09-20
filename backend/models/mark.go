package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Mark struct {
	ID             string     `gorm:"primaryKey" json:"id"`
	TenantID       string     `gorm:"not null;index" json:"tenant_id"`
	StudentID      string     `gorm:"not null;index" json:"student_id"`
	Student        Student    `gorm:"foreignKey:StudentID" json:"student"`
	Subject        string     `gorm:"not null" json:"subject"`
	ExamType       string     `gorm:"not null" json:"exam_type"` // "internal", "midterm", "final"
	Semester       int        `gorm:"not null" json:"semester"`
	MarksObtained  float64    `gorm:"not null" json:"marks_obtained"`
	MaxMarks       float64    `gorm:"not null" json:"max_marks"`
	Grade          string     `json:"grade"`
	EnteredBy      string     `json:"entered_by"` // user.id
	SubjectID      string     `gorm:"index" json:"subject_id"`
	SubjectModel   Subject    `gorm:"foreignKey:SubjectID" json:"subject_model,omitempty"`
	AssessmentType string     `json:"assessment_type"`               // internal/mid_sem/end_sem/assignment
	Status         string     `gorm:"default:'draft'" json:"status"` // draft/submitted/approved
	AcademicYearID string     `gorm:"index" json:"academic_year_id"`
	IsPublished    bool       `gorm:"default:false" json:"is_published"`
	PublishedAt    *time.Time `json:"published_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (m *Mark) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
