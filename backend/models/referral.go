package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Referrals — healthcare industry, Phase 5. A patient referred out to another
// facility or specialist.

// Referral statuses.
const (
	ReferralPending   = "pending"
	ReferralAccepted  = "accepted"
	ReferralCompleted = "completed"
	ReferralDeclined  = "declined"
)

// Referral urgency levels.
const (
	ReferralRoutine   = "routine"
	ReferralUrgent    = "urgent"
	ReferralEmergency = "emergency"
)

// Commission types for referral income-sharing (Phase 4).
const (
	ReferralCommissionNone    = "none"
	ReferralCommissionFlat    = "flat"
	ReferralCommissionPercent = "percent"
)

// Settlement status for a referral's commission.
const (
	ReferralSettlementPending = "pending"
	ReferralSettlementSettled = "settled"
)

// Referral is one outbound referral for a patient.
type Referral struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	FromClinicianID string   `gorm:"index" json:"from_clinician_id"`
	FromClinician   Employee `gorm:"foreignKey:FromClinicianID" json:"from_clinician,omitempty"`

	ReferredTo string `gorm:"not null" json:"referred_to"` // external facility / specialist
	Specialty  string `json:"specialty"`
	Reason     string `gorm:"type:text" json:"reason"`
	Urgency    string `gorm:"default:'routine'" json:"urgency"`

	ReferralDate string `gorm:"index" json:"referral_date"` // YYYY-MM-DD
	Status       string `gorm:"default:'pending';index" json:"status"`
	Notes        string `json:"notes"`

	// Commission / income-sharing (Phase 4): settlements post into the GL
	// (Phase 3) as a payable when a tenant has accounting enabled.
	CommissionType   string  `gorm:"default:'none'" json:"commission_type"`            // none | flat | percent
	CommissionValue  float64 `gorm:"default:0" json:"commission_value"`                // amount (flat) or percent (0-100)
	CommissionBase   float64 `gorm:"default:0" json:"commission_base"`                 // billable amount the % applies to
	CommissionAmount float64 `gorm:"default:0" json:"commission_amount"`               // computed, frozen at settlement
	PayeeType        string  `json:"payee_type"`                                       // doctor | centre
	PayeeName        string  `json:"payee_name"`                                       // free text external payee
	PayeeEmployeeID  string  `gorm:"index" json:"payee_employee_id"`                   // optional internal doctor
	SettlementStatus string  `gorm:"default:'pending';index" json:"settlement_status"` // pending | settled
	SettledOn        string  `json:"settled_on"`                                       // YYYY-MM-DD

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (r *Referral) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
