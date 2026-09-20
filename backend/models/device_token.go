package models

// device_token.go — push credentials for a mobile app install.
//
// A row is one app installation, not one user and not one device: reinstalling
// the app yields a new push token, and a shared device (a ward tablet) can be
// signed into by several people over a shift. So the push token is the identity
// here, and the row's UserID says who is currently signed in on it.
//
// Two consequences follow, and both are the reason this is a table rather than
// a column on User:
//
//   - Registering a token that already exists REASSIGNS it. Otherwise the nurse
//     who signs in after a colleague keeps receiving the colleague's alerts,
//     which on a clinical app is a data leak, not an annoyance.
//   - Tokens die silently. The push service only tells us on the next send, so
//     rows are disabled from delivery feedback rather than by anything the
//     client does (see DisableDeviceTokens).

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Device platforms. "web" covers browser push, which nothing sends yet but
// which shares this table when it lands.
const (
	DevicePlatformIOS     = "ios"
	DevicePlatformAndroid = "android"
	DevicePlatformWeb     = "web"
)

// Reasons a token stops being used, recorded for support ("why did my alerts
// stop?") rather than for logic.
const (
	DeviceRevokeLogout         = "logout"
	DeviceRevokeUnregistered   = "device_not_registered"
	DeviceRevokeReassigned     = "reassigned"
	DeviceRevokeAccountRemoved = "account_removed"
)

// ErrInvalidPushToken rejects a value that cannot be an Expo push token, so a
// malformed one is refused at registration instead of failing on every send.
var ErrInvalidPushToken = errors.New("not a valid Expo push token")

// DeviceToken is one app install that can receive push notifications.
type DeviceToken struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	// UserID is who is signed in on this install right now. It changes when
	// someone else signs in on the same device.
	UserID string `gorm:"not null;index" json:"user_id"`
	// Token is the Expo push token. Unique because it IS the device identity;
	// re-registering an existing one updates the row rather than adding a
	// second, which is what stops a device accumulating stale owners.
	Token    string `gorm:"not null;uniqueIndex" json:"token"`
	Platform string `gorm:"not null;default:''" json:"platform"`
	// DeviceID is the app's own install id and DeviceName a human label
	// ("Ward 3 iPad"). Both are for the user-facing device list only; delivery
	// never keys off them.
	DeviceID   string `gorm:"default:'';index" json:"device_id,omitempty"`
	DeviceName string `gorm:"default:''" json:"device_name,omitempty"`
	AppVersion string `gorm:"default:''" json:"app_version,omitempty"`
	// LastSeenAt is refreshed on every registration, so an install that stopped
	// opening the app can be pruned without waiting for a failed send.
	LastSeenAt time.Time `gorm:"index" json:"last_seen_at"`
	// DisabledAt takes a token out of delivery. Kept rather than deleted so the
	// reason survives long enough to answer a support question.
	DisabledAt     *time.Time `json:"disabled_at,omitempty"`
	DisabledReason string     `gorm:"default:''" json:"disabled_reason,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (d *DeviceToken) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

// ValidPushToken reports whether a string has the shape Expo issues. This is a
// format check, not proof the token is live: only a delivery receipt can tell
// us that.
func ValidPushToken(token string) bool {
	t := strings.TrimSpace(token)
	if len(t) < 10 || len(t) > 256 {
		return false
	}
	return (strings.HasPrefix(t, "ExponentPushToken[") || strings.HasPrefix(t, "ExpoPushToken[")) &&
		strings.HasSuffix(t, "]")
}

// RegisterDeviceTokenInput describes one app install announcing itself.
type RegisterDeviceTokenInput struct {
	TenantID   string
	UserID     string
	Token      string
	Platform   string
	DeviceID   string
	DeviceName string
	AppVersion string
}

// RegisterDeviceToken records (or re-points) an install's push token.
//
// The upsert is on Token, so signing in on a device someone else used moves the
// row to the new user and clears any disabled flag. That reassignment is the
// whole point: a push token must never be able to belong to two users at once.
func RegisterDeviceToken(db *gorm.DB, in RegisterDeviceTokenInput) (*DeviceToken, error) {
	token := strings.TrimSpace(in.Token)
	if !ValidPushToken(token) {
		return nil, ErrInvalidPushToken
	}
	platform := strings.ToLower(strings.TrimSpace(in.Platform))
	switch platform {
	case DevicePlatformIOS, DevicePlatformAndroid, DevicePlatformWeb:
	default:
		platform = ""
	}

	now := time.Now()
	row := DeviceToken{
		ID:         uuid.NewString(),
		TenantID:   in.TenantID,
		UserID:     in.UserID,
		Token:      token,
		Platform:   platform,
		DeviceID:   truncate(strings.TrimSpace(in.DeviceID), 128),
		DeviceName: truncate(strings.TrimSpace(in.DeviceName), 128),
		AppVersion: truncate(strings.TrimSpace(in.AppVersion), 32),
		LastSeenAt: now,
	}
	err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "token"}},
		DoUpdates: clause.Assignments(map[string]any{
			"tenant_id":       row.TenantID,
			"user_id":         row.UserID,
			"platform":        row.Platform,
			"device_id":       row.DeviceID,
			"device_name":     row.DeviceName,
			"app_version":     row.AppVersion,
			"last_seen_at":    now,
			"disabled_at":     nil,
			"disabled_reason": "",
			"updated_at":      now,
		}),
	}).Create(&row).Error
	if err != nil {
		return nil, err
	}
	var saved DeviceToken
	if err := db.Where("token = ?", token).First(&saved).Error; err != nil {
		return nil, err
	}
	return &saved, nil
}

// ActiveDeviceTokens returns the live push tokens for a set of users in one
// tenant. Callers pass every recipient at once so a fan-out is a single query
// rather than one per user.
func ActiveDeviceTokens(db *gorm.DB, tenantID string, userIDs []string) ([]DeviceToken, error) {
	if tenantID == "" || len(userIDs) == 0 {
		return nil, nil
	}
	var rows []DeviceToken
	err := db.Where("tenant_id = ? AND user_id IN ? AND disabled_at IS NULL", tenantID, userIDs).
		Find(&rows).Error
	return rows, err
}

// MyDeviceTokens lists a user's live installs, newest first. Backs the
// "signed-in devices" screen.
func MyDeviceTokens(db *gorm.DB, tenantID, userID string) ([]DeviceToken, error) {
	var rows []DeviceToken
	err := db.Where("tenant_id = ? AND user_id = ? AND disabled_at IS NULL", tenantID, userID).
		Order("last_seen_at DESC").Find(&rows).Error
	return rows, err
}

// DisableDeviceTokens stops delivery to specific tokens. Called on logout with
// one token, and from the push sender with whatever the service reported as
// unregistered.
func DisableDeviceTokens(db *gorm.DB, tokens []string, reason string) error {
	if len(tokens) == 0 {
		return nil
	}
	return db.Model(&DeviceToken{}).
		Where("token IN ? AND disabled_at IS NULL", tokens).
		Updates(map[string]any{"disabled_at": time.Now(), "disabled_reason": reason}).Error
}

// DisableUserDeviceTokens cuts off every install a user is signed in on. Pair
// it with RevokeUserSessions wherever access is withdrawn wholesale: a
// deactivated account that keeps receiving push notifications is the same leak
// as one that keeps a live session.
func DisableUserDeviceTokens(db *gorm.DB, userID, reason string) error {
	if userID == "" {
		return nil
	}
	return db.Model(&DeviceToken{}).
		Where("user_id = ? AND disabled_at IS NULL", userID).
		Updates(map[string]any{"disabled_at": time.Now(), "disabled_reason": reason}).Error
}

// PruneDeviceTokens drops rows that can no longer deliver anything: long
// disabled, or belonging to an install that has not opened the app in months
// (its token will have been recycled by the push service by then).
func PruneDeviceTokens(db *gorm.DB) (int64, error) {
	res := db.Where("disabled_at IS NOT NULL AND disabled_at < ?", time.Now().Add(-30*24*time.Hour)).
		Or("last_seen_at < ?", time.Now().Add(-180*24*time.Hour)).
		Delete(&DeviceToken{})
	return res.RowsAffected, res.Error
}
