package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Compliance / audit access trail — Phase 5. A tenant-scoped, append-only log
// of who did what: every mutating GraphQL operation plus login events. Not
// industry-scoped; every tenant benefits from an audit trail.

// Audit actions.
const (
	AuditCreate = "create"
	AuditUpdate = "update"
	AuditDelete = "delete"
	AuditLogin  = "login"
	// AuditQuery records Ask PeepalAI requests (both allowed and denied).
	AuditQuery = "query"
)

// AuditLog is one recorded action.
type AuditLog struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	ActorID   string `gorm:"index" json:"actor_id"` // user id
	ActorName string `json:"actor_name"`
	ActorRole string `json:"actor_role"`

	// Action: create | update | delete | login.
	Action string `gorm:"index" json:"action"`
	// Module is the access-module id the operation belongs to (or "auth").
	Module string `gorm:"index" json:"module"`
	// Operation is the GraphQL field name (or "login").
	Operation string `json:"operation"`
	EntityID  string `json:"entity_id"`
	Detail    string `gorm:"type:text" json:"detail"`
	IP        string `json:"ip"`

	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}
