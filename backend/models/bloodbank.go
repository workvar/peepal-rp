package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Blood bank — healthcare industry, Phase 5. A stock of blood units by group +
// component, with issue to patients and optional requests.

// Blood unit statuses.
const (
	BloodAvailable = "available"
	BloodReserved  = "reserved"
	BloodIssued    = "issued"
	BloodExpired   = "expired"
	BloodDiscarded = "discarded"
)

// Blood request statuses.
const (
	BloodReqPending   = "pending"
	BloodReqFulfilled = "fulfilled"
	BloodReqCancelled = "cancelled"
)

// BloodUnit is one bag of a blood component in stock.
type BloodUnit struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_bloodunit_bag" json:"tenant_id"`
	// BagNumber is the human handle, unique within the tenant.
	BagNumber string `gorm:"not null;uniqueIndex:idx_bloodunit_bag" json:"bag_number"`
	// BloodGroup: A+ A- B+ B- AB+ AB- O+ O-.
	BloodGroup string `gorm:"not null;index" json:"blood_group"`
	// Component: whole | rbc | plasma | platelets | cryo.
	Component     string `gorm:"default:'whole'" json:"component"`
	VolumeMl      int    `gorm:"default:0" json:"volume_ml"`
	DonorName     string `json:"donor_name"`
	CollectedDate string `json:"collected_date"` // YYYY-MM-DD
	ExpiryDate    string `gorm:"index" json:"expiry_date"`

	Status string `gorm:"default:'available';index" json:"status"`

	IssuedToID string  `gorm:"index" json:"issued_to_id"` // patient id
	IssuedTo   Patient `gorm:"foreignKey:IssuedToID" json:"issued_to,omitempty"`
	IssuedDate string  `json:"issued_date"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *BloodUnit) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

// BloodRequest is a demand for blood for a patient.
type BloodRequest struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	BloodGroup    string `gorm:"not null" json:"blood_group"`
	Component     string `gorm:"default:'whole'" json:"component"`
	UnitsRequired int    `gorm:"default:1" json:"units_required"`

	RequestedByID string   `gorm:"index" json:"requested_by_id"`
	RequestedBy   Employee `gorm:"foreignKey:RequestedByID" json:"requested_by,omitempty"`

	RequestDate string `json:"request_date"`
	Status      string `gorm:"default:'pending';index" json:"status"`
	Notes       string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (r *BloodRequest) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
