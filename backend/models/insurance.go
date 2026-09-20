package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Insurance / TPA claims — healthcare industry, Phase 4. A claim moves through
// the shared approval engine (process code below) once submitted.

// ProcessInsuranceClaim is the approval-engine process code for claims.
const ProcessInsuranceClaim ApprovalProcess = "insurance_claim"

// Claim statuses. under_review is driven by the approval engine; approved /
// rejected are set by the approval callback; settled is a manual final step.
const (
	ClaimDraft       = "draft"
	ClaimSubmitted   = "submitted" // raised into the approval flow
	ClaimUnderReview = "under_review"
	ClaimApproved    = "approved"
	ClaimRejected    = "rejected"
	ClaimSettled     = "settled"
)

// InsurancePayer is an insurer / TPA the hospital bills claims to.
type InsurancePayer struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_payer_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_payer_code" json:"code"`
	Name     string `gorm:"not null" json:"name"`
	// PayerType: insurer | tpa | government | corporate.
	PayerType   string    `gorm:"default:'insurer'" json:"payer_type"`
	ContactName string    `json:"contact_name"`
	Phone       string    `json:"phone"`
	Email       string    `json:"email"`
	Active      bool      `gorm:"default:true" json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *InsurancePayer) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// InsuranceClaim is one reimbursement claim for a patient's care.
type InsuranceClaim struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_claim_number" json:"tenant_id"`
	// ClaimNumber is auto-generated (CLM-00001), unique within the tenant.
	ClaimNumber string `gorm:"not null;uniqueIndex:idx_claim_number" json:"claim_number"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// AdmissionID / InvoiceID link the care the claim covers; both optional.
	AdmissionID string `gorm:"index" json:"admission_id"`
	InvoiceID   string `gorm:"index" json:"invoice_id"`

	PayerID string         `gorm:"index" json:"payer_id"`
	Payer   InsurancePayer `gorm:"foreignKey:PayerID" json:"payer,omitempty"`

	PolicyNumber   string  `json:"policy_number"`
	Diagnosis      string  `json:"diagnosis"`
	ClaimAmount    float64 `gorm:"not null;default:0" json:"claim_amount"`
	ApprovedAmount float64 `gorm:"default:0" json:"approved_amount"`

	Status string `gorm:"default:'draft';index" json:"status"`
	Notes  string `json:"notes"`

	SubmittedAt *time.Time `json:"submitted_at"`
	SettledAt   *time.Time `json:"settled_at"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (c *InsuranceClaim) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
