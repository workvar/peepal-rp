package models

import "testing"

// Guardrail: every module a default healthcare role grants must exist in the
// access registry and be available to healthcare tenants. Catches a typo, or a
// module renamed out from under the template.
func TestHealthcareDefaultRoleGrantsAreValid(t *testing.T) {
	seen := map[string]bool{}
	for _, tpl := range healthcareDefaultRoles {
		if seen[tpl.Name] {
			t.Fatalf("duplicate role %s", tpl.Name)
		}
		seen[tpl.Name] = true
		mods := map[string]bool{}
		for _, g := range tpl.Grants {
			if _, ok := ModuleByID(g.Module); !ok {
				t.Errorf("%s: unknown module %q", tpl.Name, g.Module)
			}
			if !ModuleAllowedForIndustry(g.Module, TenantTypeHealthcare) {
				t.Errorf("%s: module %q not available to healthcare", tpl.Name, g.Module)
			}
			if mods[g.Module] {
				t.Errorf("%s: duplicate grant for %q", tpl.Name, g.Module)
			}
			mods[g.Module] = true

			// A grant the resolvers would refuse is dead weight: it shows in
			// the matrix but MyAccess trims it away. Keep the templates honest.
			if got := ApplyRoleCeiling(g.Flags, g.Module, tpl.BaseRole); got != g.Flags {
				t.Errorf("%s: grant on %q exceeds the %s ceiling (have %+v, allowed %+v)",
					tpl.Name, g.Module, tpl.BaseRole, g.Flags, got)
			}
		}
	}
}
