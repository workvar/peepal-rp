package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// RandomPassword returns a high-entropy placeholder password used for accounts
// created via the invite flow (the user has not chosen one yet). It is never
// shown to anyone — the account stays unusable until the invite is accepted —
// so it only needs to be unguessable. Includes mixed case + a digit so it also
// satisfies ValidatePassword if ever routed through it.
//
// It fails closed: if the system CSPRNG is unavailable it panics rather than
// minting a guessable credential on an active account. Fiber's recover
// middleware turns that into a 500, so a single request fails instead of the
// account silently getting a known password.
func RandomPassword() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic("utils.RandomPassword: system CSPRNG unavailable: " + err.Error())
	}
	return "Aa1" + hex.EncodeToString(b)
}

// HashPassword hashes a plaintext password with bcrypt (default cost).
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword reports whether the plaintext password matches the bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// dummyHash is a valid bcrypt hash of a random string. CheckDummyPassword
// compares against it when a user lookup fails so that "unknown user" and
// "wrong password" take roughly the same time (limits user enumeration via
// response timing).
const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// CheckDummyPassword burns a bcrypt comparison without revealing anything.
func CheckDummyPassword(password string) {
	_ = bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password))
}

// ValidatePassword enforces the minimum password policy:
// at least 8 characters with an upper-case letter, a lower-case letter,
// and a digit. Returns a user-presentable error when the policy is not met.
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain an upper-case letter, a lower-case letter, and a digit")
	}
	return nil
}
