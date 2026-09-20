package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CurriculumSubject maps a Subject into a specific semester of a Course's
// curriculum. The subject carries its own course plan (units) and course
// outcomes, which ride along automatically — this row is just the assignment
// link. The year of study is derived from the semester number on the client.
type CurriculumSubject struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	TenantID       string    `gorm:"not null;index;uniqueIndex:idx_curriculum_unique" json:"tenant_id"`
	CourseID       string    `gorm:"not null;index;uniqueIndex:idx_curriculum_unique" json:"course_id"`
	SemesterNumber int       `gorm:"not null;uniqueIndex:idx_curriculum_unique" json:"semester_number"`
	SubjectID      string    `gorm:"not null;uniqueIndex:idx_curriculum_unique" json:"subject_id"`
	Subject        Subject   `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	SortOrder      int       `json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (c *CurriculumSubject) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
