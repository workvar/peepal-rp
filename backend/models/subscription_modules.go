package models

import (
	"strings"

	"gorm.io/gorm"
)

// Subscription module gating.
//
// A subscription's EffectiveModules() lists the coarse feature modules an org is
// entitled to (the 17 toggles a super-admin sees: attendance, marks, fees, …).
// The role access matrix, nav, and resolvers work in finer-grained module ids
// (fee-categories, reports-fees, salary-templates, …). This file maps the fine
// ids to their coarse subscription module so a feature an org didn't buy can be
// hidden and blocked everywhere.

// defaultPageMap maps a fine-grained access-matrix module id to the
// coarse subscription module that gates it. Access modules NOT listed here are
// "core" (users, org admin, profile, approvals, departments, academic-years,
// calendar, dashboard, …) and are never gated by the subscription — only by the
// role access matrix. Foundational config that other modules depend on
// (academic-years, departments) is deliberately left core.
var defaultPageMap = map[string]string{
	"employees": "employees",
	"students":  "students",

	"marks":   "marks",
	"results": "marks",

	"courses":    "academic",
	"subjects":   "academic",
	"exams":      "academic",
	"exam-types": "academic",
	"curriculum": "academic",
	"grading":    "academic",

	// Exam cell (Phase 5) rides on the same academic subscription module.
	"question-bank":   "academic",
	"question-papers": "academic",
	"hall-tickets":    "academic",
	"my-hall-tickets": "academic",

	"timetable": "timetable",

	"attendance":          "attendance",
	"attendance-summary":  "attendance",
	"attendance-shortage": "attendance",
	"attendance-export":   "attendance",

	"leaves":      "leaves",
	"leave-types": "leaves",

	// Duty roster piggybacks on the "employees" coarse module — there's no
	// standalone "hr" toggle, and a roster only makes sense once an org has
	// employees at all (mirrors how leaves/payroll gate on their own coarse
	// modules rather than a generic one).
	"duty-roster": "employees",

	"payroll":            "payroll",
	"salary-templates":   "payroll",
	"salary-assignments": "payroll",

	"fees":            "fees",
	"fee-structures":  "fees",
	"fee-dues":        "fees",
	"fee-categories":  "fees",
	"fee-addons":      "fees",
	"fee-allocations": "fees",
	"fee-students":    "fees",
	"fee-overview":    "fees",

	// Financial accounting (Phase 3): all four fine modules → coarse "finance".
	"chart-of-accounts":   "finance",
	"ledger":              "finance",
	"accounts-payable":    "finance",
	"accounts-receivable": "finance",

	"hostel":    "hostel",
	"transport": "transport",
	"library":   "library",
	"events":    "events",

	// Campus ops (Phase 6). The mess is provisioned and staffed alongside the
	// hostel, and live tracking is an extension of transport, so both ride on
	// the coarse module their parent feature already gates on rather than
	// introducing new super-admin toggles.
	"mess":            "hostel",
	"my-mess":         "hostel",
	"transport-live":  "transport",
	"assignments":     "academic",
	"my-assignments":  "academic",

	"announcements": "announcements",
	"notifications": "notifications",

	"patients":     "clinical",
	"appointments": "clinical",
	"encounters":   "clinical",
	"schedules":    "clinical",
	"laboratory":   "clinical",
	"radiology":    "clinical",
	"wards":        "clinical",
	"admissions":   "clinical",
	"nursing":      "clinical",
	"claims":       "clinical",
	"inventory":    "clinical",
	// Procurement is cross-industry: schools and hospitals both buy. Its own
	// coarse module so non-healthcare tenants can subscribe independently.
	"vendors":         "procurement",
	"purchase-orders": "procurement",
	"ot":              "clinical",
	"triage":          "clinical",
	"bloodbank":       "clinical",
	"ambulance":       "clinical",
	"dietary":         "clinical",
	"telemedicine":    "clinical",
	"referrals":       "clinical",
	"patient-portal":  "clinical",
	"my-schedule":     "clinical",
	"billing":         "billing",
	"pharmacy":        "pharmacy",

	"learning":             "learning",
	"learning-assignments": "learning",
	"my-learning":          "learning",

	"reports-attendance": "reports",
	"reports-marks":      "reports",
	"reports-fees":       "reports",
	"reports-payroll":    "reports",
	"reports-leaves":     "reports",
}

// SubscriptionModuleForAccess returns the coarse subscription module that gates
// the given access-matrix module, or "" when the module is core (never gated).
//
// It reads the live, super-admin-editable mapping cache (see module_config.go);
// before the cache is loaded (or when the DB has no mapping rows) it falls back
// to defaultPageMap so gating keeps working out of the box.
func SubscriptionModuleForAccess(accessModuleID string) string {
	moduleCfgMu.RLock()
	loaded, m := moduleCfgLoaded, cachedPageMap
	moduleCfgMu.RUnlock()
	if loaded && m != nil {
		return m[accessModuleID]
	}
	return defaultPageMap[accessModuleID]
}

// TenantEnabledModuleSet returns the set of coarse subscription modules the
// tenant is entitled to (EffectiveModules: per-tenant override, else the plan's
// modules). The bool is false when the tenant has no subscription at all — in
// that case callers should impose no module restriction, since login gating
// already blocks the no-subscription case.
func TenantEnabledModuleSet(db *gorm.DB, tenantID string) (map[string]bool, bool) {
	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).Preload("Plan").First(&sub).Error; err != nil {
		return nil, false
	}
	set := map[string]bool{}
	for _, m := range strings.Split(sub.EffectiveModules(), ",") {
		if m = strings.TrimSpace(m); m != "" {
			set[m] = true
		}
	}
	return set, true
}

// TenantAllowsAccessModule reports whether the tenant's subscription permits the
// given access-matrix module. Core modules (not subscription-gated) always pass,
// as do all modules when the tenant has no subscription row.
func TenantAllowsAccessModule(db *gorm.DB, tenantID, accessModuleID string) bool {
	coarse := SubscriptionModuleForAccess(accessModuleID)
	if coarse == "" {
		return true // core module: never gated by the subscription
	}
	set, ok := TenantEnabledModuleSet(db, tenantID)
	if !ok {
		return true // no subscription: don't restrict (login gate handles it)
	}
	return set[coarse]
}
