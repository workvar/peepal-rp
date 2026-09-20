package models

// webauthn_session.go — the short-lived state of a ceremony in flight.
//
// Both WebAuthn ceremonies are two round trips: the server issues a random
// challenge, the authenticator signs it, and the server checks the signature
// against the challenge it issued. That challenge has to survive between the
// two requests, and it must not be something the client can choose — otherwise
// a replayed signature would verify.
//
// It is kept here rather than in a cookie so the same code path serves browsers
// and native clients (which have no cookie jar), and so a challenge can be
// spent exactly once: Consume deletes the row as it reads it.

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"gorm.io/gorm"
)

// Ceremony purposes. A challenge issued for registration must never be
// redeemable as a login, so the purpose is checked on consumption.
const (
	CeremonyRegister = "register"
	CeremonyLogin    = "login"
)

// challengeTTL bounds how long a user has to touch their authenticator. Long
// enough for a phone prompt and a fingerprint, short enough that an abandoned
// challenge is not sitting around.
const challengeTTL = 5 * time.Minute

var (
	// ErrCeremonyUnknown — no such challenge, or it was already spent.
	ErrCeremonyUnknown = errors.New("this sign-in attempt is no longer valid")
	// ErrCeremonyExpired — the challenge outlived its window.
	ErrCeremonyExpired = errors.New("this sign-in attempt timed out")
)

// WebAuthnSession is one in-flight ceremony.
type WebAuthnSession struct {
	// ID is the opaque handle returned to the client. It is random, not
	// sequential: it is the only thing tying the second request to the first.
	ID      string `gorm:"primaryKey;size:64" json:"id"`
	Purpose string `gorm:"not null;index" json:"purpose"`
	// UserID is set for registration and identifier-first login, and empty for
	// a discoverable ("usernameless") login where the credential itself will
	// name the user.
	UserID   string `gorm:"index" json:"user_id"`
	TenantID string `gorm:"index" json:"tenant_id"`
	// TenantSubdomain records which login page began the ceremony, so the user
	// a discoverable credential resolves to can be checked against it.
	TenantSubdomain string `gorm:"default:''" json:"tenant_subdomain"`
	// Data is the marshalled webauthn.SessionData (challenge, allowed
	// credentials, user-verification requirement).
	Data      string    `gorm:"type:text;not null" json:"-"`
	ExpiresAt time.Time `gorm:"index" json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// NewCeremonyID returns an unguessable handle for a ceremony.
func NewCeremonyID() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		// Failing closed matters here: a predictable handle would let one
		// client finish another's ceremony.
		panic("models.NewCeremonyID: system CSPRNG unavailable: " + err.Error())
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// StartCeremony stores the session data for a ceremony and returns its handle.
func StartCeremony(db *gorm.DB, purpose, userID, tenantID, tenantSubdomain string, data *webauthn.SessionData) (string, error) {
	blob, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	row := WebAuthnSession{
		ID:              NewCeremonyID(),
		Purpose:         purpose,
		UserID:          userID,
		TenantID:        tenantID,
		TenantSubdomain: tenantSubdomain,
		Data:            string(blob),
		ExpiresAt:       time.Now().Add(challengeTTL),
	}
	if err := db.Create(&row).Error; err != nil {
		return "", err
	}
	// Opportunistic sweep on the cheapest schedule: ceremonies are rare and
	// abandoned ones are worthless the moment they expire.
	db.Where("expires_at < ?", time.Now()).Delete(&WebAuthnSession{})
	return row.ID, nil
}

// ConsumeCeremony reads a ceremony and deletes it in the same step, so a
// challenge can be answered exactly once.
func ConsumeCeremony(db *gorm.DB, id, purpose string) (*WebAuthnSession, *webauthn.SessionData, error) {
	if id == "" {
		return nil, nil, ErrCeremonyUnknown
	}
	var row WebAuthnSession
	if err := db.Where("id = ? AND purpose = ?", id, purpose).First(&row).Error; err != nil {
		return nil, nil, ErrCeremonyUnknown
	}
	// Spend it whatever happens next: a failed verification must not leave a
	// live challenge behind for a second attempt.
	db.Delete(&WebAuthnSession{}, "id = ?", row.ID)

	if time.Now().After(row.ExpiresAt) {
		return nil, nil, ErrCeremonyExpired
	}
	var data webauthn.SessionData
	if err := json.Unmarshal([]byte(row.Data), &data); err != nil {
		return nil, nil, ErrCeremonyUnknown
	}
	return &row, &data, nil
}
