package models

// login_pin.go — the optional second factor that rides along with a passkey.
//
// A passkey proves possession of a device. For most accounts that is enough,
// but a shared or unattended machine weakens it: whoever holds the unlocked
// laptop holds the credential. The PIN adds the other half — something the
// user knows — without asking anyone to remember another password.
//
// Six digits is only a million possibilities, so the secrecy of the PIN is not
// what protects it; the throttle is. Guesses are counted per account and the
// account locks for a cooling-off period after a handful of misses, which puts
// an offline-speed search out of reach. The hash is bcrypt for the same reason
// passwords are: a stolen table must not be brute-forcible at memory speed.
//
// The PIN is never a login on its own. It is only ever accepted while holding
// a pending-login token that a completed passkey assertion just issued.

import (
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"regexp"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	// pinMaxAttempts is how many wrong PINs are tolerated before the account
	// stops accepting them for a while.
	pinMaxAttempts = 5
	// pinLockWindow is that cooling-off period.
	pinLockWindow = 15 * time.Minute
	// pendingLoginTTL bounds the gap between passing the passkey step and
	// entering the PIN. Short: the user is looking at the prompt already.
	pendingLoginTTL = 5 * time.Minute
)

var (
	// ErrPINNotSet — the account has no PIN configured.
	ErrPINNotSet = errors.New("no PIN is set for this account")
	// ErrPINIncorrect — wrong PIN, and attempts remain.
	ErrPINIncorrect = errors.New("incorrect PIN")
	// ErrPINLocked — too many wrong PINs; the account is cooling off.
	ErrPINLocked = errors.New("too many incorrect PINs. Try again later")
	// ErrPINFormat — not six digits.
	ErrPINFormat = errors.New("PIN must be exactly 6 digits")
	// ErrPINWeak — a PIN that a shoulder-surfer would guess first.
	ErrPINWeak = errors.New("choose a less predictable PIN — avoid repeated digits or simple sequences")
	// ErrPendingLoginInvalid — the token handed to the PIN step is unknown,
	// spent, or expired.
	ErrPendingLoginInvalid = errors.New("this sign-in attempt is no longer valid")
)

var sixDigits = regexp.MustCompile(`^[0-9]{6}$`)

// LoginPIN is the per-user PIN record. One row per user, keyed by the user ID:
// a user has at most one PIN, and deleting the row is what "turn it off" means.
type LoginPIN struct {
	UserID   string `gorm:"primaryKey" json:"user_id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	Hash     string `gorm:"not null" json:"-"`
	// FailedAttempts counts consecutive misses. Reset on any success.
	FailedAttempts int `gorm:"default:0" json:"failed_attempts"`
	// LockedUntil is set once the miss budget is spent.
	LockedUntil *time.Time `json:"locked_until,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ValidatePIN enforces the format and rejects the handful of PINs that are
// guessed first in practice. It is deliberately a short list: rejecting too
// much pushes users toward writing the PIN down, which is worse.
func ValidatePIN(pin string) error {
	if !sixDigits.MatchString(pin) {
		return ErrPINFormat
	}
	// All one digit: 000000, 111111, …
	same := true
	for i := 1; i < len(pin); i++ {
		if pin[i] != pin[0] {
			same = false
			break
		}
	}
	if same {
		return ErrPINWeak
	}
	// Strictly ascending or descending runs: 123456, 654321, …
	asc, desc := true, true
	for i := 1; i < len(pin); i++ {
		if pin[i] != pin[i-1]+1 {
			asc = false
		}
		if pin[i] != pin[i-1]-1 {
			desc = false
		}
	}
	if asc || desc {
		return ErrPINWeak
	}
	return nil
}

// SetLoginPIN creates or replaces a user's PIN and clears any lockout.
func SetLoginPIN(db *gorm.DB, userID, tenantID, pin string) error {
	if err := ValidatePIN(pin); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	row := LoginPIN{
		UserID:         userID,
		TenantID:       tenantID,
		Hash:           string(hash),
		FailedAttempts: 0,
		LockedUntil:    nil,
	}
	// Upsert by primary key: setting a PIN twice is a change, not a conflict.
	return db.Save(&row).Error
}

// GetLoginPIN loads a user's PIN record, or ErrPINNotSet.
func GetLoginPIN(db *gorm.DB, userID string) (*LoginPIN, error) {
	var row LoginPIN
	if err := db.Where("user_id = ?", userID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPINNotSet
		}
		return nil, err
	}
	return &row, nil
}

// HasLoginPIN reports whether a PIN is required to finish this user's login.
func HasLoginPIN(db *gorm.DB, userID string) bool {
	var count int64
	db.Model(&LoginPIN{}).Where("user_id = ?", userID).Count(&count)
	return count > 0
}

// ClearLoginPIN turns the second factor off.
func ClearLoginPIN(db *gorm.DB, userID string) error {
	return db.Where("user_id = ?", userID).Delete(&LoginPIN{}).Error
}

// VerifyLoginPIN checks a PIN and maintains the throttle.
//
// The bookkeeping is the security control, so it happens on every path: a miss
// costs an attempt, the last attempt sets the lock, and a hit wipes both. A
// locked account is refused without comparing anything, so the lock cannot be
// worn down by continuing to guess through it.
func VerifyLoginPIN(db *gorm.DB, userID, pin string) error {
	row, err := GetLoginPIN(db, userID)
	if err != nil {
		return err
	}
	if row.LockedUntil != nil && time.Now().Before(*row.LockedUntil) {
		return ErrPINLocked
	}

	if bcrypt.CompareHashAndPassword([]byte(row.Hash), []byte(pin)) == nil {
		return db.Model(&LoginPIN{}).Where("user_id = ?", userID).
			Updates(map[string]any{"failed_attempts": 0, "locked_until": nil}).Error
	}

	attempts := row.FailedAttempts + 1
	updates := map[string]any{"failed_attempts": attempts}
	outcome := ErrPINIncorrect
	if attempts >= pinMaxAttempts {
		until := time.Now().Add(pinLockWindow)
		updates["failed_attempts"] = 0
		updates["locked_until"] = until
		outcome = ErrPINLocked
	}
	if err := db.Model(&LoginPIN{}).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
		return err
	}
	return outcome
}

// PINAttemptsRemaining is what the UI shows next to a wrong-PIN message. It is
// not a secret — telling the user how close they are to a lockout prevents the
// lockout more often than it helps an attacker, who learns the same thing by
// counting.
func PINAttemptsRemaining(db *gorm.DB, userID string) int {
	row, err := GetLoginPIN(db, userID)
	if err != nil {
		return 0
	}
	left := pinMaxAttempts - row.FailedAttempts
	if left < 0 {
		return 0
	}
	return left
}

// PendingLogin is a login that passed its passkey step and is waiting on the
// PIN. It exists so the server, not the client, decides who the half-finished
// login belongs to: the client only ever holds an opaque token.
//
// Only the token's hash is stored, for the same reason refresh tokens are
// hashed — a dump of this table must not hand anyone a login in progress.
type PendingLogin struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TokenHash string    `gorm:"not null;uniqueIndex;size:64" json:"-"`
	UserID    string    `gorm:"not null;index" json:"user_id"`
	TenantID  string    `gorm:"not null;index" json:"tenant_id"`
	ExpiresAt time.Time `gorm:"index" json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

func (p *PendingLogin) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// HashPendingToken is the one place the token→row mapping is defined.
func HashPendingToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// IssuePendingLogin mints the token handed to the client after a successful
// passkey assertion, and returns the plaintext (stored nowhere).
func IssuePendingLogin(db *gorm.DB, userID, tenantID string) (string, error) {
	token := NewCeremonyID()
	row := PendingLogin{
		TokenHash: HashPendingToken(token),
		UserID:    userID,
		TenantID:  tenantID,
		ExpiresAt: time.Now().Add(pendingLoginTTL),
	}
	if err := db.Create(&row).Error; err != nil {
		return "", err
	}
	db.Where("expires_at < ?", time.Now()).Delete(&PendingLogin{})
	return token, nil
}

// ResolvePendingLogin looks up a pending login without spending it. A wrong PIN
// must not cost the user their token — otherwise a typo would force the whole
// passkey ceremony again, and the throttle above already bounds the guessing.
func ResolvePendingLogin(db *gorm.DB, token string) (*PendingLogin, error) {
	if token == "" {
		return nil, ErrPendingLoginInvalid
	}
	var row PendingLogin
	if err := db.Where("token_hash = ?", HashPendingToken(token)).First(&row).Error; err != nil {
		return nil, ErrPendingLoginInvalid
	}
	if time.Now().After(row.ExpiresAt) {
		db.Delete(&PendingLogin{}, "id = ?", row.ID)
		return nil, ErrPendingLoginInvalid
	}
	return &row, nil
}

// SpendPendingLogin consumes the token once the PIN has been accepted, so the
// same half-finished login cannot be completed twice.
func SpendPendingLogin(db *gorm.DB, id string) {
	db.Delete(&PendingLogin{}, "id = ?", id)
}
