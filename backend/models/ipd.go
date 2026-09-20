package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IPD / ADT + Ward-Bed management — healthcare industry, Phase 3.
//
// The inpatient backbone: wards hold beds (grouped into bays), an admission
// places a patient on a bed, transfers move them, and a discharge frees the bed
// and captures the discharge summary. This mirrors the hostel block→room→bed
// shape (wards→bays→beds) so the bed visualiser can be reused.

// Bed statuses.
const (
	BedAvailable   = "available"
	BedOccupied    = "occupied"
	BedMaintenance = "maintenance"
)

// Admission statuses.
const (
	AdmissionAdmitted   = "admitted"
	AdmissionDischarged = "discharged"
)

// Ward gender policy (which patients may occupy its beds).
const (
	WardGenderAny    = "any"
	WardGenderMale   = "male"
	WardGenderFemale = "female"
)

// Ward is a nursing unit that holds beds (hostel block counterpart).
type Ward struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_ward_code" json:"tenant_id"`
	Code     string `gorm:"not null;uniqueIndex:idx_ward_code" json:"code"`
	Name     string `gorm:"not null" json:"name"`
	// WardType: general | icu | hdu | maternity | pediatric | private | isolation.
	WardType string `gorm:"default:'general'" json:"ward_type"`
	// Gender restricts occupants: any | male | female.
	Gender    string    `gorm:"default:'any'" json:"gender"`
	Floor     string    `json:"floor"`
	Active    bool      `gorm:"default:true" json:"active"`
	Beds      []Bed     `gorm:"foreignKey:WardID" json:"beds,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (w *Ward) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.NewString()
	}
	return nil
}

// Bed is a single bed in a ward. Bay is a free-text grouping label (the hostel
// "room" counterpart) so a ward can be sectioned without a separate table.
type Bed struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	WardID   string `gorm:"not null;index;uniqueIndex:idx_bed_number" json:"ward_id"`
	Ward     Ward   `gorm:"foreignKey:WardID" json:"ward,omitempty"`
	// BedNumber is unique within a ward.
	BedNumber   string    `gorm:"not null;uniqueIndex:idx_bed_number" json:"bed_number"`
	Bay         string    `json:"bay"`
	Status      string    `gorm:"default:'available';index" json:"status"`
	DailyCharge float64   `gorm:"not null;default:0" json:"daily_charge"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (b *Bed) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

// Admission places a patient on a bed and, on discharge, holds the summary.
type Admission struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// EncounterID links the IPD encounter, when one was opened; blank otherwise.
	EncounterID string `gorm:"index" json:"encounter_id"`

	ClinicianID string   `gorm:"index" json:"clinician_id"`
	Clinician   Employee `gorm:"foreignKey:ClinicianID" json:"clinician,omitempty"`

	WardID string `gorm:"index" json:"ward_id"`
	Ward   Ward   `gorm:"foreignKey:WardID" json:"ward,omitempty"`
	BedID  string `gorm:"index" json:"bed_id"`
	Bed    Bed    `gorm:"foreignKey:BedID" json:"bed,omitempty"`

	// AdmissionDate/DischargeDate are YYYY-MM-DD.
	AdmissionDate string `gorm:"not null;index" json:"admission_date"`
	Reason        string `json:"reason"`
	Status        string `gorm:"default:'admitted';index" json:"status"`

	DischargeDate string `json:"discharge_date"`
	// Discharge summary fields.
	DischargeDiagnosis   string `gorm:"type:text" json:"discharge_diagnosis"`
	TreatmentGiven       string `gorm:"type:text" json:"treatment_given"`
	ConditionOnDischarge string `json:"condition_on_discharge"`
	FollowUpInstructions string `gorm:"type:text" json:"follow_up_instructions"`

	Transfers []BedTransfer `gorm:"foreignKey:AdmissionID" json:"transfers,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (a *Admission) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// BedTransfer records one ward/bed move within an admission (the T in ADT).
type BedTransfer struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TenantID    string `gorm:"not null;index" json:"tenant_id"`
	AdmissionID string `gorm:"not null;index" json:"admission_id"`

	FromBedID  string `json:"from_bed_id"`
	ToBedID    string `json:"to_bed_id"`
	FromWardID string `json:"from_ward_id"`
	ToWardID   string `json:"to_ward_id"`

	// TransferDate is YYYY-MM-DD.
	TransferDate string    `json:"transfer_date"`
	Reason       string    `json:"reason"`
	CreatedAt    time.Time `json:"created_at"`
}

func (t *BedTransfer) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
