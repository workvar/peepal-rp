package models

import (
	"testing"
	"time"

	"gorm.io/gorm"
)

// issueFor is issue() with the session's identity spelled out, so a test can
// build several users and several sessions per user.
func issueFor(t *testing.T, db *gorm.DB, userID, sessionID, role string) *RefreshToken {
	t.Helper()
	_, rt, err := IssueRefreshToken(db, RefreshTokenInput{
		UserID:     userID,
		TenantID:   "tenant-1",
		ActiveRole: role,
		SessionID:  sessionID,
		UserAgent:  "test-agent",
		IP:         "10.0.0.1",
	})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	return rt
}

func TestListUserSessions_CollapsesRotationChain(t *testing.T) {
	db := refreshTestDB(t)

	first := issueFor(t, db, "user-1", "", "admin")
	// A refresh adds a link to the same family. The user still has one session.
	second := issueFor(t, db, "user-1", first.SessionID, "admin")

	sessions, err := ListUserSessions(db, "user-1")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("want 1 session for a rotated chain, got %d", len(sessions))
	}
	if sessions[0].SessionID != first.SessionID {
		t.Errorf("session id: got %s, want %s", sessions[0].SessionID, first.SessionID)
	}
	// Start time comes from the first link, last-used from the newest.
	if sessions[0].CreatedAt.After(second.CreatedAt) {
		t.Error("CreatedAt should come from the first link in the chain")
	}
	if sessions[0].LastUsedAt.Before(sessions[0].CreatedAt) {
		t.Error("LastUsedAt should be at or after CreatedAt")
	}
}

func TestListUserSessions_ExcludesRevokedAndExpired(t *testing.T) {
	db := refreshTestDB(t)

	live := issueFor(t, db, "user-1", "", "admin")
	revoked := issueFor(t, db, "user-1", "", "admin")
	if err := RevokeSession(db, revoked.SessionID, RevokeReasonLogout); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	expired := issueFor(t, db, "user-1", "", "admin")
	db.Model(&RefreshToken{}).Where("session_id = ?", expired.SessionID).
		Update("expires_at", time.Now().Add(-time.Hour))

	sessions, err := ListUserSessions(db, "user-1")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(sessions) != 1 || sessions[0].SessionID != live.SessionID {
		t.Fatalf("want only the live session, got %d: %+v", len(sessions), sessions)
	}
}

func TestListUserSessions_ScopedToUser(t *testing.T) {
	db := refreshTestDB(t)

	issueFor(t, db, "user-1", "", "admin")
	issueFor(t, db, "user-2", "", "admin")

	sessions, err := ListUserSessions(db, "user-1")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("want 1 session, got %d", len(sessions))
	}
	if sessions[0].UserID != "user-1" {
		t.Errorf("leaked another user's session: %+v", sessions[0])
	}
}

func TestSessionBelongsTo(t *testing.T) {
	db := refreshTestDB(t)
	rt := issueFor(t, db, "user-1", "", "admin")

	if ok, _ := SessionBelongsTo(db, rt.SessionID, "user-1"); !ok {
		t.Error("owner should be recognised")
	}
	if ok, _ := SessionBelongsTo(db, rt.SessionID, "user-2"); ok {
		t.Error("a session must not belong to another user")
	}
	if ok, _ := SessionBelongsTo(db, "no-such-session", "user-1"); ok {
		t.Error("unknown session must not be claimed")
	}
}

func TestRevokeUserSessionsExcept_KeepsCurrent(t *testing.T) {
	db := refreshTestDB(t)

	keep := issueFor(t, db, "user-1", "", "admin")
	issueFor(t, db, "user-1", "", "admin")
	issueFor(t, db, "user-1", "", "admin")
	other := issueFor(t, db, "user-2", "", "admin")

	n, err := RevokeUserSessionsExcept(db, "user-1", keep.SessionID, RevokeReasonLogout)
	if err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if n != 2 {
		t.Errorf("rows revoked: got %d, want 2", n)
	}

	sessions, _ := ListUserSessions(db, "user-1")
	if len(sessions) != 1 || sessions[0].SessionID != keep.SessionID {
		t.Fatalf("the calling session should survive, got %+v", sessions)
	}
	if left, _ := ListUserSessions(db, "user-2"); len(left) != 1 || left[0].SessionID != other.SessionID {
		t.Error("another user's sessions must not be touched")
	}
}

func TestRevokeUserSessionsOutsideRoles(t *testing.T) {
	db := refreshTestDB(t)

	primary := issueFor(t, db, "user-1", "", "")        // implicit primary role
	kept := issueFor(t, db, "user-1", "", "teacher")    // still granted
	withdrawn := issueFor(t, db, "user-1", "", "staff") // grant removed

	n, err := RevokeUserSessionsOutsideRoles(db, "user-1", []string{"admin", "teacher"}, RevokeReasonAccountLocked)
	if err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if n != 1 {
		t.Errorf("rows revoked: got %d, want 1", n)
	}

	live := map[string]bool{}
	sessions, _ := ListUserSessions(db, "user-1")
	for _, s := range sessions {
		live[s.SessionID] = true
	}
	if !live[primary.SessionID] {
		t.Error("a session in the implicit primary role must survive")
	}
	if !live[kept.SessionID] {
		t.Error("a session in a still-granted workspace must survive")
	}
	if live[withdrawn.SessionID] {
		t.Error("a session in a withdrawn workspace must be revoked")
	}
}
