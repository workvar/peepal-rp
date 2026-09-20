package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AcademicYear represents an academic year for a tenant.
type AcademicYear struct {
	ID        string     `gorm:"primaryKey" json:"id"`
	TenantID  string     `gorm:"not null;uniqueIndex:idx_ay_tenant_name" json:"tenant_id"`
	Name      string     `gorm:"not null;uniqueIndex:idx_ay_tenant_name" json:"name"` // e.g., "2023-24"
	StartDate time.Time  `gorm:"not null" json:"start_date"`
	EndDate   time.Time  `gorm:"not null" json:"end_date"`
	IsCurrent bool       `gorm:"default:false" json:"is_current"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	Semesters []Semester `gorm:"foreignKey:AcademicYearID" json:"semesters,omitempty"`
}

func (a *AcademicYear) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// Semester represents a semester within an academic year.
type Semester struct {
	ID             string       `gorm:"primaryKey" json:"id"`
	TenantID       string       `gorm:"not null;index" json:"tenant_id"`
	AcademicYearID string       `gorm:"not null;index" json:"academic_year_id"`
	AcademicYear   AcademicYear `gorm:"foreignKey:AcademicYearID" json:"academic_year"`
	Number         int          `gorm:"not null" json:"number"` // 1, 2, 3, etc.
	Name           string       `gorm:"not null" json:"name"`   // e.g., "Semester 1"
	StartDate      time.Time    `gorm:"not null" json:"start_date"`
	EndDate        time.Time    `gorm:"not null" json:"end_date"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

func (s *Semester) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// Subject represents a course subject/paper
type Subject struct {
	ID             string     `gorm:"primaryKey" json:"id"`
	TenantID       string     `gorm:"not null;index;uniqueIndex:idx_subject_code" json:"tenant_id"`
	DepartmentID   string     `gorm:"index" json:"department_id"`
	Department     Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	Name           string     `gorm:"not null" json:"name"`
	Code           string     `gorm:"not null;uniqueIndex:idx_subject_code" json:"code"`
	Credits        int        `json:"credits"`
	TeachingHours  int        `json:"teaching_hours"`
	LabHours       int        `json:"lab_hours"`
	SemesterNumber int        `json:"semester_number"`
	Description    string     `json:"description"`
	SyllabusURL    string     `json:"syllabus_url"`
	CourseOutcomes string     `gorm:"type:text" json:"course_outcomes"` // newline-separated outcomes (CO1, CO2, …)
	UnitsJSON      string     `gorm:"type:text" json:"units_json"`      // JSON-encoded []SubjectUnit (the course plan)
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// SubjectUnit is one unit of a subject's course plan. Stored JSON-encoded in
// Subject.UnitsJSON. Content holds the free-text topics; lab activities, field
// visits and "others" are optional per-unit notes.
type SubjectUnit struct {
	Title         string `json:"title"`
	Content       string `json:"content"`
	LabActivities string `json:"lab_activities,omitempty"`
	FieldVisits   string `json:"field_visits,omitempty"`
	Others        string `json:"others,omitempty"`
}

func (s *Subject) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// ExamSchedule represents an examination event
type ExamSchedule struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	TenantID       string    `gorm:"not null;index" json:"tenant_id"`
	AcademicYearID string    `gorm:"index" json:"academic_year_id"`
	Name           string    `gorm:"not null" json:"name"`
	ExamType       string    `gorm:"not null" json:"exam_type"` // internal/semester/assignment
	SemesterNumber int       `json:"semester_number"`
	StartDate      time.Time `json:"start_date"`
	EndDate        time.Time `json:"end_date"`
	Published      bool      `gorm:"default:false" json:"published"`
	Instructions   string    `json:"instructions"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (e *ExamSchedule) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
