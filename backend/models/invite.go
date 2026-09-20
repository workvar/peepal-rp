package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Invite is a one-time, expiring token that lets a freshly-created user set
// their own password instead of the admin choosing one for them. The raw token
// is e-mailed to the user; only its SHA-256 hash is stored here so a database
// leak cannot be replayed. Accepting an invite stamps AcceptedAt and is then
// inert.
type Invite struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	UserID   string `gorm:"not null;index" json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`

	// TokenHash is the hex SHA-256 of the raw token. Unique so a token maps to
	// at most one invite.
	TokenHash string `gorm:"uniqueIndex;not null" json:"-"`

	ExpiresAt  time.Time  `gorm:"not null" json:"expires_at"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

func (i *Invite) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}

// IsRedeemable reports whether the invite can still be accepted: not yet used
// and not expired.
func (i *Invite) IsRedeemable() bool {
	return i.AcceptedAt == nil && time.Now().Before(i.ExpiresAt)
}
