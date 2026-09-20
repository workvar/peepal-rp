// Package invites manages one-time, expiring password-setup links. The raw
// token is e-mailed to the user; only its hash is persisted. See models.Invite.
package invites

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// newToken returns a fresh random token and its storage hash.
func newToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(b)
	return raw, HashToken(raw), nil
}

// HashToken returns the hex SHA-256 of a raw token. Lookups hash the incoming
// token and match on the stored hash, so a database leak cannot be replayed.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
