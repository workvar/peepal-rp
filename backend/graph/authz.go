package graph

// Authorization helpers shared by all resolver modules.
//
// The HTTP route already runs middleware.Authenticate, so every request that
// reaches a resolver carries a valid JWT. These helpers add defense in depth:
// resolvers re-verify that auth claims are present and enforce role membership
// before touching tenant data. Errors use the sentinel errors from errors.go
// (ErrUnauthorized / ErrForbidden) so the error presenter maps them to the
// UNAUTHORIZED / FORBIDDEN extension codes.

import (
	"context"

	"collegeerp/models"
)

// requireAuth returns the request's AuthContext or ErrUnauthorized when the
// claims are missing. A normal user must have both UserID and TenantID; a
// super admin may operate from the platform tenant, so only UserID is
// required for them.
func requireAuth(ctx context.Context) (AuthContext, error) {
	auth := AuthFromCtx(ctx)
	if auth.UserID == "" {
		return AuthContext{}, ErrUnauthorized
	}
	if auth.TenantID == "" && !auth.IsSuperAdmin {
		return AuthContext{}, ErrUnauthorized
	}
	return auth, nil
}

// requireRole is requireAuth plus role membership. Super admins pass every
// check; asking for "admin" therefore admits both admin and super_admin.
// Returns ErrForbidden when the caller's role is not in the allowed set.
func requireRole(ctx context.Context, roles ...string) (AuthContext, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return AuthContext{}, err
	}
	if auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin) {
		return auth, nil
	}
	for _, role := range roles {
		if auth.Role == role {
			return auth, nil
		}
	}
	return AuthContext{}, ErrForbidden
}

// requireSuperAdmin is requireAuth restricted to platform super admins. Unlike
// requireRole (which lets super admins through any role check but also admits
// the named tenant roles), this rejects tenant admins outright. Use it for
// platform-wide, cross-tenant resolvers.
func requireSuperAdmin(ctx context.Context) (AuthContext, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return AuthContext{}, err
	}
	if auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin) {
		return auth, nil
	}
	return AuthContext{}, ErrForbidden
}

// Role name constants reused by resolvers, sourced from the models package so
// the GraphQL layer never drifts from the canonical role names.
const (
	roleAdmin   = string(models.RoleAdmin)
	roleTeacher = string(models.RoleTeacher)
	roleStudent = string(models.RoleStudent)
	roleStaff   = string(models.RoleStaff)
)
