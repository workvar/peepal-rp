package models

import "gorm.io/gorm"

// Subscription quota helpers.
//
// These functions translate a tenant's subscription (plan limits + overrides)
// into concrete decisions used across the app:
//   - login gating (SubscriptionLoginAllowed)
//   - the persistent over-quota banner (TenantQuotaSnapshot)
//   - create-time enforcement (ResourceAtLimit)
//
// They live in the models package and take an explicit *gorm.DB so both the
// REST handlers and the GraphQL resolvers can call them without an import cycle
// (the database package imports models, never the reverse).

// Canonical quota resource keys. These are returned to the client as-is; the
// frontend maps them to tenant terminology (e.g. "Members" for students).
const (
	QuotaStudents  = "students"
	QuotaEmployees = "employees"
)

// QuotaBreach describes one limit a tenant has exceeded.
type QuotaBreach struct {
	Resource string `json:"resource"` // "students" | "employees"
	Limit    int    `json:"limit"`    // effective max from the subscription
	Current  int    `json:"current"`  // current usage
	OverBy   int    `json:"over_by"`  // current - limit (always > 0 here)
}

// QuotaSnapshot is a tenant's full usage-vs-limits picture, used by the banner.
type QuotaSnapshot struct {
	HasSubscription bool          `json:"has_subscription"`
	Status          string        `json:"status"` // active|trial|suspended|expired|"" (none)
	Students        int           `json:"students"`
	Employees       int           `json:"employees"`
	MaxStudents     int           `json:"max_students"`
	MaxEmployees    int           `json:"max_employees"`
	Breaches        []QuotaBreach `json:"breaches"`
}

// TenantQuotaSnapshot loads the tenant's subscription (if any), counts current
// usage, resolves effective limits, and lists every breached quota. A limit of
// 0 or less is treated as "unlimited" and never produces a breach.
func TenantQuotaSnapshot(db *gorm.DB, tenantID string) QuotaSnapshot {
	snap := QuotaSnapshot{Breaches: []QuotaBreach{}}

	var students, employees int64
	db.Model(&Student{}).Where("tenant_id = ?", tenantID).Count(&students)
	db.Model(&Employee{}).Where("tenant_id = ?", tenantID).Count(&employees)
	snap.Students = int(students)
	snap.Employees = int(employees)

	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).Preload("Plan").First(&sub).Error; err != nil {
		return snap // no subscription assigned: nothing to compare against
	}
	snap.HasSubscription = true
	snap.Status = sub.Status
	snap.MaxStudents = sub.EffectiveMaxStudents()
	snap.MaxEmployees = sub.EffectiveMaxEmployees()

	if snap.MaxStudents > 0 && snap.Students > snap.MaxStudents {
		snap.Breaches = append(snap.Breaches, QuotaBreach{
			Resource: QuotaStudents, Limit: snap.MaxStudents,
			Current: snap.Students, OverBy: snap.Students - snap.MaxStudents,
		})
	}
	if snap.MaxEmployees > 0 && snap.Employees > snap.MaxEmployees {
		snap.Breaches = append(snap.Breaches, QuotaBreach{
			Resource: QuotaEmployees, Limit: snap.MaxEmployees,
			Current: snap.Employees, OverBy: snap.Employees - snap.MaxEmployees,
		})
	}
	return snap
}

// ResourceAtLimit reports whether the tenant is already at (or over) its limit
// for the given resource, so adding one more should be rejected. Returns
// (atLimit, current, limit). With no subscription or a 0/unlimited limit the
// caller is never blocked here (login gating handles the no-subscription case).
func ResourceAtLimit(db *gorm.DB, tenantID, resource string) (bool, int, int) {
	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).Preload("Plan").First(&sub).Error; err != nil {
		return false, 0, 0
	}

	var limit int
	var current int64
	switch resource {
	case QuotaStudents:
		limit = sub.EffectiveMaxStudents()
		db.Model(&Student{}).Where("tenant_id = ?", tenantID).Count(&current)
	case QuotaEmployees:
		limit = sub.EffectiveMaxEmployees()
		db.Model(&Employee{}).Where("tenant_id = ?", tenantID).Count(&current)
	default:
		return false, 0, 0
	}

	if limit <= 0 {
		return false, int(current), limit // unlimited
	}
	return int(current) >= limit, int(current), limit
}

// SubscriptionLoginAllowed reports whether a tenant's subscription state lets its
// members sign in. Login requires an assigned subscription whose status is
// active or trial; missing, suspended, or expired (or any unknown) status is
// blocked. The reason is a short machine code ("none"|"suspended"|"expired"|...)
// for logging; callers supply the user-facing message.
func SubscriptionLoginAllowed(db *gorm.DB, tenantID string) (bool, string) {
	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		return false, "none"
	}
	switch sub.Status {
	case "active", "trial":
		return true, ""
	default:
		return false, sub.Status // suspended, expired, or anything unexpected
	}
}
