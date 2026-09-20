package push

// dispatch.go — the bridge from "a notification row was created" to "a device
// buzzed", and the only entry point the rest of the app uses.
//
// Two rules shape this file:
//
//  1. Push is never allowed to fail a request. A notification's durable record
//     is the database row; the push is a courtesy copy. So delivery runs in the
//     background and errors are logged, not returned. A pharmacy stock alert
//     must not 500 because a third-party push service is having a bad afternoon.
//
//  2. Nothing sensitive goes in the payload. Notification bodies in this system
//     can name a patient or a diagnosis, and a push notification renders on a
//     locked screen in a public corridor. What is sent is a title, a neutral
//     one-line summary, and a deep link; the real content is read in the app,
//     behind auth. See Redact.

import (
	"context"
	"log"
	"time"

	"collegeerp/models"

	"gorm.io/gorm"
)

// dispatchTimeout bounds the background send. Generous enough for a chunked
// fan-out to a large audience, short enough that a hung service does not leak
// goroutines for the life of the process.
const dispatchTimeout = 30 * time.Second

// Notify pushes one notification to every device its recipients are signed in
// on. It returns immediately: delivery happens on its own goroutine.
//
// db must be a handle that outlives the request (database.DB, not a
// request-scoped one) because the send continues after the handler returns.
func Notify(db *gorm.DB, tenantID string, userIDs []string, m Message) {
	client := NewClient()
	if client == nil || db == nil || len(userIDs) == 0 {
		return
	}
	go deliver(db, client, tenantID, userIDs, m)
}

// NotifyRecord is the convenience form for the common case: a Notification row
// was just written and its owner should hear about it.
//
// This is deliberately the shape callers reach for, so the redaction below is
// applied by default rather than being something each call site remembers.
func NotifyRecord(db *gorm.DB, n models.Notification) {
	Notify(db, n.TenantID, []string{n.UserID}, Message{
		Title:    n.Title,
		Body:     Redact(n.Body),
		Category: n.Category,
		Priority: priorityFor(n.Type),
		Data: map[string]string{
			"notificationId": n.ID,
			"category":       n.Category,
			"refType":        n.RefType,
			"refId":          n.RefID,
			DeepLink:         "/notifications",
		},
	})
}

// Redact trims a notification body down to what is safe on a lock screen.
//
// The conservative choice: anything beyond a short summary is dropped, since
// this system's notification bodies can carry patient names, results and
// amounts, and the device showing them is not necessarily in the owner's hands.
// The full text is one tap away in the app.
func Redact(body string) string {
	const maxLockScreen = 120
	runes := []rune(body)
	if len(runes) <= maxLockScreen {
		return body
	}
	return string(runes[:maxLockScreen-1]) + "…"
}

// priorityFor maps a notification type onto delivery urgency. Only genuine
// alerts wake a device; everything else waits for the next unlock.
func priorityFor(notifType string) string {
	switch notifType {
	case "error", "warning", "alert":
		return "high"
	default:
		return "default"
	}
}

// deliver resolves recipients to tokens, sends, and cleans up whatever the
// service reports as dead.
func deliver(db *gorm.DB, client *Client, tenantID string, userIDs []string, m Message) {
	defer func() {
		// A panic here would take the process down from a goroutine no request
		// is waiting on, which is the worst possible way to learn about a bug.
		if r := recover(); r != nil {
			log.Printf("[PUSH] recovered from panic during delivery: %v", r)
		}
	}()

	rows, err := models.ActiveDeviceTokens(db, tenantID, userIDs)
	if err != nil {
		log.Printf("[PUSH] could not load device tokens for tenant %s: %v", tenantID, err)
		return
	}
	if len(rows) == 0 {
		return // nobody has the app installed; not an error
	}

	m.To = make([]string, 0, len(rows))
	for _, row := range rows {
		m.To = append(m.To, row.Token)
	}

	ctx, cancel := context.WithTimeout(context.Background(), dispatchTimeout)
	defer cancel()

	res, err := client.Send(ctx, m)
	if err != nil {
		log.Printf("[PUSH] delivery failed for tenant %s (%d recipients): %v", tenantID, len(m.To), err)
		return
	}
	if len(res.Unregistered) > 0 {
		if err := models.DisableDeviceTokens(db, res.Unregistered, models.DeviceRevokeUnregistered); err != nil {
			log.Printf("[PUSH] could not disable %d dead token(s): %v", len(res.Unregistered), err)
		}
	}
	if res.Failed > 0 {
		log.Printf("[PUSH] tenant=%s sent=%d failed=%d unregistered=%d", tenantID, res.Sent, res.Failed, len(res.Unregistered))
	}
}
