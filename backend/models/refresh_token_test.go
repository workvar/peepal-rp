package models

import (
	"testing"
	"time"

	"collegeerp/config"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func refreshTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared&_pragma=foreign_keys(0)"), &gorm.Config{
		Logger: gormlogger.Discard,
	})
	if err != nil {
		t.Fatalf("open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&RefreshToken{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() {
		db.Exec("DELETE FROM refresh_tokens")
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return db
}

// issue is the common "a user logged in" setup: a fresh session with one
// unrotated token.
func issue(t *testing.T, db *gorm.DB) (string, *RefreshToken) {
	t.Helper()
	plain, rt, err := IssueRefreshToken(db, RefreshTokenInput{
		UserID:     "user-1",
		TenantID:   "tenant-1",
		ActiveRole: "admin",
		UserAgent:  "test-agent",
		IP:         "10.0.0.1",
	})
	if err != nil {
		t.Fatalf("IssueRefreshToken: %v", err)
	}
	return plain, rt
}

// The plaintext token must never be recoverable from the database: a dump of
// refresh_tokens must not hand an attacker working sessions.
func TestIssueRefreshTokenStoresOnlyAHash(t *testing.T) {
	db := refreshTestDB(t)
	plain, rt := issue(t, db)

	if plain == "" {
		t.Fatal("expected a plaintext token")
	}
	if rt.TokenHash == plain {
		t.Fatal("token stored in plaintext")
	}
	if rt.TokenHash != HashRefreshToken(plain) {
		t.Fatalf("stored hash does not match hash of plaintext")
	}
	var found int64
	db.Model(&RefreshToken{}).Where("token_hash = ?", plain).Count(&found)
	if found != 0 {
		t.Fatal("plaintext token is queryable in the tokens table")
	}
	if rt.SessionID == "" {
		t.Fatal("expected a session id")
	}
	if rt.ExpiresAt.Before(time.Now()) {
		t.Fatal("token issued already expired")
	}
}

// The happy path: redeeming rotates the token — the old one is spent, a new
// one takes its place inside the same session.
func TestRedeemRotatesWithinTheSameSession(t *testing.T) {
	db := refreshTestDB(t)
	plain, original := issue(t, db)

	nextPlain, next, err := RedeemRefreshToken(db, plain, "test-agent", "10.0.0.1")
	if err != nil {
		t.Fatalf("RedeemRefreshToken: %v", err)
	}
	if nextPlain == plain {
		t.Fatal("rotation returned the same token")
	}
	if next.SessionID != original.SessionID {
		t.Fatalf("session changed on rotation: %s → %s", original.SessionID, next.SessionID)
	}
	if next.ActiveRole != original.ActiveRole {
		t.Fatalf("active role lost on rotation: %q", next.ActiveRole)
	}
	if next.UserID != original.UserID || next.TenantID != original.TenantID {
		t.Fatal("identity lost on rotation")
	}

	var spent RefreshToken
	if err := db.First(&spent, "id = ?", original.ID).Error; err != nil {
		t.Fatalf("load original: %v", err)
	}
	if spent.RotatedAt == nil {
		t.Fatal("original token was not marked rotated")
	}

	// The replacement works.
	if _, _, err := RedeemRefreshToken(db, nextPlain, "test-agent", "10.0.0.1"); err != nil {
		t.Fatalf("replacement token rejected: %v", err)
	}
}

// Rotation must not extend the session's absolute lifetime — otherwise an
// active session never ends and the long-lived credential lives forever.
func TestRotationKeepsTheAbsoluteExpiry(t *testing.T) {
	db := refreshTestDB(t)
	plain, original := issue(t, db)

	_, next, err := RedeemRefreshToken(db, plain, "", "")
	if err != nil {
		t.Fatalf("RedeemRefreshToken: %v", err)
	}
	if !next.ExpiresAt.Equal(original.ExpiresAt) {
		t.Fatalf("absolute expiry moved: %v → %v", original.ExpiresAt, next.ExpiresAt)
	}
}

func TestRedeemUnknownToken(t *testing.T) {
	db := refreshTestDB(t)
	if _, _, err := RedeemRefreshToken(db, "not-a-real-token", "", ""); err != ErrRefreshInvalid {
		t.Fatalf("got %v, want ErrRefreshInvalid", err)
	}
}

func TestRedeemEmptyToken(t *testing.T) {
	db := refreshTestDB(t)
	if _, _, err := RedeemRefreshToken(db, "", "", ""); err != ErrRefreshInvalid {
		t.Fatalf("got %v, want ErrRefreshInvalid", err)
	}
}

func TestRedeemExpiredToken(t *testing.T) {
	db := refreshTestDB(t)
	plain, rt := issue(t, db)
	db.Model(&RefreshToken{}).Where("id = ?", rt.ID).
		Update("expires_at", time.Now().Add(-time.Minute))

	if _, _, err := RedeemRefreshToken(db, plain, "", ""); err != ErrRefreshExpired {
		t.Fatalf("got %v, want ErrRefreshExpired", err)
	}
}

func TestRedeemRevokedToken(t *testing.T) {
	db := refreshTestDB(t)
	plain, rt := issue(t, db)
	if err := RevokeSession(db, rt.SessionID, RevokeReasonLogout); err != nil {
		t.Fatalf("RevokeSession: %v", err)
	}

	if _, _, err := RedeemRefreshToken(db, plain, "", ""); err != ErrRefreshRevoked {
		t.Fatalf("got %v, want ErrRefreshRevoked", err)
	}
}

// The theft case. A token replayed long after it was rotated means two parties
// hold it, and we cannot tell which is the legitimate one — so the whole
// session family dies and both are forced to log in again.
func TestReuseAfterGraceRevokesTheWholeSession(t *testing.T) {
	db := refreshTestDB(t)
	config.App.RefreshReuseGrace = 30 * time.Second
	plain, original := issue(t, db)

	nextPlain, _, err := RedeemRefreshToken(db, plain, "", "")
	if err != nil {
		t.Fatalf("first redeem: %v", err)
	}
	// Age the rotation past the grace window.
	db.Model(&RefreshToken{}).Where("id = ?", original.ID).
		Update("rotated_at", time.Now().Add(-time.Hour))

	if _, _, err := RedeemRefreshToken(db, plain, "", ""); err != ErrRefreshReuse {
		t.Fatalf("got %v, want ErrRefreshReuse", err)
	}

	// The replacement the legitimate client is holding must be dead too.
	if _, _, err := RedeemRefreshToken(db, nextPlain, "", ""); err != ErrRefreshRevoked {
		t.Fatalf("replacement still usable after reuse: got %v, want ErrRefreshRevoked", err)
	}

	var live int64
	db.Model(&RefreshToken{}).Where("session_id = ? AND revoked_at IS NULL", original.SessionID).Count(&live)
	if live != 0 {
		t.Fatalf("%d token(s) in the family survived reuse detection", live)
	}
}

// Two tabs refreshing at the same instant both send the same token. That is a
// race, not theft — it must not log the user out.
func TestReuseWithinGraceIsForgiven(t *testing.T) {
	db := refreshTestDB(t)
	config.App.RefreshReuseGrace = 30 * time.Second
	plain, original := issue(t, db)

	if _, _, err := RedeemRefreshToken(db, plain, "", ""); err != nil {
		t.Fatalf("first redeem: %v", err)
	}
	// Same token again, immediately: inside the grace window.
	_, next, err := RedeemRefreshToken(db, plain, "", "")
	if err != nil {
		t.Fatalf("redeem within grace: %v", err)
	}
	if next.SessionID != original.SessionID {
		t.Fatal("grace redeem started a new session")
	}

	var revoked int64
	db.Model(&RefreshToken{}).Where("session_id = ? AND revoked_at IS NOT NULL", original.SessionID).Count(&revoked)
	if revoked != 0 {
		t.Fatal("grace-window replay revoked the session")
	}
}

// A workspace switch re-points the session at a different active role, so a
// later refresh keeps the user in the workspace they switched into.
func TestSetSessionActiveRole(t *testing.T) {
	db := refreshTestDB(t)
	plain, rt := issue(t, db)

	if err := SetSessionActiveRole(db, rt.SessionID, "teacher"); err != nil {
		t.Fatalf("SetSessionActiveRole: %v", err)
	}
	_, next, err := RedeemRefreshToken(db, plain, "", "")
	if err != nil {
		t.Fatalf("RedeemRefreshToken: %v", err)
	}
	if next.ActiveRole != "teacher" {
		t.Fatalf("active role = %q, want teacher", next.ActiveRole)
	}
}

// Revoking every session for a user is what a password change / deactivation
// needs: all their devices are signed out.
func TestRevokeUserSessions(t *testing.T) {
	db := refreshTestDB(t)
	phone, _ := issue(t, db)
	laptop, _ := issue(t, db)
	if _, _, err := IssueRefreshToken(db, RefreshTokenInput{UserID: "user-2", TenantID: "tenant-1", ActiveRole: "staff"}); err != nil {
		t.Fatalf("issue for other user: %v", err)
	}

	if err := RevokeUserSessions(db, "user-1", RevokeReasonPasswordChange); err != nil {
		t.Fatalf("RevokeUserSessions: %v", err)
	}
	for name, tok := range map[string]string{"phone": phone, "laptop": laptop} {
		if _, _, err := RedeemRefreshToken(db, tok, "", ""); err != ErrRefreshRevoked {
			t.Fatalf("%s session: got %v, want ErrRefreshRevoked", name, err)
		}
	}
	var otherLive int64
	db.Model(&RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", "user-2").Count(&otherLive)
	if otherLive != 1 {
		t.Fatalf("another user's session was revoked (live=%d)", otherLive)
	}
}

// Housekeeping: spent and expired rows must not accumulate forever.
func TestPruneRefreshTokens(t *testing.T) {
	db := refreshTestDB(t)
	live, _ := issue(t, db)
	_, stale := issue(t, db)
	db.Model(&RefreshToken{}).Where("id = ?", stale.ID).
		Update("expires_at", time.Now().Add(-48*time.Hour))

	removed, err := PruneRefreshTokens(db)
	if err != nil {
		t.Fatalf("PruneRefreshTokens: %v", err)
	}
	if removed != 1 {
		t.Fatalf("pruned %d rows, want 1", removed)
	}
	if _, _, err := RedeemRefreshToken(db, live, "", ""); err != nil {
		t.Fatalf("prune removed a live session: %v", err)
	}
}
