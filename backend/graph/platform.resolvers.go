package graph

// Super-admin platform analytics resolver. Net-new surface area, so it lives in
// GraphQL (per project conventions) rather than the older super-admin REST.

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// PlatformAnalytics is the resolver for the `platformAnalytics` query. It powers
// the super-admin dashboard with platform-wide figures (tenants, people,
// subscriptions, quota), all scoped to exclude the internal platform tenant.
//
// The snapshot is built from a handful of set-based queries to avoid an N+1
// over tenants: one tenant scan, two grouped head-count queries, one user
// count, and one subscription load with plans and tenants preloaded. The
// aggregation itself lives in platform_helpers.go.
func (r *queryResolver) PlatformAnalytics(ctx context.Context) (*model.PlatformAnalytics, error) {
	if _, err := requireSuperAdmin(ctx); err != nil {
		return nil, err
	}
	db := r.DB.WithContext(ctx)
	now := time.Now()

	// All customer tenants drive the counts, growth series, type mix, and names.
	var tenants []models.Tenant
	db.Where("id <> ?", models.PlatformTenantID).Find(&tenants)

	// Per-tenant head counts, shared by the People and Quota sections.
	studentsByTenant := headcountByTenant(db, &models.Student{})
	employeesByTenant := headcountByTenant(db, &models.Employee{})

	var userCount int64
	db.Model(&models.User{}).
		Where("tenant_id <> ?", models.PlatformTenantID).
		Count(&userCount)

	// One subscription per tenant (unique index); preload Plan for pricing and
	// limits, Tenant for breach labels.
	var subs []models.TenantSubscription
	db.Preload("Plan").Preload("Tenant").
		Where("tenant_id <> ?", models.PlatformTenantID).
		Find(&subs)

	return &model.PlatformAnalytics{
		Tenants:       tenantStatsFrom(tenants, now),
		People:        peopleStatsFrom(tenants, studentsByTenant, employeesByTenant, int(userCount)),
		Subscriptions: subscriptionStatsFrom(subs, len(tenants), now),
		Quota:         quotaStatsFrom(subs, studentsByTenant, employeesByTenant),
		GeneratedAt:   now.Format(time.RFC3339),
	}, nil
}
