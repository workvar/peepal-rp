package models

import (
	"strings"

	"gorm.io/gorm"
)

// Per-industry default roles.
//
// System roles (admin/teacher/student/staff) are a fixed enum the whole backend
// keys off, so a vertical cannot add new ones. What a vertical *can* ship is a
// set of ready-made CustomRoles: a hospital gets "Receptionist", "Doctor" and
// "Pharmacist" out of the box, each already wired to the modules that job
// actually touches, instead of the admin hand-building them in the access
// matrix.
//
// A default role is stored exactly like an admin-created one:
//   - one CustomRole row (name + legacy comma-separated permission string that
//     the Roles & Permissions cards render), and
//   - one AccessRule row per module it grants (subject_type = custom), which is
//     what MyAccess / accessFieldMiddleware actually enforce.
//
// Assigning it to a user is unchanged: pick it in the Add Employee dropdown
// ("custom:<id>"), which layers these grants on top of the user's base role.

// roleModuleGrant is one module a default role can reach, with its CRUD flags.
type roleModuleGrant struct {
	Module string
	Flags  AccessFlags
}

// Shorthand constructors so the per-industry tables below stay readable.
func view(m string) roleModuleGrant {
	return roleModuleGrant{m, AccessFlags{View: true}}
}
func write(m string) roleModuleGrant { // view + create + edit, no delete
	return roleModuleGrant{m, AccessFlags{View: true, Create: true, Edit: true}}
}
func manage(m string) roleModuleGrant { // full CRUD
	return roleModuleGrant{m, AccessFlags{View: true, Create: true, Edit: true, Delete: true}}
}

// defaultRoleTemplate describes one ready-made role for an industry.
type defaultRoleTemplate struct {
	// Name is the display name and the idempotency key (per tenant).
	Name string
	// BaseRole is the system role this job normally sits on. It is advisory —
	// the grants below are explicit, so the role works whatever base it is
	// layered onto — but it documents the intended pairing.
	BaseRole string
	// Permissions are legacy coarse permission keys shown as chips on the
	// Roles & Permissions cards. Enforcement comes from Grants.
	Permissions []string
	// Grants are the module-level CRUD rules written as AccessRule rows.
	Grants []roleModuleGrant
}

// defaultRolesByIndustry maps a canonical tenant type to its ready-made roles.
// Industries with no entry simply get none.
var defaultRolesByIndustry = map[TenantType][]defaultRoleTemplate{
	TenantTypeHealthcare: healthcareDefaultRoles,
}

// SeedDefaultRoles materialises the ready-made roles for one tenant's industry.
//
// Idempotent and additive, matching SeedSystemRoles: a role whose name already
// exists for the tenant is skipped entirely (name, permissions and access rules
// are left exactly as the admin left them), and only genuinely missing roles are
// created. Safe to call on every tenant, repeatedly.
func SeedDefaultRoles(db *gorm.DB, tenant *Tenant) error {
	templates, ok := defaultRolesByIndustry[tenant.Type.Canonical()]
	if !ok {
		return nil
	}

	var existing []CustomRole
	if err := db.Where("tenant_id = ?", tenant.ID).Find(&existing).Error; err != nil {
		return err
	}
	taken := make(map[string]bool, len(existing))
	for _, cr := range existing {
		taken[strings.ToLower(cr.Name)] = true
	}

	for _, tpl := range templates {
		if taken[strings.ToLower(tpl.Name)] {
			continue
		}
		if err := createDefaultRole(db, tenant.ID, tpl); err != nil {
			return err
		}
	}
	return nil
}

// createDefaultRole writes one CustomRole plus its AccessRule rows.
func createDefaultRole(db *gorm.DB, tenantID string, tpl defaultRoleTemplate) error {
	cr := CustomRole{
		TenantID:    tenantID,
		Name:        tpl.Name,
		Permissions: strings.Join(tpl.Permissions, ","),
	}
	if err := db.Create(&cr).Error; err != nil {
		return err
	}

	rules := make([]AccessRule, 0, len(tpl.Grants))
	for _, g := range tpl.Grants {
		if _, known := ModuleByID(g.Module); !known {
			continue // registry drifted; skip rather than write a dead rule
		}
		rules = append(rules, AccessRule{
			TenantID:    tenantID,
			SubjectType: SubjectCustom,
			SubjectKey:  cr.ID,
			Module:      g.Module,
			CanView:     g.Flags.View,
			CanCreate:   g.Flags.Create,
			CanEdit:     g.Flags.Edit,
			CanDelete:   g.Flags.Delete,
		})
	}
	if len(rules) == 0 {
		return nil
	}
	return db.Create(&rules).Error
}

// SeedDefaultRolesAll backfills every existing tenant. Safe to run repeatedly —
// SeedDefaultRoles skips roles a tenant already has.
func SeedDefaultRolesAll(db *gorm.DB) error {
	var tenants []Tenant
	if err := db.Find(&tenants).Error; err != nil {
		return err
	}
	for i := range tenants {
		if err := SeedDefaultRoles(db, &tenants[i]); err != nil {
			return err
		}
	}
	return nil
}
