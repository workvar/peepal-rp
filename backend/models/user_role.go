package models

// user_role.go — multi-role support ("workspaces").
//
// A user has ONE primary role on the User row (User.Role) plus zero or more
// additional roles stored here. Each role the user holds is a *workspace* they
// can switch into: the admin workspace, the teacher workspace, the student
// workspace, and so on. Switching a workspace re-mints the auth cookie with a
// different active role, so every existing permission check (requireRole,
// myAccess, accessFieldMiddleware) keeps working unchanged — it simply sees a
// different role for the same user.
//
// The primary role is deliberately NOT duplicated here. Treating User.Role as
// the always-present first workspace means existing users need no backfill and
// there is exactly one place that can never be deleted out from under a login.

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRole grants one additional workspace role to a user.
//
// CustomRoleID is an optional per-workspace permission overlay: the same person
// can carry a "Head of Department" custom role in their teacher workspace and
// nothing extra in their student workspace. It is resolved at request time from
// the *active* role, so overlays never bleed across workspaces.
type UserRole struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_user_role_unique" json:"tenant_id"`
	UserID   string `gorm:"not null;index;uniqueIndex:idx_user_role_unique" json:"user_id"`
	// Role is a base role id (teacher/student/staff/admin/patient) — never a
	// CustomRole id. Access control keys off this value.
	Role         Role      `gorm:"not null;uniqueIndex:idx_user_role_unique" json:"role"`
	CustomRoleID *string   `gorm:"index" json:"custom_role_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *UserRole) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

// AssignableWorkspaceRoles are the base roles an admin may grant as an extra
// workspace. super_admin is excluded on purpose: it is a platform-level role
// that no tenant admin may hand out.
var AssignableWorkspaceRoles = []Role{RoleAdmin, RoleTeacher, RoleStaff, RoleStudent, RolePatient}

// IsAssignableWorkspaceRole reports whether a role string may be granted as an
// additional workspace.
func IsAssignableWorkspaceRole(role string) bool {
	for _, r := range AssignableWorkspaceRoles {
		if string(r) == role {
			return true
		}
	}
	return false
}
