package models

// Hall tickets: the admit card a student carries into an exam. One per
// (student, exam schedule), enforced by a composite unique index so a
// re-issue run is idempotent instead of duplicating.

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Hall ticket lifecycle. A held ticket exists but is not valid for entry —
// the office can see the hold reason and release it once the student clears.
const (
	HallTicketIssued  = "issued"
	HallTicketHeld    = "held"
	HallTicketRevoked = "revoked"
)

type HallTicket struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"tenant_id"`

	ExamScheduleID string       `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"exam_schedule_id"`
	ExamSchedule   ExamSchedule `gorm:"foreignKey:ExamScheduleID" json:"exam_schedule,omitempty"`
	StudentID      string       `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"student_id"`
	Student        Student      `gorm:"foreignKey:StudentID" json:"student,omitempty"`

	TicketNumber string `gorm:"not null;index" json:"ticket_number"` // HT-%06d, per tenant
	SeatNumber   string `json:"seat_number"`
	ExamCenter   string `json:"exam_center"`

	// Eligibility gate. A student who fails the check is stored held with a
	// reason rather than skipped, so the exam office sees the whole cohort.
	Eligible   bool   `gorm:"default:true" json:"eligible"`
	HoldReason string `json:"hold_reason"`
	IssuedOn   string `json:"issued_on"` // YYYY-MM-DD
	Status     string `gorm:"default:'issued';index" json:"status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *HallTicket) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.NewString()
	}
	return nil
}
