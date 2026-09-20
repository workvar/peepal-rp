package graph

// Unit tests for the pure platform-analytics aggregation helpers. These need no
// database: they operate on in-memory slices/maps, so they pin down the tricky
// arithmetic (growth cumulation, type canonicalisation, MRR normalisation,
// quota breach detection) independently of GORM.

import (
	"math"
	"testing"
	"time"

	"collegeerp/models"
)

func mkTenant(id, name string, typ models.TenantType, status models.TenantStatus, created time.Time) models.Tenant {
	return models.Tenant{ID: id, Name: name, Type: typ, Status: status, CreatedAt: created}
}

func TestTenantStatsFrom(t *testing.T) {
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	tenants := []models.Tenant{
		mkTenant("t1", "Alpha", models.TenantTypeEducation, models.TenantActive, time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)),
		mkTenant("t2", "Beta", models.TenantTypeCorporate, models.TenantSuspended, time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC)),
		mkTenant("t3", "Gamma", models.TenantTypeCollege, models.TenantActive, time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)),     // legacy -> education
		mkTenant("t4", "Delta", models.TenantTypeEnterprise, models.TenantActive, time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)), // legacy -> corporate
	}

	got := tenantStatsFrom(tenants, now)

	if got.Total != 4 || got.Active != 3 || got.Suspended != 1 {
		t.Fatalf("counts: total=%d active=%d suspended=%d, want 4/3/1", got.Total, got.Active, got.Suspended)
	}
	if got.NewThisMonth != 2 {
		t.Errorf("newThisMonth=%d, want 2 (t1,t4)", got.NewThisMonth)
	}
	if len(got.Growth) != 12 {
		t.Fatalf("growth len=%d, want 12", len(got.Growth))
	}
	last := got.Growth[11]
	if last.Month != "2026-06" || last.Created != 2 || last.Cumulative != 4 {
		t.Errorf("last growth=%+v, want {2026-06 created=2 cumulative=4}", *last)
	}
	// Legacy aliases must collapse: education=2 (t1,t3), corporate=2 (t2,t4).
	byType := map[string]int{}
	for _, b := range got.ByType {
		byType[b.Type] = b.Count
	}
	if byType["education"] != 2 || byType["corporate"] != 2 {
		t.Errorf("byType=%v, want education=2 corporate=2", byType)
	}
}

func TestSubscriptionStatsFrom(t *testing.T) {
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	planA := models.SubscriptionPlan{ID: "A", Name: "Starter", PriceMonthly: 1000, PriceAnnually: 10000}
	planB := models.SubscriptionPlan{ID: "B", Name: "Pro", PriceMonthly: 5000, PriceAnnually: 50000}

	subs := []models.TenantSubscription{
		{TenantID: "t1", PlanID: "A", Plan: planA, Status: "active", BillingPeriod: "monthly", EndDate: now.AddDate(0, 0, 10)},
		{TenantID: "t2", PlanID: "B", Plan: planB, Status: "trial", BillingPeriod: "annual", EndDate: now.AddDate(0, 0, 100)},
		{TenantID: "t3", PlanID: "A", Plan: planA, Status: "expired", BillingPeriod: "monthly"},
	}

	got := subscriptionStatsFrom(subs, 4, now)

	if got.Active != 2 {
		t.Errorf("active=%d, want 2", got.Active)
	}
	if got.Unsubscribed != 1 {
		t.Errorf("unsubscribed=%d, want 1 (4 tenants - 3 subs)", got.Unsubscribed)
	}
	if got.ExpiringSoon != 1 {
		t.Errorf("expiringSoon=%d, want 1 (only t1 within 30d)", got.ExpiringSoon)
	}
	wantMRR := 1000.0 + 50000.0/12.0 // monthly + annual normalised
	if math.Abs(got.EstimatedMrr-wantMRR) > 0.01 {
		t.Errorf("estimatedMrr=%.2f, want %.2f", got.EstimatedMrr, wantMRR)
	}
	byPlan := map[string]int{}
	for _, p := range got.ByPlan {
		byPlan[p.PlanName] = p.Tenants
	}
	if byPlan["Starter"] != 2 || byPlan["Pro"] != 1 {
		t.Errorf("byPlan=%v, want Starter=2 Pro=1", byPlan)
	}
}

func TestQuotaStatsFrom(t *testing.T) {
	planA := models.SubscriptionPlan{ID: "A", Name: "Starter", MaxStudents: 100, MaxEmployees: 10}
	planB := models.SubscriptionPlan{ID: "B", Name: "Pro", MaxStudents: 0, MaxEmployees: 50} // 0 students = unlimited

	subs := []models.TenantSubscription{
		{TenantID: "t1", PlanID: "A", Plan: planA, Tenant: models.Tenant{Name: "Alpha"}},
		{TenantID: "t2", PlanID: "B", Plan: planB, Tenant: models.Tenant{Name: "Beta"}},
		{TenantID: "t3", PlanID: "A", Plan: planA, Tenant: models.Tenant{Name: "Gamma"}},
	}
	studentsByTenant := map[string]int{"t1": 120, "t2": 9999, "t3": 50}
	employeesByTenant := map[string]int{"t1": 5, "t2": 60, "t3": 10}

	got := quotaStatsFrom(subs, studentsByTenant, employeesByTenant)

	// t2's students are unlimited (limit 0) so excluded from usage/limit totals.
	if got.StudentUsage != 170 || got.StudentLimit != 200 {
		t.Errorf("students usage/limit = %d/%d, want 170/200", got.StudentUsage, got.StudentLimit)
	}
	if got.EmployeeUsage != 75 || got.EmployeeLimit != 70 {
		t.Errorf("employees usage/limit = %d/%d, want 75/70", got.EmployeeUsage, got.EmployeeLimit)
	}
	if got.OverQuota != 2 {
		t.Errorf("overQuota=%d, want 2 (t1 students, t2 employees)", got.OverQuota)
	}
	if len(got.Breaches) != 2 {
		t.Fatalf("breaches len=%d, want 2", len(got.Breaches))
	}
	// Sorted by overage desc: t1 students (over 20) before t2 employees (over 10).
	if got.Breaches[0].TenantName != "Alpha" || got.Breaches[0].Resource != models.QuotaStudents || got.Breaches[0].OverBy != 20 {
		t.Errorf("breach[0]=%+v, want Alpha/students/over=20", *got.Breaches[0])
	}
}

func TestPeopleStatsFrom(t *testing.T) {
	tenants := []models.Tenant{
		mkTenant("t1", "Alpha", models.TenantTypeEducation, models.TenantActive, time.Now()),
		mkTenant("t2", "Beta", models.TenantTypeCorporate, models.TenantActive, time.Now()),
		mkTenant("t3", "Gamma", models.TenantTypeEducation, models.TenantActive, time.Now()),
		mkTenant("t4", "Empty", models.TenantTypeEducation, models.TenantActive, time.Now()),
	}
	studentsByTenant := map[string]int{"t1": 120, "t3": 50}
	employeesByTenant := map[string]int{"t1": 5, "t2": 60, "t3": 10}

	got := peopleStatsFrom(tenants, studentsByTenant, employeesByTenant, 200)

	if got.Students != 170 || got.Employees != 75 || got.Users != 200 {
		t.Errorf("totals students=%d employees=%d users=%d, want 170/75/200", got.Students, got.Employees, got.Users)
	}
	// t4 has no people and must be dropped; t1 leads with 125 combined.
	if len(got.TopTenants) != 3 {
		t.Fatalf("topTenants len=%d, want 3 (t4 excluded)", len(got.TopTenants))
	}
	if got.TopTenants[0].TenantName != "Alpha" || got.TopTenants[0].Students+got.TopTenants[0].Employees != 125 {
		t.Errorf("topTenants[0]=%+v, want Alpha with 125 combined", *got.TopTenants[0])
	}
}
