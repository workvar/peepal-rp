package peepalai

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// A Grant is one table the caller may query, together with the mandatory row
// scope (tenant + self restrictions). Grants are turned into CTEs that shadow
// the real tables, so the generated SQL can only ever see permitted rows.

type UserContext struct {
	UserID       string
	Role         string
	TenantID     string
	IsSuperAdmin bool
	// Linked profile ids, "" when the user has none. Given to the model so
	// "my ..." questions resolve correctly.
	StudentID  string
	EmployeeID string
	PatientID  string
	Name       string
}

type Grant struct {
	Spec    TableSpec
	Columns []string
	Where   string // WHERE clause with ? placeholders; "" = unscoped (super admin)
	Args    []interface{}
}

// BuildGrants resolves the caller's grants: every catalog table whose module
// the caller may view (decided by canView, which wraps the access matrix +
// industry + subscription checks), with tenant and self scoping applied.
// canView reports full role-matrix view access (incl. industry+subscription);
// entitled reports only industry+subscription entitlement, used to gate the
// student/patient self-service exception so a lapsed/wrong-industry module is
// never reachable even for the caller's own rows.
func BuildGrants(db *gorm.DB, user UserContext, canView, entitled func(module string) bool) ([]Grant, error) {
	cols, err := tableColumns(db)
	if err != nil {
		return nil, err
	}

	var grants []Grant
	for _, spec := range Catalog {
		columns, exists := cols[spec.Name]
		if !exists || len(columns) == 0 {
			continue // table not present in this database
		}
		if !user.IsSuperAdmin && spec.Module != "" && !canView(spec.Module) {
			// Self-service exception: a table that is self-scoped for this
			// role stays available even without module view — the caller can
			// only ever see their own rows in it (mirrors the portal pages,
			// e.g. a student's own fees without the staff "fees" module).
			selfScoped := (user.Role == "student" && spec.StudentScope != "") ||
				(user.Role == "patient" && spec.PatientScope != "")
			// Self-service relaxes only the role-matrix view, never the
			// org-wide industry/subscription entitlement.
			if !selfScoped || !entitled(spec.Module) {
				continue
			}
		}
		grants = append(grants, Grant{
			Spec:    spec,
			Columns: columns,
			Where:   scopeWhere(spec, user),
			Args:    scopeArgs(spec, user),
		})
	}
	return grants, nil
}

func scopeWhere(spec TableSpec, user UserContext) string {
	if user.IsSuperAdmin {
		return "" // platform super admin: cross-tenant, unscoped
	}
	where := "tenant_id = ?"
	if user.Role == "student" && spec.StudentScope != "" {
		where += " AND (" + spec.StudentScope + ")"
	}
	if user.Role == "patient" && spec.PatientScope != "" {
		where += " AND (" + spec.PatientScope + ")"
	}
	return where
}

func scopeArgs(spec TableSpec, user UserContext) []interface{} {
	if user.IsSuperAdmin {
		return nil
	}
	args := []interface{}{user.TenantID}
	if user.Role == "student" && spec.StudentScope != "" {
		args = append(args, user.UserID)
	}
	if user.Role == "patient" && spec.PatientScope != "" {
		args = append(args, user.UserID)
	}
	return args
}

// ctePrelude renders the WITH clause that shadows every granted table with
// its scoped, column-filtered variant, plus the flattened bind args.
func ctePrelude(grants []Grant) (string, []interface{}) {
	parts := make([]string, 0, len(grants))
	var args []interface{}
	for _, g := range grants {
		sel := fmt.Sprintf(`SELECT %s FROM public.%s`, strings.Join(g.Columns, ", "), g.Spec.Name)
		if g.Where != "" {
			sel += " WHERE " + g.Where
			args = append(args, g.Args...)
		}
		parts = append(parts, fmt.Sprintf("%s AS (%s)", g.Spec.Name, sel))
	}
	return "WITH " + strings.Join(parts, ",\n"), args
}
