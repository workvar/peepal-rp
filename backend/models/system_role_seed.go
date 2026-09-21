package models

import "gorm.io/gorm"

// systemRoleSeed is one row of the per-industry template. RoleID is the fixed
// enforced enum; Label/Description are filled from the tenant's terminology.
type systemRoleSeed struct {
	RoleID    string
	Color     string
	SortOrder int
}

// systemRoleTemplate is the fixed set of built-in roles every tenant gets, in
// display order. Admin is always first and identical across verticals; the
// other three take their words from the tenant's terminology bundle. Colours
// mirror the Roles & Permissions page accents.
var systemRoleTemplate = []systemRoleSeed{
	{RoleID: "admin", Color: "blue", SortOrder: 0},
	{RoleID: "teacher", Color: "green", SortOrder: 1},
	{RoleID: "student", Color: "yellow", SortOrder: 2},
	{RoleID: "staff", Color: "violet", SortOrder: 3},
}

// systemRoleLabel resolves the display label for a built-in role id under a
// tenant's terminology. Admin is fixed; the rest read from the bundle.
func systemRoleLabel(roleID string, t Terminology) string {
	switch roleID {
	case "admin":
		return "Admin"
	case "teacher":
		return t.RoleStaff
	case "student":
		return t.RoleMember
	case "staff":
		return t.RoleSupport
	default:
		return roleID
	}
}

// systemRoleDescription builds the short blurb shown on each role card, phrased
// with the tenant's own attendance/marks/leave words so a hospital reads
// "shifts / assessments" where a college reads "attendance / marks".
func systemRoleDescription(roleID string, t Terminology) string {
	att := lower(t.Attendance)
	marks := lower(t.Marks)
	leave := lower(t.Leave)
	switch roleID {
	case "admin":
		return "Full access to all modules within the organisation"
	case "teacher":
		return "View & mark " + att + ", record " + marks
	case "student":
		return "View own " + att + ", " + marks + ", and " + leave
	case "staff":
		return "View & mark " + att + ", manage " + leave
	default:
		return ""
	}
}

// SeedSystemRoles materialises the built-in roles for one tenant from its
// industry terminology. Idempotent and additive: if the tenant already has any
// system-role rows it is left untouched, so a re-run (or a backfill sweep) never
// clobbers or duplicates. Call it right after a tenant is created.
func SeedSystemRoles(db *gorm.DB, tenant *Tenant) error {
	var count int64
	if err := db.Model(&SystemRole{}).
		Where("tenant_id = ?", tenant.ID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	t := DefaultTerminology(tenant.Type)
	rows := make([]SystemRole, 0, len(systemRoleTemplate))
	for _, s := range systemRoleTemplate {
		rows = append(rows, SystemRole{
			TenantID:    tenant.ID,
			RoleID:      s.RoleID,
			Label:       systemRoleLabel(s.RoleID, t),
			Description: systemRoleDescription(s.RoleID, t),
			Color:       s.Color,
			SortOrder:   s.SortOrder,
		})
	}
	return db.Create(&rows).Error
}

// RelabelSystemRoles rewrites the built-in role labels/descriptions from the
// tenant's current terminology. Used when a super-admin changes org type
// (college → hospital) so the Roles page stops saying "Teacher / Student".
// Idempotent: tenants with no system-role rows are left for SeedSystemRoles.
func RelabelSystemRoles(db *gorm.DB, tenant *Tenant) error {
	if tenant == nil {
		return nil
	}
	t := DefaultTerminology(tenant.Type)
	for _, s := range systemRoleTemplate {
		res := db.Model(&SystemRole{}).
			Where("tenant_id = ? AND role_id = ?", tenant.ID, s.RoleID).
			Updates(map[string]interface{}{
				"label":       systemRoleLabel(s.RoleID, t),
				"description": systemRoleDescription(s.RoleID, t),
			})
		if res.Error != nil {
			return res.Error
		}
	}
	return nil
}

// SeedSystemRolesAll backfills every existing tenant that has no system roles
// yet. Safe to run repeatedly — SeedSystemRoles skips tenants already seeded.
func SeedSystemRolesAll(db *gorm.DB) error {
	var tenants []Tenant
	if err := db.Find(&tenants).Error; err != nil {
		return err
	}
	for i := range tenants {
		if err := SeedSystemRoles(db, &tenants[i]); err != nil {
			return err
		}
	}
	return nil
}

// lower is a tiny helper kept local to avoid importing strings in this file's
// hot path; terminology values are short single words.
func lower(s string) string {
	b := []byte(s)
	for i := range b {
		if b[i] >= 'A' && b[i] <= 'Z' {
			b[i] += 'a' - 'A'
		}
	}
	return string(b)
}
