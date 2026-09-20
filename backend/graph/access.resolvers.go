package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// Resolvers for the role access matrix. Reads are admin-only (the editor);
// myAccess is available to any authenticated user to drive their navigation.

// AccessMatrix returns every module plus one column per role (system + custom)
// with that role's effective access.
func (r *queryResolver) AccessMatrix(ctx context.Context) (*model.AccessMatrix, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	// Only modules that belong to this tenant's industry appear in the editor.
	tenantType := models.TenantTypeOf(r.DB, auth.TenantID)
	metas := make([]*model.AccessModuleMeta, 0, len(models.AccessModules))
	for _, m := range models.AccessModules {
		if !models.ModuleAllowedForIndustry(m.ID, tenantType) {
			continue
		}
		metas = append(metas, &model.AccessModuleMeta{ID: m.ID, Label: m.Label, Group: m.Group})
	}

	var rules []models.AccessRule
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&rules).Error; err != nil {
		return nil, err
	}
	ruleMap := indexRules(rules)

	roles := make([]*model.RoleAccess, 0, len(systemRoleOrder)+4)
	for _, sr := range systemRoleOrder {
		roles = append(roles, buildRoleAccess(models.SubjectSystem, sr, systemRoleLabel(sr), false, ruleMap))
	}

	var customs []models.CustomRole
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Order("name").Find(&customs).Error; err != nil {
		return nil, err
	}
	for _, c := range customs {
		roles = append(roles, buildRoleAccess(models.SubjectCustom, c.ID, c.Name, true, ruleMap))
	}

	return &model.AccessMatrix{Modules: metas, Roles: roles}, nil
}

// MyAccess returns the caller's effective per-module access: their system role's
// access merged with any custom role grant.
func (r *queryResolver) MyAccess(ctx context.Context) ([]*model.ModuleAccess, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var rules []models.AccessRule
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&rules).Error; err != nil {
		return nil, err
	}
	ruleMap := indexRules(rules)
	customID := userCustomRoleID(r.DB, auth.UserID, auth.Role)

	// Subscription entitlement: modules the org isn't subscribed to are forced
	// to all-false below, so nav and the route guard hide them for everyone in
	// the org (admins included). Skipped when there's no subscription row.
	enabled, hasSub := models.TenantEnabledModuleSet(r.DB, auth.TenantID)

	// Industry entitlement: modules belonging to another industry (e.g. Marks
	// for a hospital, Patients for a college) are likewise forced to all-false.
	tenantType := models.TenantTypeOf(r.DB, auth.TenantID)

	out := make([]*model.ModuleAccess, len(models.AccessModules))
	for i, m := range models.AccessModules {
		f := effectiveFlags(ruleMap, models.SubjectSystem, auth.Role, m.ID)
		if customID != "" {
			f = f.Or(effectiveFlags(ruleMap, models.SubjectCustom, customID, m.ID))
		}
		if hasSub {
			if coarse := models.SubscriptionModuleForAccess(m.ID); coarse != "" && !enabled[coarse] {
				f = models.AccessFlags{} // module not in the subscription: lock it
			}
		}
		if !models.ModuleAllowedForIndustry(m.ID, tenantType) {
			f = models.AccessFlags{} // module belongs to another industry: lock it
		}
		// Resolver ceiling: many pages and mutations are guarded by
		// requireRole(...) below what the matrix can grant. Trim the caller's
		// flags — including anything a custom role added, since the resolvers
		// only ever see their base role — so nav, the route guard and <Can>
		// never offer something the backend answers "forbidden" to.
		f = models.ApplyRoleCeiling(f, m.ID, auth.Role)
		out[i] = &model.ModuleAccess{
			Module:    m.ID,
			CanView:   f.View,
			CanCreate: f.Create,
			CanEdit:   f.Edit,
			CanDelete: f.Delete,
		}
	}
	return out, nil
}

// UpdateRoleAccess upserts the access rows for one role across the supplied
// modules. The Admin role is fixed at full access and cannot be edited.
func (r *mutationResolver) UpdateRoleAccess(ctx context.Context, input model.UpdateRoleAccessInput) (*model.RoleAccess, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	switch input.SubjectType {
	case models.SubjectSystem:
		if !validSystemRole(input.SubjectKey) {
			return nil, GQLErr("unknown system role")
		}
		if input.SubjectKey == roleAdmin {
			return nil, GQLErr("the Admin role always has full access and cannot be restricted")
		}
	case models.SubjectCustom:
		var cr models.CustomRole
		if err := r.DB.Where("id = ? AND tenant_id = ?", input.SubjectKey, auth.TenantID).First(&cr).Error; err != nil {
			return nil, GQLErr("custom role not found for this tenant")
		}
	default:
		return nil, GQLErr("invalid subjectType")
	}

	for _, mi := range input.Modules {
		if _, ok := models.ModuleByID(mi.Module); !ok {
			continue // ignore unknown modules
		}
		// Trim a system role's grant to what its resolvers will honour. Saved
		// as off rather than erroring, so one capped cell never fails a bulk
		// save; the returned column shows the admin what actually stuck.
		if input.SubjectType == models.SubjectSystem {
			capped := models.ApplyRoleCeiling(
				models.AccessFlags{View: mi.CanView, Create: mi.CanCreate, Edit: mi.CanEdit, Delete: mi.CanDelete},
				mi.Module, input.SubjectKey,
			)
			mi.CanView, mi.CanCreate, mi.CanEdit, mi.CanDelete = capped.View, capped.Create, capped.Edit, capped.Delete
		}
		var rule models.AccessRule
		findErr := r.DB.Where(
			"tenant_id = ? AND subject_type = ? AND subject_key = ? AND module = ?",
			auth.TenantID, input.SubjectType, input.SubjectKey, mi.Module,
		).First(&rule).Error

		rule.CanView = mi.CanView
		rule.CanCreate = mi.CanCreate
		rule.CanEdit = mi.CanEdit
		rule.CanDelete = mi.CanDelete
		rule.UpdatedAt = time.Now()

		if findErr != nil {
			rule.TenantID = auth.TenantID
			rule.SubjectType = input.SubjectType
			rule.SubjectKey = input.SubjectKey
			rule.Module = mi.Module
			if err := r.DB.Create(&rule).Error; err != nil {
				return nil, err
			}
		} else {
			if err := r.DB.Save(&rule).Error; err != nil {
				return nil, err
			}
		}
	}

	return roleAccessFor(r.DB, auth.TenantID, input.SubjectType, input.SubjectKey)
}

// ResetRoleAccess deletes all overrides for a role so it falls back to defaults.
func (r *mutationResolver) ResetRoleAccess(ctx context.Context, subjectType string, subjectKey string) (*model.RoleAccess, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if subjectType != models.SubjectSystem && subjectType != models.SubjectCustom {
		return nil, GQLErr("invalid subjectType")
	}
	if err := r.DB.Where(
		"tenant_id = ? AND subject_type = ? AND subject_key = ?",
		auth.TenantID, subjectType, subjectKey,
	).Delete(&models.AccessRule{}).Error; err != nil {
		return nil, err
	}
	return roleAccessFor(r.DB, auth.TenantID, subjectType, subjectKey)
}
