package qrcode

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"

	"collegeerp/config"
)

// Canonical scan payload kinds, shared across phases so every caller encodes
// the same string shape.
const (
	KindLabReport = "labreport"
	KindPatientID = "patientid"
	KindStudentID = "studentid"
	KindHallTicket = "hallticket"
	KindInvoice   = "invoice"
	KindPO        = "po"
)

// Sign returns the first 10 hex chars of HMAC-SHA256(secret, tenant|kind|id).
// The secret is the JWT signing key, so a scanned code can be verified
// server-side later without a second secret to manage.
func Sign(tenantID, kind, id string) string {
	mac := hmac.New(sha256.New, []byte(config.App.JWTSecret))
	mac.Write([]byte(tenantID + "|" + kind + "|" + id))
	return hex.EncodeToString(mac.Sum(nil))[:10]
}

// VerifyURL builds the canonical scan payload: an absolute verify URL carrying
// tenant, kind, id and a short signature. e.g.
//
//	https://<app>/verify?t=<tenant>&k=labreport&id=<uuid>&s=<hmac10>
//
// When baseURL is blank it falls back to config.App.AppBaseURL.
func VerifyURL(baseURL, tenantID, kind, id string) string {
	if baseURL == "" {
		baseURL = config.App.AppBaseURL
	}
	baseURL = strings.TrimRight(baseURL, "/")
	q := url.Values{}
	q.Set("t", tenantID)
	q.Set("k", kind)
	q.Set("id", id)
	q.Set("s", Sign(tenantID, kind, id))
	return fmt.Sprintf("%s/verify?%s", baseURL, q.Encode())
}

// Verify reports whether a signature matches the tenant/kind/id triple. Used by
// scan-verification handlers (e.g. Phase 5 hall-ticket attendance).
func Verify(tenantID, kind, id, sig string) bool {
	return hmac.Equal([]byte(sig), []byte(Sign(tenantID, kind, id)))
}
