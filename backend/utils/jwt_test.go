package utils

import (
	"testing"
	"time"

	"collegeerp/config"
)

func init() {
	config.App.JWTSecret = "test-secret"
}

// The session id must survive a round-trip: logout and workspace switching
// find the refresh-token family through this claim.
func TestAccessTokenCarriesSessionID(t *testing.T) {
	config.App.AccessTokenTTL = 15 * time.Minute

	tok, err := GenerateAccessToken(AccessTokenInput{
		UserID:     "user-1",
		Email:      "a@b.com",
		BaseRole:   "admin",
		ActiveRole: "teacher",
		TenantID:   "tenant-1",
		SessionID:  "session-1",
	})
	if err != nil {
		t.Fatalf("GenerateAccessToken: %v", err)
	}
	claims, err := ParseToken(tok)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}
	if claims.SessionID != "session-1" {
		t.Fatalf("session id = %q, want session-1", claims.SessionID)
	}
	if claims.Role != "teacher" || claims.BaseRole != "admin" {
		t.Fatalf("roles lost: active=%q base=%q", claims.Role, claims.BaseRole)
	}
	if claims.IsSuperAdmin {
		t.Fatal("super admin derived from a non-super base role")
	}
}

// The whole point of the refresh flow: access tokens are short-lived. A token
// minted with the configured TTL must expire on that schedule, not 24h later.
func TestAccessTokenHonoursConfiguredTTL(t *testing.T) {
	config.App.AccessTokenTTL = 15 * time.Minute

	tok, err := GenerateToken("user-1", "a@b.com", "admin", "tenant-1")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	claims, err := ParseToken(tok)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}
	got := time.Until(claims.ExpiresAt.Time)
	if got > 16*time.Minute || got < 14*time.Minute {
		t.Fatalf("token lifetime = %v, want ~15m", got)
	}
}

// A misconfigured (zero/negative) TTL must not mint tokens that are already
// expired — fall back to the built-in default instead.
func TestAccessTokenFallsBackWhenTTLUnset(t *testing.T) {
	config.App.AccessTokenTTL = 0
	t.Cleanup(func() { config.App.AccessTokenTTL = 15 * time.Minute })

	tok, err := GenerateToken("user-1", "a@b.com", "admin", "tenant-1")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	claims, err := ParseToken(tok)
	if err != nil {
		t.Fatalf("ParseToken on default TTL: %v", err)
	}
	if !claims.ExpiresAt.After(time.Now()) {
		t.Fatal("token minted already expired")
	}
}

func TestParseTokenRejectsExpired(t *testing.T) {
	config.App.AccessTokenTTL = -time.Minute // forced past-dated for this test
	tok, err := GenerateAccessToken(AccessTokenInput{
		UserID:   "user-1",
		BaseRole: "admin",
		TenantID: "tenant-1",
		TTL:      -time.Minute,
	})
	config.App.AccessTokenTTL = 15 * time.Minute
	if err != nil {
		t.Fatalf("GenerateAccessToken: %v", err)
	}
	if _, err := ParseToken(tok); err == nil {
		t.Fatal("expired token accepted")
	}
}
