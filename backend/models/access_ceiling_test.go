package models

import "testing"

var allSystemRoles = []string{roleAdminName, roleTeacherName, roleStaffName, roleStudentName}

// The ceiling maps are hand-maintained from the resolver guards, so a typo in a
// module id would silently cap nothing. Every key must be a real module.
func TestCeilingMapsReferenceKnownModules(t *testing.T) {
	for _, m := range []map[string][]string{moduleViewRoles, moduleWriteRoles, moduleDeleteRoles} {
		for moduleID, roles := range m {
			if _, ok := ModuleByID(moduleID); !ok {
				t.Errorf("ceiling map references unknown module %q", moduleID)
			}
			for _, r := range roles {
				switch r {
				case roleTeacherName, roleStaffName, roleStudentName:
				case roleAdminName:
					t.Errorf("%s: admin is implicit and should not be listed", moduleID)
				default:
					t.Errorf("%s: unknown role %q", moduleID, r)
				}
			}
		}
	}
}

// Admins are unrestricted everywhere — the whole point of the ceiling is that
// it only ever trims non-admin roles.
func TestAdminIsNeverCapped(t *testing.T) {
	full := AccessFlags{View: true, Create: true, Edit: true, Delete: true}
	for _, m := range AccessModules {
		if got := RoleCeiling(m.ID, roleAdminName); got != full {
			t.Errorf("%s: admin capped to %+v", m.ID, got)
		}
	}
}

// A module with no entry in either map is unrestricted: the matrix is its only
// gate. Clinical modules rely on this, since their resolvers take any
// authenticated user.
func TestUngatedModulesAreUncapped(t *testing.T) {
	full := AccessFlags{View: true, Create: true, Edit: true, Delete: true}
	for _, id := range []string{"profile", "my-approvals", "ask-peepalai", "docs"} {
		for _, role := range allSystemRoles {
			if got := RoleCeiling(id, role); got != full {
				t.Errorf("%s/%s: expected uncapped, got %+v", id, role, got)
			}
		}
	}
}

// The reported bug: staff saw Employees in the sidebar and got "forbidden".
// The directory is now readable by everyone, but only an admin may write to it.
func TestEmployeesIsReadOnlyBelowAdmin(t *testing.T) {
	for _, role := range []string{roleTeacherName, roleStaffName, roleStudentName} {
		got := RoleCeiling("employees", role)
		if !got.View {
			t.Errorf("employees/%s: directory should be viewable", role)
		}
		if got.Create || got.Edit || got.Delete {
			t.Errorf("employees/%s: writes are admin-only, got %+v", role, got)
		}
	}
}

// Admin-only pages must collapse to no access at all, so nav hides them rather
// than linking to a 403.
func TestAdminOnlyModulesAreHiddenBelowAdmin(t *testing.T) {
	for _, id := range []string{"audit", "roles", "access-control", "ledger", "salary-templates"} {
		for _, role := range []string{roleTeacherName, roleStaffName, roleStudentName} {
			if got := RoleCeiling(id, role); got != (AccessFlags{}) {
				t.Errorf("%s/%s: expected no access, got %+v", id, role, got)
			}
		}
	}
}
