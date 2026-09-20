package models

// login_pin_test.go — the PIN's security properties, which are almost entirely
// about the throttle rather than the secret.
//
// A six-digit PIN has a million values, so what these tests pin down is that
// guessing is bounded: attempts are counted, the lockout arrives, it refuses
// even the correct PIN while it lasts, and a success clears the count so a user
// who mistypes once is not one slip away from being locked out tomorrow.

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func pinDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&LoginPIN{}, &PendingLogin{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return db
}

func TestValidatePIN(t *testing.T) {
	cases := []struct {
		pin  string
		want error
	}{
		{"482915", nil},
		{"900137", nil},
		{"12345", ErrPINFormat},   // too short
		{"1234567", ErrPINFormat}, // too long
		{"12a456", ErrPINFormat},  // not digits
		{"", ErrPINFormat},
		{"111111", ErrPINWeak},
		{"000000", ErrPINWeak},
		{"123456", ErrPINWeak},
		{"654321", ErrPINWeak},
		// A near-sequence is fine: rejecting too much pushes people to write
		// the PIN down, which is worse than a slightly guessable one.
		{"123457", nil},
	}
	for _, tc := range cases {
		if got := ValidatePIN(tc.pin); got != tc.want {
			t.Errorf("ValidatePIN(%q) = %v, want %v", tc.pin, got, tc.want)
		}
	}
}

func TestSetLoginPINRejectsWeakValues(t *testing.T) {
	db := pinDB(t)
	if err := SetLoginPIN(db, "u1", "t1", "111111"); err != ErrPINWeak {
		t.Fatalf("expected weak PIN to be refused, got %v", err)
	}
	if HasLoginPIN(db, "u1") {
		t.Fatal("a refused PIN must not be stored")
	}
}

func TestVerifyLoginPINSuccessAndFailure(t *testing.T) {
	db := pinDB(t)
	if err := SetLoginPIN(db, "u1", "t1", "482915"); err != nil {
		t.Fatalf("set PIN: %v", err)
	}

	if err := VerifyLoginPIN(db, "u1", "482915"); err != nil {
		t.Fatalf("correct PIN rejected: %v", err)
	}
	if err := VerifyLoginPIN(db, "u1", "000001"); err != ErrPINIncorrect {
		t.Fatalf("wrong PIN: got %v, want ErrPINIncorrect", err)
	}
	if err := VerifyLoginPIN(db, "u2", "482915"); err != ErrPINNotSet {
		t.Fatalf("unknown user: got %v, want ErrPINNotSet", err)
	}
}

func TestVerifyLoginPINLocksAfterRepeatedMisses(t *testing.T) {
	db := pinDB(t)
	if err := SetLoginPIN(db, "u1", "t1", "482915"); err != nil {
		t.Fatalf("set PIN: %v", err)
	}

	// The first misses cost an attempt each; the last one trips the lock.
	for i := 1; i < pinMaxAttempts; i++ {
		if err := VerifyLoginPIN(db, "u1", "000000"); err != ErrPINIncorrect {
			t.Fatalf("attempt %d: got %v, want ErrPINIncorrect", i, err)
		}
		if left := PINAttemptsRemaining(db, "u1"); left != pinMaxAttempts-i {
			t.Fatalf("attempt %d: %d attempts remaining, want %d", i, left, pinMaxAttempts-i)
		}
	}
	if err := VerifyLoginPIN(db, "u1", "000000"); err != ErrPINLocked {
		t.Fatalf("final attempt: got %v, want ErrPINLocked", err)
	}

	// The lock is the whole control: the correct PIN must not get through it,
	// otherwise an attacker who found it on the last guess still wins.
	if err := VerifyLoginPIN(db, "u1", "482915"); err != ErrPINLocked {
		t.Fatalf("correct PIN during lockout: got %v, want ErrPINLocked", err)
	}
}

func TestLockoutExpiresAndSuccessClearsCount(t *testing.T) {
	db := pinDB(t)
	if err := SetLoginPIN(db, "u1", "t1", "482915"); err != nil {
		t.Fatalf("set PIN: %v", err)
	}
	for i := 0; i < pinMaxAttempts; i++ {
		VerifyLoginPIN(db, "u1", "000000")
	}

	// Wind the clock past the cooling-off period.
	past := time.Now().Add(-time.Minute)
	if err := db.Model(&LoginPIN{}).Where("user_id = ?", "u1").
		Update("locked_until", past).Error; err != nil {
		t.Fatalf("expire lock: %v", err)
	}

	if err := VerifyLoginPIN(db, "u1", "482915"); err != nil {
		t.Fatalf("after lockout expiry: %v", err)
	}
	if left := PINAttemptsRemaining(db, "u1"); left != pinMaxAttempts {
		t.Fatalf("a success must restore the full budget, got %d", left)
	}
}

func TestSetLoginPINClearsLockout(t *testing.T) {
	db := pinDB(t)
	SetLoginPIN(db, "u1", "t1", "482915")
	for i := 0; i < pinMaxAttempts; i++ {
		VerifyLoginPIN(db, "u1", "000000")
	}
	// Changing the PIN is done from an authenticated session, so it is a
	// legitimate way out of a lockout the user caused themselves.
	if err := SetLoginPIN(db, "u1", "t1", "739204"); err != nil {
		t.Fatalf("re-set PIN: %v", err)
	}
	if err := VerifyLoginPIN(db, "u1", "739204"); err != nil {
		t.Fatalf("new PIN rejected after re-set: %v", err)
	}
}

func TestClearLoginPIN(t *testing.T) {
	db := pinDB(t)
	SetLoginPIN(db, "u1", "t1", "482915")
	if err := ClearLoginPIN(db, "u1"); err != nil {
		t.Fatalf("clear: %v", err)
	}
	if HasLoginPIN(db, "u1") {
		t.Fatal("PIN still reported as set after clearing")
	}
	if err := VerifyLoginPIN(db, "u1", "482915"); err != ErrPINNotSet {
		t.Fatalf("got %v, want ErrPINNotSet", err)
	}
}

func TestPendingLoginRoundTrip(t *testing.T) {
	db := pinDB(t)
	token, err := IssuePendingLogin(db, "u1", "t1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if token == "" {
		t.Fatal("empty pending-login token")
	}
	// Only the hash is stored, so the plaintext must not appear in the row.
	var row PendingLogin
	if err := db.First(&row, "user_id = ?", "u1").Error; err != nil {
		t.Fatalf("load row: %v", err)
	}
	if row.TokenHash == token {
		t.Fatal("pending-login token stored in the clear")
	}

	got, err := ResolvePendingLogin(db, token)
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if got.UserID != "u1" {
		t.Fatalf("resolved to user %q, want u1", got.UserID)
	}

	// Resolving does not spend it — a mistyped PIN must not cost the user the
	// whole passkey ceremony.
	if _, err := ResolvePendingLogin(db, token); err != nil {
		t.Fatalf("second resolve: %v", err)
	}

	SpendPendingLogin(db, got.ID)
	if _, err := ResolvePendingLogin(db, token); err != ErrPendingLoginInvalid {
		t.Fatalf("after spending: got %v, want ErrPendingLoginInvalid", err)
	}
}

func TestPendingLoginExpires(t *testing.T) {
	db := pinDB(t)
	token, err := IssuePendingLogin(db, "u1", "t1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if err := db.Model(&PendingLogin{}).Where("user_id = ?", "u1").
		Update("expires_at", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatalf("expire: %v", err)
	}
	if _, err := ResolvePendingLogin(db, token); err != ErrPendingLoginInvalid {
		t.Fatalf("expired token: got %v, want ErrPendingLoginInvalid", err)
	}
}

func TestResolvePendingLoginRejectsGarbage(t *testing.T) {
	db := pinDB(t)
	for _, token := range []string{"", "not-a-token"} {
		if _, err := ResolvePendingLogin(db, token); err != ErrPendingLoginInvalid {
			t.Fatalf("token %q: got %v, want ErrPendingLoginInvalid", token, err)
		}
	}
}
