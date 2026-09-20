package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Subject types for an AccessRule. A rule targets either a built-in system role
// (admin/teacher/student/staff) or a tenant-defined CustomRole.
const (
	SubjectSystem = "system"
	SubjectCustom = "custom"
)

// AccessRule is a per-tenant override of one role's access to one module.
//
// Rules are sparse: a row exists only when an admin has changed the access for
// that (subject, module) pair away from the built-in default. When no row
// exists, the effective access falls back to DefaultSystemAccess (for system
// roles) or "no access" (for custom roles). See access_registry.go.
type AccessRule struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_access_rule_unique" json:"tenant_id"`
	// SubjectType is SubjectSystem or SubjectCustom.
	SubjectType string `gorm:"not null;uniqueIndex:idx_access_rule_unique" json:"subject_type"`
	// SubjectKey is the system role name (admin/teacher/student/staff) or the
	// CustomRole UUID, depending on SubjectType.
	SubjectKey string `gorm:"not null;uniqueIndex:idx_access_rule_unique" json:"subject_key"`
	// Module is one of the registry ids in AccessModules.
	Module    string    `gorm:"not null;uniqueIndex:idx_access_rule_unique" json:"module"`
	CanView   bool      `json:"can_view"`
	CanCreate bool      `json:"can_create"`
	CanEdit   bool      `json:"can_edit"`
	CanDelete bool      `json:"can_delete"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (a *AccessRule) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// Flags converts the stored booleans into an AccessFlags value.
func (a AccessRule) Flags() AccessFlags {
	return AccessFlags{View: a.CanView, Create: a.CanCreate, Edit: a.CanEdit, Delete: a.CanDelete}
}
