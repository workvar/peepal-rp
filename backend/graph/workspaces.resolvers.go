package graph

// workspaces.resolvers.go — listing and granting workspaces (multi-role).
//
// Switching the active workspace is REST (handlers/workspaces.go) because it
// writes the httpOnly auth cookie. Everything else — reading a user's
// workspaces and editing their grants — is served here.

import (
	"context"
	"log"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// MyWorkspaces returns the workspaces the calling user may switch into.
func (r *queryResolver) MyWorkspaces(ctx context.Context) ([]*model.Workspace, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var user models.User
	if err := r.DB.First(&user, "id = ?", auth.UserID).Error; err != nil {
		return nil, ErrNotFound
	}
	return toGQLWorkspaces(models.UserWorkspaces(r.DB, &user)), nil
}

// UserWorkspaces returns the workspaces held by any user in the tenant.
// Admin only — this drives the "Additional workspaces" field on the admin forms.
func (r *queryResolver) UserWorkspaces(ctx context.Context, userID string) ([]*model.Workspace, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	user, err := loadTenantUser(r.DB, auth.TenantID, userID)
	if err != nil {
		return nil, err
	}
	return toGQLWorkspaces(models.UserWorkspaces(r.DB, user)), nil
}

// SetUserWorkspaceRoles replaces a user's additional workspace grants.
//
// The grants are rewritten wholesale rather than diffed: the admin form always
// submits the complete desired set, and a full replace inside one transaction
// removes any chance of a half-applied change leaving a stale grant behind.
func (r *mutationResolver) SetUserWorkspaceRoles(ctx context.Context, userID string, roles []*model.WorkspaceRoleInput) ([]*model.Workspace, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	user, err := loadTenantUser(r.DB, auth.TenantID, userID)
	if err != nil {
		return nil, err
	}

	grants, err := validateWorkspaceGrants(r.DB, auth.TenantID, user, roles)
	if err != nil {
		return nil, err
	}

	err = r.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND tenant_id = ?", user.ID, auth.TenantID).
			Delete(&models.UserRole{}).Error; err != nil {
			return err
		}
		if len(grants) == 0 {
			return nil
		}
		return tx.Create(&grants).Error
	})
	if err != nil {
		return nil, GQLErr("could not save workspaces")
	}

	// A session remembers the workspace it is in, and a withdrawn grant would
	// otherwise keep working until that session next refreshed. Sessions in a
	// workspace the user still holds are left alone: losing one grant should
	// not sign them out of the others.
	allowed := []string{string(user.Role)}
	for _, g := range grants {
		allowed = append(allowed, string(g.Role))
	}
	if n, err := models.RevokeUserSessionsOutsideRoles(
		r.DB, user.ID, allowed, models.RevokeReasonAccountLocked,
	); err != nil {
		log.Printf("[AUTH] setUserWorkspaceRoles: could not revoke stale sessions for user=%s: %v", user.ID, err)
	} else if n > 0 {
		log.Printf("[AUTH] setUserWorkspaceRoles: revoked %d session token(s) in withdrawn workspaces user=%s", n, user.ID)
	}

	return toGQLWorkspaces(models.UserWorkspaces(r.DB, user)), nil
}

// ── helpers ────────────────────────────────────────────────────

// loadTenantUser fetches a user scoped to the caller's tenant.
func loadTenantUser(db *gorm.DB, tenantID, userID string) (*models.User, error) {
	var user models.User
	if err := db.Where("id = ? AND tenant_id = ?", userID, tenantID).First(&user).Error; err != nil {
		return nil, ErrNotFound
	}
	return &user, nil
}

// validateWorkspaceGrants turns the submitted input into UserRole rows,
// rejecting anything unsafe: unknown or non-grantable roles (super_admin), and
// custom-role overlays that belong to another tenant. The user's own primary
// role is silently dropped — it is already implicit and must never be stored
// here, or revoking it would look possible.
func validateWorkspaceGrants(db *gorm.DB, tenantID string, user *models.User, roles []*model.WorkspaceRoleInput) ([]models.UserRole, error) {
	seen := map[string]bool{string(user.Role): true}
	out := make([]models.UserRole, 0, len(roles))

	for _, in := range roles {
		if in == nil {
			continue
		}
		role := strings.ToLower(strings.TrimSpace(in.Role))
		if seen[role] {
			continue // duplicate, or the implicit primary role
		}
		if !models.IsAssignableWorkspaceRole(role) {
			return nil, GQLErr("'" + in.Role + "' is not a workspace that can be assigned")
		}
		seen[role] = true

		grant := models.UserRole{
			TenantID: tenantID,
			UserID:   user.ID,
			Role:     models.Role(role),
		}
		if in.CustomRoleID != nil && *in.CustomRoleID != "" {
			var cr models.CustomRole
			if err := db.Where("id = ? AND tenant_id = ?", *in.CustomRoleID, tenantID).First(&cr).Error; err != nil {
				return nil, GQLErr("custom role not found for this organisation")
			}
			grant.CustomRoleID = in.CustomRoleID
		}
		out = append(out, grant)
	}
	return out, nil
}

func toGQLWorkspaces(ws []models.Workspace) []*model.Workspace {
	out := make([]*model.Workspace, len(ws))
	for i, w := range ws {
		out[i] = &model.Workspace{
			Role:         string(w.Role),
			Label:        w.Label,
			IsPrimary:    w.IsPrimary,
			CustomRoleID: w.CustomRoleID,
		}
	}
	return out
}
