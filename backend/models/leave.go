package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LeaveStatus string

const (
	LeavePending  LeaveStatus = "pending"
	LeaveApproved LeaveStatus = "approved"
	LeaveRejected LeaveStatus = "rejected"
)

type Leave struct {
	ID          string      `gorm:"primaryKey" json:"id"`
	TenantID    string      `gorm:"not null;index" json:"tenant_id"`
	ApplicantID string      `gorm:"not null;index" json:"applicant_id"` // user.id
	Applicant   User        `gorm:"foreignKey:ApplicantID" json:"applicant"`
	LeaveType   string      `gorm:"not null" json:"leave_type"` // "sick", "casual", "earned", etc.
	LeaveTypeID string      `gorm:"index" json:"leave_type_id"`
	FromDate    time.Time   `gorm:"not null" json:"from_date"`
	ToDate      time.Time   `gorm:"not null" json:"to_date"`
	Reason      string      `gorm:"not null" json:"reason"`
	Status      LeaveStatus `gorm:"not null;default:'pending'" json:"status"`
	ReviewedBy  string      `json:"reviewed_by"` // user.id of reviewer
	ReviewNote  string      `json:"review_note"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

func (l *Leave) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.NewString()
	}
	return nil
}

// LeaveTypeConfig defines configurable leave types per tenant.
type LeaveTypeConfig struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	TenantID        string    `gorm:"not null;index;uniqueIndex:idx_lt_code" json:"tenant_id"`
	Name            string    `gorm:"not null" json:"name"`
	Code            string    `gorm:"not null;uniqueIndex:idx_lt_code" json:"code"` // CL, SL, EL, etc.
	DaysPerYear     int       `gorm:"default:0" json:"days_per_year"`
	CarryForward    bool      `gorm:"default:false" json:"carry_forward"`
	MaxCarryForward int       `gorm:"default:0" json:"max_carry_forward"`
	ApplicableTo    string    `gorm:"default:'all'" json:"applicable_to"` // all, or a role id: teacher/staff/student ("employee" = legacy)
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (lt *LeaveTypeConfig) BeforeCreate(tx *gorm.DB) error {
	if lt.ID == "" {
		lt.ID = uuid.NewString()
	}
	return nil
}

// LeaveBalance tracks annual leave balance per user per leave type.
type LeaveBalance struct {
	ID          string          `gorm:"primaryKey" json:"id"`
	TenantID    string          `gorm:"not null;index;uniqueIndex:idx_lb_user_type_year" json:"tenant_id"`
	UserID      string          `gorm:"not null;index;uniqueIndex:idx_lb_user_type_year" json:"user_id"`
	User        User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	LeaveTypeID string          `gorm:"not null;index;uniqueIndex:idx_lb_user_type_year" json:"leave_type_id"`
	LeaveType   LeaveTypeConfig `gorm:"foreignKey:LeaveTypeID" json:"leave_type,omitempty"`
	Year        int             `gorm:"not null;uniqueIndex:idx_lb_user_type_year" json:"year"`
	Total       float64         `gorm:"not null;default:0" json:"total"`
	Used        float64         `gorm:"not null;default:0" json:"used"`
	Pending     float64         `gorm:"not null;default:0" json:"pending"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (lb *LeaveBalance) BeforeCreate(tx *gorm.DB) error {
	if lb.ID == "" {
		lb.ID = uuid.NewString()
	}
	return nil
}
