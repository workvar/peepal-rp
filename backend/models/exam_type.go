package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExamType is a reusable, department-scoped assessment definition (e.g.
// "Internal 1", "Mid Semester", "End Semester", "Assignment"). Admins set these
// up per department on the Exams page; they then populate the assessment-type
// dropdown when entering marks. A blank DepartmentID means the exam type is
// org-wide and available to every department.
type ExamType struct {
	ID           string     `gorm:"primaryKey" json:"id"`
	TenantID     string     `gorm:"not null;index;uniqueIndex:idx_examtype_tenant_dept_name" json:"tenant_id"`
	DepartmentID string     `gorm:"index;uniqueIndex:idx_examtype_tenant_dept_name" json:"department_id"`
	Department   Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	Name         string     `gorm:"not null;uniqueIndex:idx_examtype_tenant_dept_name" json:"name"` // e.g. "Mid Semester"
	MaxMarks     float64    `gorm:"not null;default:100" json:"max_marks"`                          // default max marks pre-filled when picked
	Weightage    float64    `json:"weightage"`                                                      // percent contribution to the final grade (0 = unset)
	Active       bool       `gorm:"default:true" json:"active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (e *ExamType) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
