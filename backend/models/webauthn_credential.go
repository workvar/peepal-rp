package models

// webauthn_credential.go — the stored half of a passkey.
//
// A passkey is a key pair: the private half never leaves the user's device
// (Touch ID, Windows Hello, a phone, a security key), and only the public half
// is kept here. That is what makes it phishing-resistant — there is no shared
// secret to steal from this table, and a dump of it grants nobody a login.
//
// The library's Credential struct is stored as JSON rather than exploded into
// columns. It is a spec-defined record ("Credential Record" in WebAuthn §4)
// that gains fields as the spec does; keeping it opaque means a library upgrade
// does not need a migration. The two things we actually query on — the
// credential ID and the owning user — are real indexed columns.

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrCredentialNotFound — no stored passkey matches the presented credential ID.
var ErrCredentialNotFound = errors.New("passkey not recognised")

// WebAuthnCredential is one registered passkey belonging to one user.
type WebAuthnCredential struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	UserID   string `gorm:"not null;index" json:"user_id"`
	// CredentialID is the authenticator's credential ID, base64url-encoded so
	// it can live in a unique index and be compared as a string. Globally
	// unique: the same authenticator must never map to two accounts.
	CredentialID string `gorm:"not null;uniqueIndex;size:512" json:"credential_id"`
	// CredentialJSON is the marshalled webauthn.Credential (public key, flags,
	// transports, attestation). Opaque to this layer on purpose.
	CredentialJSON string `gorm:"type:text;not null" json:"-"`
	// Name is the user's own label for the device ("MacBook Touch ID"). Purely
	// cosmetic, but it is what makes the "your passkeys" list usable.
	Name string `gorm:"default:''" json:"name"`
	// SignCount mirrors the authenticator's usage counter. Kept as a column as
	// well as inside the JSON so a clone can be spotted with a cheap query.
	SignCount uint32 `gorm:"default:0" json:"sign_count"`
	// CloneWarning is set when an authenticator's counter went backwards, which
	// means two copies of a credential are in circulation.
	CloneWarning bool `gorm:"default:false" json:"clone_warning"`
	// BackupEligible / BackupState describe whether the key syncs to a cloud
	// keychain. Shown in the UI: a synced passkey survives a lost device, a
	// device-bound one does not.
	BackupEligible bool       `gorm:"default:false" json:"backup_eligible"`
	BackupState    bool       `gorm:"default:false" json:"backup_state"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (c *WebAuthnCredential) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}

// EncodeCredentialID renders a raw credential ID the way it is stored and the
// way browsers send it back.
func EncodeCredentialID(raw []byte) string {
	return base64.RawURLEncoding.EncodeToString(raw)
}

// Credential decodes the stored record back into the library's type.
func (c *WebAuthnCredential) Credential() (webauthn.Credential, error) {
	var cred webauthn.Credential
	if err := json.Unmarshal([]byte(c.CredentialJSON), &cred); err != nil {
		return webauthn.Credential{}, err
	}
	return cred, nil
}

// StoreCredential persists a freshly registered passkey.
//
// The uniqueness of CredentialID is what stops the same authenticator being
// bound to two accounts, so a duplicate is reported rather than silently
// overwriting whatever was there.
func StoreCredential(db *gorm.DB, userID, tenantID, name string, cred *webauthn.Credential) (*WebAuthnCredential, error) {
	blob, err := json.Marshal(cred)
	if err != nil {
		return nil, err
	}
	row := &WebAuthnCredential{
		TenantID:       tenantID,
		UserID:         userID,
		CredentialID:   EncodeCredentialID(cred.ID),
		CredentialJSON: string(blob),
		Name:           name,
		SignCount:      cred.Authenticator.SignCount,
		BackupEligible: cred.Flags.BackupEligible,
		BackupState:    cred.Flags.BackupState,
	}
	if err := db.Create(row).Error; err != nil {
		return nil, err
	}
	return row, nil
}

// UserCredentials returns every passkey a user has registered, newest first.
func UserCredentials(db *gorm.DB, userID string) ([]WebAuthnCredential, error) {
	var rows []WebAuthnCredential
	err := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

// UserHasCredentials is the cheap "can this account use a passkey at all?"
// check the login page asks before offering the button.
func UserHasCredentials(db *gorm.DB, userID string) bool {
	var count int64
	db.Model(&WebAuthnCredential{}).Where("user_id = ?", userID).Count(&count)
	return count > 0
}

// FindCredential resolves a presented credential ID to its stored record.
func FindCredential(db *gorm.DB, rawID []byte) (*WebAuthnCredential, error) {
	var row WebAuthnCredential
	if err := db.Where("credential_id = ?", EncodeCredentialID(rawID)).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCredentialNotFound
		}
		return nil, err
	}
	return &row, nil
}

// RecordCredentialUse writes back what a successful assertion changed.
//
// The signature counter is the point: an authenticator increments it on every
// use, so a counter that fails to advance means the credential was cloned. The
// spec has the Relying Party store the new value on every login, and we keep
// the flag the library raises alongside it rather than dropping the finding.
func RecordCredentialUse(db *gorm.DB, row *WebAuthnCredential, cred *webauthn.Credential) error {
	blob, err := json.Marshal(cred)
	if err != nil {
		return err
	}
	now := time.Now()
	return db.Model(&WebAuthnCredential{}).Where("id = ?", row.ID).Updates(map[string]any{
		"credential_json": string(blob),
		"sign_count":      cred.Authenticator.SignCount,
		"clone_warning":   cred.Authenticator.CloneWarning,
		"backup_state":    cred.Flags.BackupState,
		"last_used_at":    now,
		"updated_at":      now,
	}).Error
}

// DeleteCredential removes one passkey, scoped to its owner so an ID guessed
// from elsewhere cannot delete somebody else's key.
func DeleteCredential(db *gorm.DB, userID, credentialRowID string) error {
	res := db.Where("id = ? AND user_id = ?", credentialRowID, userID).Delete(&WebAuthnCredential{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrCredentialNotFound
	}
	return nil
}

// RenameCredential updates the user's own label for a passkey.
func RenameCredential(db *gorm.DB, userID, credentialRowID, name string) error {
	res := db.Model(&WebAuthnCredential{}).
		Where("id = ? AND user_id = ?", credentialRowID, userID).
		Updates(map[string]any{"name": name, "updated_at": time.Now()})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrCredentialNotFound
	}
	return nil
}
