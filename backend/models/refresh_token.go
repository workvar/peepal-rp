package models

// refresh_token.go — long-lived session credentials.
//
// The access token (JWT) is deliberately short-lived: it is a bearer token that
// nothing can revoke once minted, so the only real defence against a leaked one
// is that it stops working quickly. Browser sessions stay long-lived anyway by
// holding a refresh token, which IS revocable because it is stored here.
//
// Three properties make that safe:
//
//   - Only a SHA-256 hash is stored. A dump of this table yields no usable
//     sessions.
//   - Every redemption rotates the token. A stolen token is therefore usable at
//     most once, and only until the legitimate client next refreshes.
//   - Rotation makes theft detectable. If a token is presented after it was
//     already spent, two parties hold it; since we cannot tell which is the
//     thief, the whole session family is revoked and both must sign in again.

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"sort"
	"time"

	"collegeerp/config"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Reasons recorded on a revoked session, for audit and support ("why was I
// logged out?").
const (
	RevokeReasonLogout         = "logout"
	RevokeReasonReuse          = "reuse_detected"
	RevokeReasonPasswordChange = "password_change"
	RevokeReasonAccountLocked  = "account_inactive"
	RevokeReasonSuperseded     = "superseded"
)

var (
	// ErrRefreshInvalid — no such token. Also covers a garbage or empty value.
	ErrRefreshInvalid = errors.New("refresh token not recognised")
	// ErrRefreshExpired — the session passed its absolute lifetime.
	ErrRefreshExpired = errors.New("refresh token expired")
	// ErrRefreshRevoked — the session was ended (logout, reuse, admin action).
	ErrRefreshRevoked = errors.New("refresh session revoked")
	// ErrRefreshReuse — a spent token came back. Treated as theft; the caller
	// must clear the client's cookies and force a fresh login.
	ErrRefreshReuse = errors.New("refresh token reuse detected")
)

// RefreshToken is one link in a session's rotation chain. Rows sharing a
// SessionID are one "family" — a single browser/device session — and are
// revoked together.
type RefreshToken struct {
	ID string `gorm:"primaryKey" json:"id"`
	// SessionID groups every rotation of one login. Also carried in the access
	// token's `sid` claim, so logout and workspace switches can find the family
	// without the refresh cookie being present on the request.
	SessionID string `gorm:"not null;index" json:"session_id"`
	UserID    string `gorm:"not null;index" json:"user_id"`
	TenantID  string `gorm:"not null;index" json:"tenant_id"`
	// TokenHash is sha256(plaintext), hex. The plaintext exists only in the
	// response that minted it and in the client's cookie.
	TokenHash string `gorm:"not null;uniqueIndex" json:"-"`
	// ActiveRole is the workspace this session is currently in, so a refresh
	// keeps the user where they were rather than dropping them back to their
	// primary role. Still re-verified against UserHoldsRole on every refresh.
	ActiveRole string `gorm:"not null;default:''" json:"active_role"`
	// ExpiresAt is the session's ABSOLUTE deadline. Rotation copies it forward
	// unchanged, so staying active cannot extend a session indefinitely.
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	// RotatedAt marks the token as spent. Non-nil means a successor exists.
	RotatedAt     *time.Time `json:"rotated_at,omitempty"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	RevokedReason string     `gorm:"default:''" json:"revoked_reason,omitempty"`
	// UserAgent and IP are recorded for the session list and for support when
	// investigating a reuse revocation. They are never used for authorisation:
	// pinning a session to an IP breaks mobile clients that roam.
	UserAgent string    `gorm:"default:''" json:"user_agent,omitempty"`
	IP        string    `gorm:"default:''" json:"ip,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (r *RefreshToken) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

// RefreshTokenInput describes the session a token is being minted for.
type RefreshTokenInput struct {
	UserID     string
	TenantID   string
	ActiveRole string
	UserAgent  string
	IP         string
	// SessionID continues an existing family. Empty starts a new session.
	SessionID string
	// ExpiresAt overrides the absolute deadline. Zero means "now + configured
	// refresh TTL"; rotations pass the original session's deadline through.
	ExpiresAt time.Time
}

// HashRefreshToken is the one-way mapping from the cookie value to what is
// stored. Plain SHA-256 is the right primitive here (unlike for passwords):
// the input is 256 bits of CSPRNG output, so there is nothing to brute-force,
// and a refresh is on the hot path for every expired access token.
func HashRefreshToken(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}

// newRefreshSecret returns 256 bits of entropy, URL-safe so it can live in a
// cookie unencoded.
func newRefreshSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func refreshTTL() time.Duration {
	if config.App.RefreshTokenTTL > 0 {
		return config.App.RefreshTokenTTL
	}
	return 30 * 24 * time.Hour
}

func reuseGrace() time.Duration {
	if config.App.RefreshReuseGrace > 0 {
		return config.App.RefreshReuseGrace
	}
	return 30 * time.Second
}

// IssueRefreshToken mints a token and returns the plaintext (for the cookie)
// alongside the stored row. The plaintext is never recoverable afterwards.
func IssueRefreshToken(db *gorm.DB, in RefreshTokenInput) (string, *RefreshToken, error) {
	plain, err := newRefreshSecret()
	if err != nil {
		return "", nil, err
	}
	sessionID := in.SessionID
	if sessionID == "" {
		sessionID = uuid.NewString()
	}
	expiresAt := in.ExpiresAt
	if expiresAt.IsZero() {
		expiresAt = time.Now().Add(refreshTTL())
	}
	rt := &RefreshToken{
		SessionID:  sessionID,
		UserID:     in.UserID,
		TenantID:   in.TenantID,
		TokenHash:  HashRefreshToken(plain),
		ActiveRole: in.ActiveRole,
		ExpiresAt:  expiresAt,
		UserAgent:  truncate(in.UserAgent, 255),
		IP:         in.IP,
	}
	if err := db.Create(rt).Error; err != nil {
		return "", nil, err
	}
	return plain, rt, nil
}

// RedeemRefreshToken spends a token and returns its replacement.
//
// Errors are meaningful to the caller: everything except ErrRefreshReuse is an
// ordinary "please log in again", while ErrRefreshReuse additionally means the
// session was just killed on both ends because the token may have been stolen.
func RedeemRefreshToken(db *gorm.DB, plain, userAgent, ip string) (string, *RefreshToken, error) {
	if plain == "" {
		return "", nil, ErrRefreshInvalid
	}

	var current RefreshToken
	if err := db.Where("token_hash = ?", HashRefreshToken(plain)).First(&current).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, ErrRefreshInvalid
		}
		return "", nil, err
	}

	if current.RevokedAt != nil {
		return "", nil, ErrRefreshRevoked
	}
	if time.Now().After(current.ExpiresAt) {
		return "", nil, ErrRefreshExpired
	}

	// Already spent. Inside the grace window this is a race between parallel
	// tabs or a retried request, not an attack — issue a replacement and leave
	// the session alone. Outside it, assume theft and burn the family.
	if current.RotatedAt != nil && time.Since(*current.RotatedAt) > reuseGrace() {
		if err := RevokeSession(db, current.SessionID, RevokeReasonReuse); err != nil {
			return "", nil, err
		}
		return "", nil, ErrRefreshReuse
	}

	var (
		nextPlain string
		next      *RefreshToken
	)
	err := db.Transaction(func(tx *gorm.DB) error {
		// Claim the rotation. The rotated_at IS NULL guard makes this safe
		// under concurrency: whoever loses the race gets RowsAffected == 0 and
		// simply proceeds, which is the grace-window behaviour anyway.
		if current.RotatedAt == nil {
			now := time.Now()
			if err := tx.Model(&RefreshToken{}).
				Where("id = ? AND rotated_at IS NULL", current.ID).
				Update("rotated_at", now).Error; err != nil {
				return err
			}
		}
		var err error
		nextPlain, next, err = IssueRefreshToken(tx, RefreshTokenInput{
			UserID:     current.UserID,
			TenantID:   current.TenantID,
			ActiveRole: current.ActiveRole,
			SessionID:  current.SessionID,
			ExpiresAt:  current.ExpiresAt, // absolute deadline is not extended
			UserAgent:  userAgent,
			IP:         ip,
		})
		return err
	})
	if err != nil {
		return "", nil, err
	}
	return nextPlain, next, nil
}

// RevokeSession ends one session family: every token in the rotation chain,
// spent or not, stops working.
func RevokeSession(db *gorm.DB, sessionID, reason string) error {
	if sessionID == "" {
		return nil
	}
	return db.Model(&RefreshToken{}).
		Where("session_id = ? AND revoked_at IS NULL", sessionID).
		Updates(map[string]any{"revoked_at": time.Now(), "revoked_reason": reason}).Error
}

// RevokeUserSessions signs a user out everywhere. Use it whenever their
// credentials or access change materially — password change, deactivation, a
// revoked workspace grant.
func RevokeUserSessions(db *gorm.DB, userID, reason string) error {
	if userID == "" {
		return nil
	}
	return db.Model(&RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Updates(map[string]any{"revoked_at": time.Now(), "revoked_reason": reason}).Error
}

// SetSessionActiveRole re-points a session at a different workspace, so the
// next refresh mints an access token for the role the user switched into
// rather than dropping them back to their primary one.
func SetSessionActiveRole(db *gorm.DB, sessionID, role string) error {
	if sessionID == "" {
		return nil
	}
	return db.Model(&RefreshToken{}).
		Where("session_id = ? AND revoked_at IS NULL", sessionID).
		Update("active_role", role).Error
}

// PruneRefreshTokens clears out rows that can no longer authorise anything:
// expired sessions, and spent or revoked links kept only briefly for the reuse
// grace window and for after-the-fact diagnosis.
func PruneRefreshTokens(db *gorm.DB) (int64, error) {
	cutoff := time.Now().Add(-24 * time.Hour)
	res := db.Where("expires_at < ?", time.Now()).
		Or("revoked_at IS NOT NULL AND revoked_at < ?", cutoff).
		Or("rotated_at IS NOT NULL AND rotated_at < ?", cutoff).
		Delete(&RefreshToken{})
	return res.RowsAffected, res.Error
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

// ─── Session listing ─────────────────────────────────────────────────────────
//
// The rows above are rotation links, not sessions: one login produces a new row
// on every refresh, so a naive listing would show the same browser a hundred
// times. What a user recognises as "a session" is a SessionID family, and what
// they want to see about it is when it started, when it was last used, and from
// what device. Everything below collapses the chain back down to that.

// UserSession is one login, summarised from its rotation chain.
type UserSession struct {
	SessionID string
	UserID    string
	TenantID  string
	// ActiveRole is the workspace the session is currently in.
	ActiveRole string
	// CreatedAt is when the session began, i.e. the first link in the chain.
	CreatedAt time.Time
	// LastUsedAt is the newest link's creation time — the last time this
	// session refreshed, which is the closest thing to "last seen" we have.
	LastUsedAt time.Time
	ExpiresAt  time.Time
	// UserAgent and IP come from the newest link, so a roaming device shows
	// where it is now rather than where it first signed in.
	UserAgent string
	IP        string
}

// ListUserSessions returns a user's live sessions, most recently used first.
//
// Live means: not revoked, not past its absolute deadline. Spent (rotated) rows
// are still read — they are how a session's start time is known — but a session
// whose every row is revoked or expired is not listed, because signing it out
// again would do nothing.
func ListUserSessions(db *gorm.DB, userID string) ([]UserSession, error) {
	if userID == "" {
		return nil, nil
	}
	var rows []RefreshToken
	if err := db.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, time.Now()).
		Order("created_at asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	// Fold the chain: first row of a family fixes the start, each later row
	// overwrites the "last seen" fields. Ordering by created_at above is what
	// makes that single pass correct.
	bySession := make(map[string]*UserSession, len(rows))
	order := make([]string, 0, len(rows))
	for _, rt := range rows {
		s, ok := bySession[rt.SessionID]
		if !ok {
			s = &UserSession{
				SessionID: rt.SessionID,
				UserID:    rt.UserID,
				TenantID:  rt.TenantID,
				CreatedAt: rt.CreatedAt,
			}
			bySession[rt.SessionID] = s
			order = append(order, rt.SessionID)
		}
		s.ActiveRole = rt.ActiveRole
		s.LastUsedAt = rt.CreatedAt
		s.ExpiresAt = rt.ExpiresAt
		s.UserAgent = rt.UserAgent
		s.IP = rt.IP
	}

	out := make([]UserSession, 0, len(order))
	for _, id := range order {
		out = append(out, *bySession[id])
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].LastUsedAt.After(out[j].LastUsedAt)
	})
	return out, nil
}

// SessionBelongsTo reports whether a session family is the given user's. Every
// revoke-by-id path checks this first: the session id is a client-supplied
// value, and without the check one user could sign another out.
func SessionBelongsTo(db *gorm.DB, sessionID, userID string) (bool, error) {
	if sessionID == "" || userID == "" {
		return false, nil
	}
	var n int64
	if err := db.Model(&RefreshToken{}).
		Where("session_id = ? AND user_id = ?", sessionID, userID).
		Count(&n).Error; err != nil {
		return false, err
	}
	return n > 0, nil
}

// RevokeUserSessionsExcept signs a user out everywhere but one session. Backs
// the "sign out all other devices" action, where the point is precisely that
// the device you are asking from stays signed in.
func RevokeUserSessionsExcept(db *gorm.DB, userID, keepSessionID, reason string) (int64, error) {
	if userID == "" {
		return 0, nil
	}
	q := db.Model(&RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", userID)
	if keepSessionID != "" {
		q = q.Where("session_id <> ?", keepSessionID)
	}
	res := q.Updates(map[string]any{"revoked_at": time.Now(), "revoked_reason": reason})
	return res.RowsAffected, res.Error
}

// RevokeUserSessionsOutsideRoles ends the user's sessions that are sitting in a
// workspace they no longer hold.
//
// Withdrawing a workspace grant is not the same as withdrawing access: the user
// keeps their other workspaces, and signing them out of those too would be a
// surprise. So only the sessions whose ActiveRole is no longer in allowedRoles
// are ended. An empty ActiveRole means the session is in the user's primary
// role, which is implicit and never revocable here, so those are left alone.
func RevokeUserSessionsOutsideRoles(db *gorm.DB, userID string, allowedRoles []string, reason string) (int64, error) {
	if userID == "" {
		return 0, nil
	}
	q := db.Model(&RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL AND active_role <> ''", userID)
	if len(allowedRoles) > 0 {
		q = q.Where("active_role NOT IN ?", allowedRoles)
	}
	res := q.Updates(map[string]any{"revoked_at": time.Now(), "revoked_reason": reason})
	return res.RowsAffected, res.Error
}
