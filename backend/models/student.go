package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Course struct {
	ID             string        `gorm:"primaryKey" json:"id"`
	TenantID       string        `gorm:"not null;index;uniqueIndex:idx_course_code" json:"tenant_id"`
	Name           string        `gorm:"not null" json:"name"`
	Code           string        `gorm:"not null;uniqueIndex:idx_course_code" json:"code"`
	Description    string        `json:"description"`
	DurationYears  int           `json:"duration_years"`
	TotalSemesters int           `json:"total_semesters"`
	DepartmentID   string        `json:"department_id"`
	Department     Department    `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	Students       []Student     `gorm:"foreignKey:CourseID" json:"students,omitempty"`
	Batches        []CourseBatch `gorm:"foreignKey:CourseID" json:"batches,omitempty"`
}

func (c *Course) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}

type Student struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	TenantID        string    `gorm:"not null;index;uniqueIndex:idx_student_roll" json:"tenant_id"`
	UserID          string    `gorm:"uniqueIndex;not null" json:"user_id"`
	User            User      `gorm:"foreignKey:UserID" json:"user"`
	CourseID        string    `json:"course_id"`
	Course          Course    `gorm:"foreignKey:CourseID" json:"course"`
	RollNumber      string    `gorm:"not null;uniqueIndex:idx_student_roll" json:"roll_number"`
	Section         string    `json:"section"`
	Semester        int       `json:"semester"`
	Phone           string    `json:"phone"`
	EnrollDate      time.Time `json:"enroll_date"`
	DateOfBirth     string    `json:"date_of_birth"`
	Gender          string    `json:"gender"`
	BloodGroup      string    `json:"blood_group"`
	PhotoURL        string    `json:"photo_url"`
	Address         string    `json:"address"`
	City            string    `json:"city"`
	State           string    `json:"state"`
	Pincode         string    `json:"pincode"`
	Nationality     string    `json:"nationality"`
	EmergencyName   string    `json:"emergency_name"`
	EmergencyPhone  string    `json:"emergency_phone"`
	FatherName      string    `json:"father_name"`
	FatherPhone     string    `json:"father_phone"`
	MotherName      string    `json:"mother_name"`
	MotherPhone     string    `json:"mother_phone"`
	AdmissionStatus string    `gorm:"default:'active'" json:"admission_status"`
	Batch           string    `json:"batch"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (s *Student) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// CourseBatch represents a cohort/batch under a course (e.g. "2024-2028").
type CourseBatch struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;index" json:"tenant_id"`
	CourseID  string    `gorm:"not null;index" json:"course_id"`
	Name      string    `gorm:"not null" json:"name"`
	StartYear int       `gorm:"not null" json:"start_year"`
	EndYear   int       `gorm:"not null" json:"end_year"`
	CreatedAt time.Time `json:"created_at"`
}

func (b *CourseBatch) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
