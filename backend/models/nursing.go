package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Nursing station — healthcare industry, Phase 4. Bedside care for admitted
// patients: vitals charting and the medication administration record (MAR).

// VitalsRecord is one set of vitals taken for an admitted patient. Kept as
// discrete numeric columns (not the free-form Encounter.Vitals JSON) so the
// nursing chart can trend them.
type VitalsRecord struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TenantID    string `gorm:"not null;index" json:"tenant_id"`
	AdmissionID string `gorm:"not null;index" json:"admission_id"`
	PatientID   string `gorm:"not null;index" json:"patient_id"`

	RecordedByID string   `gorm:"index" json:"recorded_by_id"`
	RecordedBy   Employee `gorm:"foreignKey:RecordedByID" json:"recorded_by,omitempty"`

	// RecordedAt is the observation time (RFC3339); defaults to now.
	RecordedAt time.Time `gorm:"index" json:"recorded_at"`

	TempC       float64 `json:"temp_c"`
	Pulse       int     `json:"pulse"`
	RespRate    int     `json:"resp_rate"`
	BpSystolic  int     `json:"bp_systolic"`
	BpDiastolic int     `json:"bp_diastolic"`
	Spo2        int     `json:"spo2"`
	PainScore   int     `json:"pain_score"`
	Notes       string  `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
}

func (v *VitalsRecord) BeforeCreate(tx *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.NewString()
	}
	if v.RecordedAt.IsZero() {
		v.RecordedAt = time.Now()
	}
	return nil
}

// MedicationOrder statuses.
const (
	MedOrderActive       = "active"
	MedOrderDiscontinued = "discontinued"
)

// MedicationOrder is a prescribed drug for an admitted patient (one row of the
// MAR): what to give, how much, by what route and how often.
type MedicationOrder struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TenantID    string `gorm:"not null;index" json:"tenant_id"`
	AdmissionID string `gorm:"not null;index" json:"admission_id"`
	PatientID   string `gorm:"not null;index" json:"patient_id"`

	// DrugID links the pharmacy catalog when the drug is stocked; DrugName is
	// always frozen so the record survives catalog edits.
	DrugID    string `gorm:"index" json:"drug_id"`
	DrugName  string `gorm:"not null" json:"drug_name"`
	Dose      string `json:"dose"`      // e.g. "500 mg"
	Route     string `json:"route"`     // oral | iv | im | sc | topical | other
	Frequency string `json:"frequency"` // e.g. "BD", "q8h"

	OrderedByID string   `gorm:"index" json:"ordered_by_id"`
	OrderedBy   Employee `gorm:"foreignKey:OrderedByID" json:"ordered_by,omitempty"`

	StartDate string `json:"start_date"` // YYYY-MM-DD
	EndDate   string `json:"end_date"`
	Status    string `gorm:"default:'active';index" json:"status"`
	Notes     string `json:"notes"`

	Administrations []MedicationAdministration `gorm:"foreignKey:MedicationOrderID" json:"administrations,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (m *MedicationOrder) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

// Medication administration outcomes.
const (
	MedGiven   = "given"
	MedHeld    = "held"
	MedRefused = "refused"
)

// MedicationAdministration is one recorded dose event against a MedicationOrder.
type MedicationAdministration struct {
	ID                string `gorm:"primaryKey" json:"id"`
	TenantID          string `gorm:"not null;index" json:"tenant_id"`
	MedicationOrderID string `gorm:"not null;index" json:"medication_order_id"`

	AdministeredByID string   `gorm:"index" json:"administered_by_id"`
	AdministeredBy   Employee `gorm:"foreignKey:AdministeredByID" json:"administered_by,omitempty"`

	AdministeredAt time.Time `gorm:"index" json:"administered_at"`
	// Status: given | held | refused.
	Status string `gorm:"default:'given'" json:"status"`
	Notes  string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
}

func (a *MedicationAdministration) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	if a.AdministeredAt.IsZero() {
		a.AdministeredAt = time.Now()
	}
	return nil
}
