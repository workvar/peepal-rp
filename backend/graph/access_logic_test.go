package graph

import (
	"testing"

	"collegeerp/models"
)

// Defaults: admins get everything; non-admins get view on their default
// modules, writes too unless they're students (view-only by default).
func TestDefaultSystemAccess(t *testing.T) {
	cases := []struct {
		role, module string
		want         models.AccessFlags
	}{
		{"admin", "payroll", models.AccessFlags{View: true, Create: true, Edit: true, Delete: true}},
		{"teacher", "students", models.AccessFlags{View: true, Create: true, Edit: true, Delete: true}},
		{"staff", "payroll", models.AccessFlags{View: true, Create: true, Edit: true, Delete: true}},
		{"student", "marks", models.AccessFlags{View: true, Create: false, Edit: false, Delete: false}},
		{"teacher", "users", models.AccessFlags{}},          // not a default role for users
		{"staff", "students", models.AccessFlags{}},         // staff not in students defaults
		{"teacher", "made-up-module", models.AccessFlags{}}, // unknown module
	}
	for _, c := range cases {
		if got := models.DefaultSystemAccess(c.role, c.module); got != c.want {
			t.Errorf("DefaultSystemAccess(%q,%q) = %+v, want %+v", c.role, c.module, got, c.want)
		}
	}
}

// A stored rule overrides the registry default; custom roles default to nothing.
func TestEffectiveFlags(t *testing.T) {
	rules := []models.AccessRule{
		{SubjectType: models.SubjectSystem, SubjectKey: "teacher", Module: "students", CanView: true}, // tightened: view only
		{SubjectType: models.SubjectCustom, SubjectKey: "role-1", Module: "fees", CanView: true, CanCreate: true},
	}
	m := indexRules(rules)

	// Override wins over the default (which would be full CRUD for teacher).
	if got := effectiveFlags(m, models.SubjectSystem, "teacher", "students"); got != (models.AccessFlags{View: true}) {
		t.Errorf("override not applied: %+v", got)
	}
	// No rule → system default.
	if got := effectiveFlags(m, models.SubjectSystem, "student", "marks"); !got.View || got.Create {
		t.Errorf("system default wrong: %+v", got)
	}
	// Custom role with a grant.
	if got := effectiveFlags(m, models.SubjectCustom, "role-1", "fees"); !got.View || !got.Create || got.Delete {
		t.Errorf("custom grant wrong: %+v", got)
	}
	// Custom role with no rule → no access.
	if got := effectiveFlags(m, models.SubjectCustom, "role-1", "payroll"); got != (models.AccessFlags{}) {
		t.Errorf("custom default should be empty: %+v", got)
	}
}

// A user's effective access is the union of base-role and custom-role grants.
func TestAccessFlagsOr(t *testing.T) {
	base := models.AccessFlags{View: true}
	custom := models.AccessFlags{Create: true, Edit: true}
	got := base.Or(custom)
	want := models.AccessFlags{View: true, Create: true, Edit: true}
	if got != want {
		t.Errorf("Or = %+v, want %+v", got, want)
	}
	if !got.Can(models.ActionEdit) || got.Can(models.ActionDelete) {
		t.Errorf("Can() wrong on %+v", got)
	}
}

// Every module referenced by the enforcement map must exist in the registry,
// otherwise an op would silently never match a real module.
func TestOpAccessModulesExist(t *testing.T) {
	for field, spec := range opAccess {
		if _, ok := models.ModuleByID(spec.Module); !ok {
			t.Errorf("opAccess[%q] references unknown module %q", field, spec.Module)
		}
	}
}
