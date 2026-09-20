package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PlatformTenantID is the fixed ID for the platform's own tenant (super admin belongs to this)
const PlatformTenantID = "00000000-0000-0000-0000-000000000001"

type TenantStatus string

const (
	TenantActive    TenantStatus = "active"
	TenantSuspended TenantStatus = "suspended"
)

type TenantType string

const (
	// Educational institutions — schools, colleges, training centers.
	TenantTypeEducation TenantType = "education"
	// Corporate / for-profit companies.
	TenantTypeCorporate TenantType = "corporate"
	// Hospitals, clinics, and other healthcare providers.
	TenantTypeHealthcare TenantType = "healthcare"
	// NGOs, non-profits, community organizations.
	TenantTypeNonprofit TenantType = "nonprofit"

	// Legacy values retained for backward compatibility with existing rows.
	// Prefer the canonical types above for new tenants.
	TenantTypeCollege    TenantType = "college"    // maps to Education
	TenantTypeEnterprise TenantType = "enterprise" // maps to Corporate
)

// Canonical returns the canonical TenantType, collapsing legacy aliases.
func (t TenantType) Canonical() TenantType {
	switch t {
	case TenantTypeCollege:
		return TenantTypeEducation
	case TenantTypeEnterprise:
		return TenantTypeCorporate
	case "":
		return TenantTypeEducation
	default:
		return t
	}
}

// IsValid reports whether the TenantType is a known value (including legacy aliases).
func (t TenantType) IsValid() bool {
	switch t {
	case TenantTypeEducation, TenantTypeCorporate, TenantTypeHealthcare, TenantTypeNonprofit,
		TenantTypeCollege, TenantTypeEnterprise:
		return true
	}
	return false
}

type Tenant struct {
	ID                string       `gorm:"primaryKey" json:"id"`
	Name              string       `gorm:"not null" json:"name"`
	Type              TenantType   `gorm:"default:'college'" json:"type"`
	Status            TenantStatus `gorm:"default:'active'" json:"status"`
	Subdomain         string       `gorm:"uniqueIndex;not null" json:"subdomain"`
	LogoURL           string       `json:"logo_url"`
	Timezone          string       `gorm:"default:'Asia/Kolkata'" json:"timezone"`
	Currency          string       `gorm:"default:'INR'" json:"currency"`
	PrimaryAdminEmail string       `json:"primary_admin_email"`

	// Identity policy: do staff / students need an email to exist and log in?
	// Some organisations run purely on Employee ID / Roll Number and only the
	// tenant admin has an email. These default to true so existing tenants stay
	// email-based. When false, accounts for that population may be created
	// without an email and sign in with their Employee ID / Roll Number.
	//
	// Pointers (not plain bool) so an explicit false is persisted: GORM omits a
	// zero-value bool when a default tag is set, which would silently re-enable
	// email. nil means "unset" and falls back to the column default (true).
	StaffEmailRequired   *bool `gorm:"not null;default:true" json:"staff_email_required"`
	StudentEmailRequired *bool `gorm:"not null;default:true" json:"student_email_required"`

	// EmailSendingAllowed is the super-admin capability switch: may this tenant
	// send system mail (password-setup invites, notifications) at all? When
	// false the invite option is hidden and admins must set passwords directly.
	// Pointer for the same "persist an explicit false" reason as the flags
	// above; nil falls back to the column default (true).
	EmailSendingAllowed *bool `gorm:"not null;default:true" json:"email_sending_allowed"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EmailAllowed reads the super-admin email capability with a safe default of
// true for legacy rows where the pointer may be nil.
func (t *Tenant) EmailAllowed() bool {
	return t.EmailSendingAllowed == nil || *t.EmailSendingAllowed
}

// StaffEmailReq / StudentEmailReq read the policy with a safe default of true
// for legacy rows where the pointer may be nil.
func (t *Tenant) StaffEmailReq() bool {
	return t.StaffEmailRequired == nil || *t.StaffEmailRequired
}

func (t *Tenant) StudentEmailReq() bool {
	return t.StudentEmailRequired == nil || *t.StudentEmailRequired
}

// EmailRequiredForRole reports whether a user with the given role must have an
// email on this tenant. Admins and super admins always need one (they manage
// the org and receive system mail). Teachers/staff follow StaffEmailRequired;
// students follow StudentEmailRequired.
func (t *Tenant) EmailRequiredForRole(role Role) bool {
	switch role {
	case RoleStudent:
		return t.StudentEmailReq()
	case RoleTeacher, RoleStaff:
		return t.StaffEmailReq()
	default:
		// admin, super_admin, and any unknown role: require email.
		return true
	}
}

func (t *Tenant) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
