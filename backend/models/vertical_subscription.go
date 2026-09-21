package models

import (
	"time"

	"gorm.io/gorm"
)

// DefaultPlanNameFor is the built-in plan that matches a tenant's industry.
// Corporate and nonprofit have no dedicated seeded plan; callers treat an
// empty result as "leave the subscription alone".
func DefaultPlanNameFor(t TenantType) string {
	switch t.Canonical() {
	case TenantTypeHealthcare:
		return "Hospital"
	case TenantTypeEducation:
		return "Education"
	default:
		return ""
	}
}

// builtInVerticalPlan reports whether a plan is one of the two industry
// starters seeded by SeedDefaultPlans. Only those are safe to auto-swap when
// a super-admin changes tenant type — a custom "Premium" plan is left as-is.
func builtInVerticalPlan(name string) bool {
	return name == "Education" || name == "Hospital"
}

// EnsureVerticalSubscription assigns (or swaps onto) the built-in plan that
// matches the tenant's industry so a hospital is not stuck on the Education
// module set (Students / Fees / Marks) after its type is set to healthcare.
//
// Rules:
//   - No matching built-in plan for this vertical → no-op.
//   - No subscription row yet → create an active one on the matching plan.
//   - Existing plan is the matching one already → no-op.
//   - Existing plan is the other built-in vertical (Education ↔ Hospital) →
//     swap onto the matching plan and clear any module override so the new
//     plan's modules take effect.
//   - Existing plan is custom → leave it. Super-admins who hand-picked a
//     plan keep that choice.
func EnsureVerticalSubscription(db *gorm.DB, tenantID string, t TenantType) {
	planName := DefaultPlanNameFor(t)
	if planName == "" || tenantID == "" {
		return
	}

	var plan SubscriptionPlan
	if err := db.Where("name = ?", planName).First(&plan).Error; err != nil {
		return
	}

	var sub TenantSubscription
	err := db.Where("tenant_id = ?", tenantID).First(&sub).Error
	now := time.Now()
	if err != nil {
		_ = db.Create(&TenantSubscription{
			TenantID:      tenantID,
			PlanID:        plan.ID,
			BillingPeriod: "monthly",
			Status:        "active",
			StartDate:     now,
			EndDate:       now.AddDate(1, 0, 0),
		}).Error
		return
	}

	if sub.PlanID == plan.ID {
		return
	}

	var current SubscriptionPlan
	if err := db.First(&current, "id = ?", sub.PlanID).Error; err != nil {
		return
	}
	if !builtInVerticalPlan(current.Name) {
		return
	}

	sub.PlanID = plan.ID
	// Empty override = use the new plan's modules (clinical for Hospital,
	// students/fees for Education). Leaving a previous override would keep
	// the old vertical's module set in force.
	sub.ModulesOverride = ""
	_ = db.Save(&sub).Error
}

// SyncIndustryPresentation applies everything that has to move when a tenant
// is created as — or converted to — a given industry: system-role labels,
// ready-made custom roles, and the matching built-in subscription.
func SyncIndustryPresentation(db *gorm.DB, tenant *Tenant) {
	if tenant == nil {
		return
	}
	_ = SeedSystemRoles(db, tenant)
	_ = RelabelSystemRoles(db, tenant)
	_ = SeedDefaultRoles(db, tenant)
	EnsureVerticalSubscription(db, tenant.ID, tenant.Type)
}
