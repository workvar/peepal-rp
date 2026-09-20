package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Patient is the healthcare-industry counterpart of Student: the person a
// hospital or clinic treats. Patients are records managed by staff — they do
// not get a login account in this phase. MRN (Medical Record Number) is the
// human-facing identifier, unique per tenant (like a roll number).
type Patient struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_patient_mrn" json:"tenant_id"`
	// MRN is the Medical Record Number, unique within the tenant.
	MRN string `gorm:"not null;uniqueIndex:idx_patient_mrn" json:"mrn"`
	// UHID is a lifetime Unique Health ID, distinct from the MRN: MRN is a
	// per-tenant chart number, UHID is meant to persist across a patient's
	// whole relationship with the facility (kept per-tenant here, same as
	// MRN, since this platform doesn't federate identity across tenants).
	// Server-assigned on registration, never edited. Uniqueness is enforced by
	// a partial index (database.go) rather than a gorm uniqueIndex tag so
	// existing patients with a blank UHID (pre-migration) never collide —
	// mirrors the transport-allocation / library-ISBN partial index pattern.
	// column:uhid is explicit: GORM's default naming would turn the all-caps
	// field "UHID" into "uh_id", but every raw query (nextUHID, the bulk
	// generator, the backfill) and the partial unique index use "uhid". Pinning
	// the column keeps struct writes, AutoMigrate, and that raw SQL in agreement.
	UHID      string `gorm:"column:uhid;index" json:"uhid"`
	FirstName string `gorm:"not null" json:"first_name"`
	LastName  string `json:"last_name"`

	Gender      string `json:"gender"`
	DateOfBirth string `json:"date_of_birth"`
	BloodGroup  string `json:"blood_group"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	City        string `json:"city"`
	State       string `json:"state"`
	Pincode     string `json:"pincode"`

	EmergencyName  string `json:"emergency_name"`
	EmergencyPhone string `json:"emergency_phone"`

	// Allergies and ChronicConditions are free-text clinical flags surfaced on
	// every encounter for safety.
	Allergies         string `json:"allergies"`
	ChronicConditions string `json:"chronic_conditions"`

	// UserID links an optional login account (role=patient) so the patient can
	// use the self-service portal. Blank until an admin creates the login.
	UserID string `gorm:"index" json:"user_id"`

	// Status: active | inactive | deceased.
	Status string `gorm:"default:'active'" json:"status"`

	RegisteredAt time.Time `json:"registered_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (p *Patient) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.RegisteredAt.IsZero() {
		p.RegisteredAt = time.Now()
	}
	return nil
}
