package graph

import (
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Shared helpers for the role access matrix: turning stored AccessRule rows plus
// registry defaults into effective ModuleAccess values, and building the
// RoleAccess columns returned by the resolvers.

// systemRoleOrder is the fixed display order of built-in roles in the matrix.
var systemRoleOrder = []string{roleAdmin, roleTeacher, roleStaff, roleStudent}

func systemRoleLabel(role string) string {
	switch role {
	case roleAdmin:
		return "Admin"
	case roleTeacher:
		return "Teacher"
	case roleStaff:
		return "Staff"
	case roleStudent:
		return "Student"
	default:
		if role == "" {
			return ""
		}
		return strings.ToUpper(role[:1]) + role[1:]
	}
}

func validSystemRole(role string) bool {
	for _, r := range systemRoleOrder {
		if r == role {
			return true
		}
	}
	return false
}

// ruleKey builds the composite key used to index AccessRule rows in memory.
func ruleKey(subjectType, subjectKey, module string) string {
	return subjectType + "|" + subjectKey + "|" + module
}

// indexRules turns a slice of rules into a lookup keyed by ruleKey.
func indexRules(rules []models.AccessRule) map[string]models.AccessRule {
	m := make(map[string]models.AccessRule, len(rules))
	for _, r := range rules {
		m[ruleKey(r.SubjectType, r.SubjectKey, r.Module)] = r
	}
	return m
}

// effectiveFlags resolves the access for one (subject, module): a stored rule
// wins, otherwise the registry default (system roles) or "no access" (custom).
func effectiveFlags(ruleMap map[string]models.AccessRule, subjectType, subjectKey, moduleID string) models.AccessFlags {
	if rule, ok := ruleMap[ruleKey(subjectType, subjectKey, moduleID)]; ok {
		return rule.Flags()
	}
	if subjectType == models.SubjectSystem {
		return models.DefaultSystemAccess(subjectKey, moduleID)
	}
	return models.AccessFlags{} // custom roles start with no access
}

// moduleAccessList builds the per-module access slice for one subject.
//
// System-role columns are trimmed to the module's role ceiling
// (access_ceiling.go): what the resolvers would refuse shows as off and cannot
// be switched on, so the matrix never promises access the backend denies.
// Custom-role columns are left untrimmed — a custom role is layered on whatever
// base role the user has, and MyAccess applies that user's ceiling at request
// time.
func moduleAccessList(ruleMap map[string]models.AccessRule, subjectType, subjectKey string) []*model.ModuleAccess {
	out := make([]*model.ModuleAccess, len(models.AccessModules))
	for i, m := range models.AccessModules {
		f := effectiveFlags(ruleMap, subjectType, subjectKey, m.ID)
		if subjectType == models.SubjectSystem {
			f = models.ApplyRoleCeiling(f, m.ID, subjectKey)
		}
		out[i] = &model.ModuleAccess{
			Module:    m.ID,
			CanView:   f.View,
			CanCreate: f.Create,
			CanEdit:   f.Edit,
			CanDelete: f.Delete,
		}
	}
	return out
}

// buildRoleAccess assembles one RoleAccess column.
func buildRoleAccess(subjectType, subjectKey, label string, isCustom bool, ruleMap map[string]models.AccessRule) *model.RoleAccess {
	return &model.RoleAccess{
		SubjectType: subjectType,
		SubjectKey:  subjectKey,
		Label:       label,
		IsCustom:    isCustom,
		Modules:     moduleAccessList(ruleMap, subjectType, subjectKey),
	}
}

// roleAccessFor loads the tenant's rules and rebuilds a single role column,
// resolving the display label from the system role name or CustomRole record.
func roleAccessFor(db *gorm.DB, tenantID, subjectType, subjectKey string) (*model.RoleAccess, error) {
	var rules []models.AccessRule
	if err := db.Where("tenant_id = ?", tenantID).Find(&rules).Error; err != nil {
		return nil, err
	}
	ruleMap := indexRules(rules)

	label := systemRoleLabel(subjectKey)
	isCustom := subjectType == models.SubjectCustom
	if isCustom {
		var cr models.CustomRole
		if err := db.Where("id = ? AND tenant_id = ?", subjectKey, tenantID).First(&cr).Error; err != nil {
			return nil, ErrNotFound
		}
		label = cr.Name
	}
	return buildRoleAccess(subjectType, subjectKey, label, isCustom, ruleMap), nil
}

// userCustomRoleID returns the CustomRole overlay that applies to a user while
// they are acting as activeRole, or "" if none.
//
// Overlays are per-workspace: the same person can carry a custom role in their
// teacher workspace and none in their student workspace. When activeRole is the
// user's primary role (or is blank) the User row's own overlay applies.
func userCustomRoleID(db *gorm.DB, userID, activeRole string) string {
	var u models.User
	if err := db.Select("id, tenant_id, role, custom_role_id").First(&u, "id = ?", userID).Error; err != nil {
		return ""
	}
	id := models.ActiveCustomRoleID(db, &u, activeRole)
	if id == nil {
		return ""
	}
	return *id
}
