// Package presence tracks which authenticated users currently have an open
// WebSocket to GET /api/v1/presence. The count is used only by the on-prem
// system-update popup (active users in this tenant).
package presence

import "sync"

// Hub is an in-memory map of tenantID → unique userIDs with at least one open
// presence connection. Multiple tabs from the same user share one refcount and
// still count as a single active user.
type Hub struct {
	mu      sync.Mutex
	tenants map[string]map[string]int // tenantID → userID → connection refcount
}

// NewHub returns an empty presence hub.
func NewHub() *Hub {
	return &Hub{tenants: make(map[string]map[string]int)}
}

// Connect records an open presence connection for userID in tenantID.
func (h *Hub) Connect(tenantID, userID string) {
	if h == nil || tenantID == "" || userID == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	users := h.tenants[tenantID]
	if users == nil {
		users = make(map[string]int)
		h.tenants[tenantID] = users
	}
	users[userID]++
}

// Disconnect drops one presence connection for userID in tenantID. When the
// refcount reaches zero the user is removed from the tenant set.
func (h *Hub) Disconnect(tenantID, userID string) {
	if h == nil || tenantID == "" || userID == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	users := h.tenants[tenantID]
	if users == nil {
		return
	}
	n := users[userID]
	if n <= 1 {
		delete(users, userID)
	} else {
		users[userID] = n - 1
	}
	if len(users) == 0 {
		delete(h.tenants, tenantID)
	}
}

// Count returns the number of unique users with an open presence connection
// in the given tenant.
func (h *Hub) Count(tenantID string) int {
	if h == nil || tenantID == "" {
		return 0
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.tenants[tenantID])
}
