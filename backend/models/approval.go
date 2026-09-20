package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ── Process / Approver / Status enums ───────────────────────────────────────

// ApprovalProcess is the *code* of a process type. Built-in codes are
// declared as constants below so existing handlers (leaves.go, payroll.go)
// stay readable, but any tenant can register additional process types via
// the ApprovalProcessType table — those custom codes are also valid here.
// The engine itself is fully code-agnostic.
type ApprovalProcess string

const (
	ProcessLeave          ApprovalProcess = "leave"
	ProcessHoliday        ApprovalProcess = "holiday"
	ProcessAcademicChange ApprovalProcess = "academic_calendar"
	ProcessPayroll        ApprovalProcess = "payroll"
	ProcessNotice         ApprovalProcess = "notice"
)

// ApprovalProcessType is an admin-defined kind of approval. Built-in
// types are seeded with IsBuiltin=true so they cannot be deleted, only
// hidden via IsActive.
type ApprovalProcessType struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index;uniqueIndex:idx_proctype_code" json:"tenant_id"`
	Code        string    `gorm:"not null;uniqueIndex:idx_proctype_code" json:"code"`
	Label       string    `gorm:"not null" json:"label"`
	Description string    `json:"description"`
	IsBuiltin   bool      `gorm:"default:false" json:"is_builtin"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *ApprovalProcessType) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// ApproverType is how a single step decides *who* can approve it.
type ApproverType string

const (
	ApproverManager    ApproverType = "manager"    // requester's immediate manager
	ApproverUser       ApproverType = "user"       // a specific user (UserID set)
	ApproverRole       ApproverType = "role"       // anyone with this role
	ApproverDepartment ApproverType = "department" // anyone in this department
)

type ApprovalRequestStatus string

const (
	ApprovalPending  ApprovalRequestStatus = "pending"
	ApprovalApproved ApprovalRequestStatus = "approved"
	ApprovalRejected ApprovalRequestStatus = "rejected"
)

// ── Flow definition ─────────────────────────────────────────────────────────

// ApprovalFlow is an admin-defined chain of steps for a given process.
// Only one flow per (tenant, process) is active at a time; if no active flow
// exists, the engine treats the action as auto-approved.
//
// FormFields is a JSON-encoded array of FormField objects describing the
// inputs the requester must fill in when raising a request through this
// flow. Stored as text so we don't depend on a specific JSON column type.
type ApprovalFlow struct {
	ID         string          `gorm:"primaryKey" json:"id"`
	TenantID   string          `gorm:"not null;index" json:"tenant_id"`
	Name       string          `gorm:"not null" json:"name"`
	Process    ApprovalProcess `gorm:"not null;index" json:"process"`
	IsActive   bool            `gorm:"default:true" json:"is_active"`
	FormFields string          `gorm:"type:text;default:''" json:"form_fields"` // JSON
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
	Steps      []ApprovalStep  `gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE" json:"steps,omitempty"`
}

func (a *ApprovalFlow) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// ApprovalStep is one rung of the flow ladder. StepOrder is 1-based.
type ApprovalStep struct {
	ID           string       `gorm:"primaryKey" json:"id"`
	FlowID       string       `gorm:"not null;index" json:"flow_id"`
	StepOrder    int          `gorm:"not null" json:"step_order"`
	Name         string       `json:"name"` // human label shown in the UI
	ApproverType ApproverType `gorm:"not null" json:"approver_type"`

	// One of these is populated based on ApproverType:
	ApproverUserID       *string `gorm:"index" json:"approver_user_id,omitempty"`
	ApproverRole         *string `json:"approver_role,omitempty"`
	ApproverDepartmentID *string `gorm:"index" json:"approver_department_id,omitempty"`

	// ManagerLevel is used when ApproverType=manager. 1 = immediate manager,
	// 2 = manager's manager, etc. Defaults to 1 when unset / 0.
	ManagerLevel int `gorm:"default:1" json:"manager_level"`

	// Optional condition: if all three are set, the step is *skipped* when
	// the form-field with key=ConditionField does not satisfy
	// `<value> ConditionOp ConditionValue`. ConditionOp is one of
	// =, !=, <, <=, >, >=. ConditionValue is compared as number when both
	// sides parse as numbers, otherwise as a string.
	ConditionField *string `json:"condition_field,omitempty"`
	ConditionOp    *string `json:"condition_op,omitempty"`
	ConditionValue *string `json:"condition_value,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

func (s *ApprovalStep) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// ── Live request + audit trail ──────────────────────────────────────────────

// ApprovalRequest is one in-flight approval workflow tied to a concrete
// business record (e.g. a Leave row). The engine moves CurrentStep forward
// until either a step rejects (Status=rejected) or all steps approve.
type ApprovalRequest struct {
	ID          string                `gorm:"primaryKey" json:"id"`
	TenantID    string                `gorm:"not null;index" json:"tenant_id"`
	FlowID      string                `gorm:"not null;index" json:"flow_id"`
	Process     ApprovalProcess       `gorm:"not null;index" json:"process"`
	ReferenceID string                `gorm:"not null;index" json:"reference_id"` // id of the underlying record
	RequesterID string                `gorm:"not null;index" json:"requester_id"`
	Title       string                `json:"title"`                              // short label e.g. "Leave: 2026-05-01 to 2026-05-03"
	Payload     string                `gorm:"type:text" json:"payload,omitempty"` // optional JSON with extra context
	CurrentStep int                   `gorm:"default:1" json:"current_step"`
	Status      ApprovalRequestStatus `gorm:"not null;default:'pending'" json:"status"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
	Actions     []ApprovalAction      `gorm:"foreignKey:RequestID" json:"actions,omitempty"`
}

func (r *ApprovalRequest) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

// ApprovalAction is one approve/reject vote on a step. We keep them all so
// the request page shows a full audit trail.
type ApprovalAction struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	RequestID  string    `gorm:"not null;index" json:"request_id"`
	StepID     string    `gorm:"not null;index" json:"step_id"`
	StepOrder  int       `json:"step_order"`
	ApproverID string    `gorm:"not null;index" json:"approver_id"`
	Action     string    `gorm:"not null" json:"action"` // "approved" | "rejected"
	Comment    string    `json:"comment"`
	CreatedAt  time.Time `json:"created_at"`
}

func (a *ApprovalAction) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}
