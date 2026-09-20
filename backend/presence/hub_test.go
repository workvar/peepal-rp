package presence

import "testing"

func TestHubConnectDisconnectCount(t *testing.T) {
	h := NewHub()
	if got := h.Count("t1"); got != 0 {
		t.Fatalf("empty hub Count = %d, want 0", got)
	}

	h.Connect("t1", "u1")
	h.Connect("t1", "u2")
	if got := h.Count("t1"); got != 2 {
		t.Fatalf("after two users Count = %d, want 2", got)
	}
	if got := h.Count("t2"); got != 0 {
		t.Fatalf("other tenant Count = %d, want 0", got)
	}

	// Second tab for same user must not inflate unique count.
	h.Connect("t1", "u1")
	if got := h.Count("t1"); got != 2 {
		t.Fatalf("after second tab Count = %d, want 2", got)
	}

	h.Disconnect("t1", "u1")
	if got := h.Count("t1"); got != 2 {
		t.Fatalf("after one tab close Count = %d, want 2", got)
	}

	h.Disconnect("t1", "u1")
	if got := h.Count("t1"); got != 1 {
		t.Fatalf("after last u1 disconnect Count = %d, want 1", got)
	}

	h.Disconnect("t1", "u2")
	if got := h.Count("t1"); got != 0 {
		t.Fatalf("after all disconnect Count = %d, want 0", got)
	}

	// Extra disconnect is a no-op.
	h.Disconnect("t1", "u2")
	if got := h.Count("t1"); got != 0 {
		t.Fatalf("extra disconnect Count = %d, want 0", got)
	}
}
