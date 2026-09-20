package models

// workspace.go — resolving which workspaces a user can switch into.
//
// A workspace is simply "this user, acting as one of their roles". The set is
// the primary role on the User row plus every UserRole grant, de-duplicated and
// returned in a stable display order.

import (
	"gorm.io/gorm"
)

// Workspace is one switchable role context for a user.
type Workspace struct {
	// Role is the base role id this workspace activates.
	Role Role `json:"role"`
	// Label is the tenant's presentation of that role, sourced from SystemRole
	// so a hospital shows "Clinician" where a college shows "Teacher".
	Label string `json:"label"`
	// IsPrimary marks the workspace backed by User.Role (never revocable).
	IsPrimary bool `json:"is_primary"`
	// CustomRoleID is the permission overlay applied while in this workspace.
	CustomRoleID *string `json:"custom_role_id,omitempty"`
}

// workspaceOrder is the fixed display order of workspaces in the switcher.
var workspaceOrder = []Role{RoleSuperAdmin, RoleAdmin, RoleTeacher, RoleStaff, RoleStudent, RolePatient}

func workspaceRank(r Role) int {
	for i, o := range workspaceOrder {
		if o == r {
			return i
		}
	}
	return len(workspaceOrder)
}

// UserWorkspaces returns every workspace the given user may switch into,
// ordered for display. The user's primary role is always included and always
// marked IsPrimary.
func UserWorkspaces(db *gorm.DB, user *User) []Workspace {
	labels := systemRoleLabels(db, user.TenantID)

	// Primary role first, then each extra grant.
	seen := map[Role]bool{user.Role: true}
	out := []Workspace{{
		Role:         user.Role,
		Label:        labels[string(user.Role)],
		IsPrimary:    true,
		CustomRoleID: user.CustomRoleID,
	}}

	var extras []UserRole
	db.Where("user_id = ? AND tenant_id = ?", user.ID, user.TenantID).Find(&extras)
	for _, e := range extras {
		if seen[e.Role] {
			continue
		}
		seen[e.Role] = true
		out = append(out, Workspace{
			Role:         e.Role,
			Label:        labels[string(e.Role)],
			CustomRoleID: e.CustomRoleID,
		})
	}

	sortWorkspaces(out)
	return out
}

// UserHoldsRole reports whether a user may act as the given role, i.e. whether
// switching into that workspace is allowed. Used to authorise a switch request
// before a new token is minted.
func UserHoldsRole(db *gorm.DB, user *User, role string) bool {
	if string(user.Role) == role {
		return true
	}
	var count int64
	db.Model(&UserRole{}).
		Where("user_id = ? AND tenant_id = ? AND role = ?", user.ID, user.TenantID, role).
		Count(&count)
	return count > 0
}

// ActiveCustomRoleID returns the CustomRole overlay that applies while the user
// is acting as activeRole. Falls back to the User row's overlay when the active
// role is the primary one (or when no per-workspace overlay is set).
func ActiveCustomRoleID(db *gorm.DB, user *User, activeRole string) *string {
	if activeRole == "" || string(user.Role) == activeRole {
		return user.CustomRoleID
	}
	var ur UserRole
	if err := db.Where("user_id = ? AND tenant_id = ? AND role = ?", user.ID, user.TenantID, activeRole).
		First(&ur).Error; err != nil {
		return nil
	}
	return ur.CustomRoleID
}

// systemRoleLabels loads the tenant's role presentation, keyed by role id, with
// sensible fallbacks when a tenant has no SystemRole rows seeded yet.
func systemRoleLabels(db *gorm.DB, tenantID string) map[string]string {
	labels := map[string]string{
		string(RoleSuperAdmin): "Super Admin",
		string(RoleAdmin):      "Admin",
		string(RoleTeacher):    "Teacher",
		string(RoleStaff):      "Staff",
		string(RoleStudent):    "Student",
		string(RolePatient):    "Patient",
	}
	var rows []SystemRole
	db.Where("tenant_id = ?", tenantID).Find(&rows)
	for _, r := range rows {
		if r.Label != "" {
			labels[r.RoleID] = r.Label
		}
	}
	return labels
}

func sortWorkspaces(ws []Workspace) {
	// Insertion sort: the list is at most a handful of entries.
	for i := 1; i < len(ws); i++ {
		for j := i; j > 0 && workspaceRank(ws[j].Role) < workspaceRank(ws[j-1].Role); j-- {
			ws[j], ws[j-1] = ws[j-1], ws[j]
		}
	}
}
