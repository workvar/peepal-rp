package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "present"
	AttendanceAbsent  AttendanceStatus = "absent"
	AttendanceLate    AttendanceStatus = "late"
)

// Attendance tracks daily attendance for both students and employees.
// EntityType indicates whether it's a "student" or "employee".
type Attendance struct {
	ID         string           `gorm:"primaryKey" json:"id"`
	TenantID   string           `gorm:"not null;index" json:"tenant_id"`
	EntityID   string           `gorm:"not null;index" json:"entity_id"` // student.id or employee.id
	EntityType string           `gorm:"not null" json:"entity_type"`     // "student" | "employee"
	Date       time.Time        `gorm:"not null" json:"date"`
	Status     AttendanceStatus `gorm:"not null;default:'present'" json:"status"`
	MarkedBy   string           `json:"marked_by"` // user.id who marked it
	Remarks    string           `json:"remarks"`
	SubjectID  string           `gorm:"index" json:"subject_id"`
	CreatedAt  time.Time        `json:"created_at"`
}

func (a *Attendance) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// AttendanceSettings holds per-tenant attendance configuration.
type AttendanceSettings struct {
	ID                 string    `gorm:"primaryKey" json:"id"`
	TenantID           string    `gorm:"not null;uniqueIndex" json:"tenant_id"`
	MinAttendancePct   float64   `gorm:"default:75" json:"min_attendance_pct"`
	GracePeriodMinutes int       `gorm:"default:10" json:"grace_period_minutes"`
	LockAfterHours     int       `gorm:"default:24" json:"lock_after_hours"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func (a *AttendanceSettings) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// Holiday stores entries on the institutional calendar for a tenant.
//
// Type supported values:
//   - "public"        : national / public holiday
//   - "institutional" : college-declared holiday
//   - "mandatory"     : mandatory holiday (closure)
//   - "optional"      : optional / restricted holiday
//   - "half_day"      : half working day
//   - "weekend"       : auto-generated Sat/Sun closure (from CalendarSettings)
//
// Uniqueness of (tenant_id, date) is enforced in the handlers (UpsertHoliday /
// GenerateCalendar) rather than via a DB unique constraint, to keep the
// migration trivial on existing tenant databases that may already contain
// duplicate legacy rows.
type Holiday struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	TenantID       string    `gorm:"not null;index:idx_holiday_tenant_date,priority:1" json:"tenant_id"`
	AcademicYearID string    `gorm:"index" json:"academic_year_id"` // optional
	Name           string    `gorm:"not null" json:"name"`
	Date           time.Time `gorm:"not null;index:idx_holiday_tenant_date,priority:2" json:"date"`
	Type           string    `gorm:"not null;default:'institutional'" json:"type"`
	AutoGen        bool      `gorm:"default:false" json:"auto_gen"`
	CreatedAt      time.Time `json:"created_at"`
}

func (h *Holiday) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.NewString()
	}
	return nil
}
