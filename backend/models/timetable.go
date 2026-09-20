package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DayOfWeek represents a weekday for timetable scheduling.
type DayOfWeek string

const (
	Monday    DayOfWeek = "Monday"
	Tuesday   DayOfWeek = "Tuesday"
	Wednesday DayOfWeek = "Wednesday"
	Thursday  DayOfWeek = "Thursday"
	Friday    DayOfWeek = "Friday"
	Saturday  DayOfWeek = "Saturday"
)

// TimetableSlot is one entry in the weekly class schedule.
// It maps a time period on a given day to a subject and teacher,
// scoped to a course + semester + section within a tenant.
type TimetableSlot struct {
	ID             string `gorm:"primaryKey" json:"id"`
	TenantID       string `gorm:"not null;index" json:"tenant_id"`
	AcademicYearID string `gorm:"not null;index" json:"academic_year_id"`
	CourseID       string `gorm:"not null;index" json:"course_id"`
	SubjectID      string `gorm:"not null" json:"subject_id"`
	EmployeeID     string `json:"employee_id"` // optional — teacher/faculty

	DayOfWeek    DayOfWeek `gorm:"not null" json:"day_of_week"`
	PeriodNumber int       `gorm:"not null" json:"period_number"` // 1-based
	StartTime    string    `gorm:"not null" json:"start_time"`    // "HH:MM" 24h
	EndTime      string    `gorm:"not null" json:"end_time"`      // "HH:MM" 24h
	Semester     int       `gorm:"not null" json:"semester"`
	Section      string    `json:"section"` // optional e.g. "A", "B"
	Room         string    `json:"room"`    // optional room/lab number

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Preloaded associations
	Course  *Course  `gorm:"foreignKey:CourseID"  json:"course,omitempty"`
	Subject *Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

func (t *TimetableSlot) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
