package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EmailSettings stores the SMTP transport used to send system mail (invites,
// notifications) for one scope. There is one row per tenant, plus one row for
// the platform itself (TenantID == PlatformTenantID) that acts as the shared
// fallback when a tenant has not configured its own SMTP.
//
// Resolution (see mailer.Resolve): a tenant's own row is used when it has SMTP
// host + from address set; otherwise the platform row is used. Either way the
// tenant must be Allowed (Tenant.EmailSendingAllowed) and the chosen row must
// be Enabled.
type EmailSettings struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"uniqueIndex;not null" json:"tenant_id"`

	// Enabled is the on/off switch for this scope. For a tenant row it is the
	// tenant admin's toggle; for the platform row it is the super admin's
	// master switch. Sending is skipped when false.
	Enabled bool `gorm:"not null;default:true" json:"enabled"`

	// Envelope identity shown to recipients.
	FromName  string `json:"from_name"`
	FromEmail string `json:"from_email"`

	// SMTP transport. SMTPPassword is write-only (never serialised back out).
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `gorm:"default:587" json:"smtp_port"`
	SMTPUsername string `json:"smtp_username"`
	SMTPPassword string `gorm:"default:''" json:"-"`

	// UseTLS selects implicit TLS (port 465). When false the client uses
	// STARTTLS upgrade on the connection (port 587), which is the common case.
	UseTLS bool `gorm:"not null;default:false" json:"use_tls"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *EmailSettings) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}

// HasSMTP reports whether this row carries a usable transport (host + sender).
func (e *EmailSettings) HasSMTP() bool {
	return e.SMTPHost != "" && e.FromEmail != ""
}
