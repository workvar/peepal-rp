package graph

// Pure aggregation helpers for the platform analytics resolver. They take
// already-loaded data (or a scoped *gorm.DB) and return GraphQL model structs,
// so the resolver in platform.resolvers.go stays a thin orchestrator and each
// concern (tenants, people, subscriptions, quota) is easy to read and test.

import (
	"sort"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// headcountByTenant returns tenant_id -> COUNT(*) for the given model, excluding
// the platform tenant. One grouped query instead of a count per tenant.
func headcountByTenant(db *gorm.DB, m interface{}) map[string]int {
	type row struct {
		TenantID string
		N        int
	}
	var rows []row
	db.Model(m).
		Select("tenant_id, COUNT(*) AS n").
		Where("tenant_id <> ?", models.PlatformTenantID).
		Group("tenant_id").
		Scan(&rows)

	out := make(map[string]int, len(rows))
	for _, r := range rows {
		out[r.TenantID] = r.N
	}
	return out
}

// tenantStatsFrom derives counts, a trailing 12-month growth series, and the
// type mix from the already-loaded tenant slice (no extra queries).
func tenantStatsFrom(tenants []models.Tenant, now time.Time) *model.PlatformTenantStats {
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	windowStart := monthStart.AddDate(0, -11, 0)
	curMonth := now.Format("2006-01")

	var active, suspended, newThisMonth, before int
	createdByMonth := map[string]int{}
	typeCounts := map[string]int{}

	for _, t := range tenants {
		switch t.Status {
		case models.TenantActive:
			active++
		case models.TenantSuspended:
			suspended++
		}
		typeCounts[string(t.Type.Canonical())]++

		m := t.CreatedAt.Format("2006-01")
		if m == curMonth {
			newThisMonth++
		}
		// Anything older than the window contributes to the cumulative baseline;
		// in-window signups are bucketed by month for the trend line.
		if t.CreatedAt.Before(windowStart) {
			before++
		} else {
			createdByMonth[m]++
		}
	}

	growth := make([]*model.TenantGrowthPoint, 0, 12)
	cumulative := before
	for i := 11; i >= 0; i-- {
		key := monthStart.AddDate(0, -i, 0).Format("2006-01")
		cumulative += createdByMonth[key]
		growth = append(growth, &model.TenantGrowthPoint{
			Month:      key,
			Created:    createdByMonth[key],
			Cumulative: cumulative,
		})
	}

	byType := make([]*model.TenantTypeCount, 0, len(typeCounts))
	for typ, cnt := range typeCounts {
		byType = append(byType, &model.TenantTypeCount{Type: typ, Count: cnt})
	}
	sort.Slice(byType, func(i, j int) bool { return byType[i].Count > byType[j].Count })

	return &model.PlatformTenantStats{
		Total:        len(tenants),
		Active:       active,
		Suspended:    suspended,
		NewThisMonth: newThisMonth,
		Growth:       growth,
		ByType:       byType,
	}
}

// peopleStatsFrom totals students/employees from the per-tenant head counts and
// ranks the largest tenants by combined headcount (top 8).
func peopleStatsFrom(tenants []models.Tenant, studentsByTenant, employeesByTenant map[string]int, users int) *model.PlatformPeopleStats {
	totalStudents, totalEmployees := 0, 0
	for _, n := range studentsByTenant {
		totalStudents += n
	}
	for _, n := range employeesByTenant {
		totalEmployees += n
	}

	top := make([]*model.TenantPeopleCount, 0, len(tenants))
	for _, t := range tenants {
		s, e := studentsByTenant[t.ID], employeesByTenant[t.ID]
		if s == 0 && e == 0 {
			continue
		}
		top = append(top, &model.TenantPeopleCount{
			TenantID: t.ID, TenantName: t.Name, Students: s, Employees: e,
		})
	}
	sort.Slice(top, func(i, j int) bool {
		return top[i].Students+top[i].Employees > top[j].Students+top[j].Employees
	})
	if len(top) > 8 {
		top = top[:8]
	}

	return &model.PlatformPeopleStats{
		Students:   totalStudents,
		Employees:  totalEmployees,
		Users:      users,
		TopTenants: top,
	}
}

// subscriptionStatsFrom derives plan mix, status breakdown, expiring count, and
// estimated MRR from the loaded subscriptions (Plan preloaded).
func subscriptionStatsFrom(subs []models.TenantSubscription, totalTenants int, now time.Time) *model.PlatformSubscriptionStats {
	soon := now.AddDate(0, 0, 30)

	var active, expiringSoon int
	var mrr float64
	statusCounts := map[string]int{}

	type planAgg struct {
		name  string
		price float64
		count int
	}
	planByID := map[string]*planAgg{}

	for i := range subs {
		s := &subs[i]
		status := s.Status
		if status == "" {
			status = "active"
		}
		statusCounts[status]++

		if status == "active" || status == "trial" {
			active++
			mrr += monthlyPrice(s)
			// Expiring soon: a real end date that lands within the next 30 days.
			if !s.EndDate.IsZero() && s.EndDate.After(now) && !s.EndDate.After(soon) {
				expiringSoon++
			}
		}

		agg := planByID[s.PlanID]
		if agg == nil {
			agg = &planAgg{name: planName(s), price: s.Plan.PriceMonthly}
			planByID[s.PlanID] = agg
		}
		agg.count++
	}

	byPlan := make([]*model.PlanCount, 0, len(planByID))
	for id, a := range planByID {
		byPlan = append(byPlan, &model.PlanCount{
			PlanID: id, PlanName: a.name, Tenants: a.count, PriceMonthly: a.price,
		})
	}
	sort.Slice(byPlan, func(i, j int) bool { return byPlan[i].Tenants > byPlan[j].Tenants })

	byStatus := make([]*model.SubStatusCount, 0, len(statusCounts))
	for st, c := range statusCounts {
		byStatus = append(byStatus, &model.SubStatusCount{Status: st, Count: c})
	}
	sort.Slice(byStatus, func(i, j int) bool { return byStatus[i].Count > byStatus[j].Count })

	// One subscription per tenant (unique index), so tenants without a row are
	// simply unsubscribed.
	unsubscribed := totalTenants - len(subs)
	if unsubscribed < 0 {
		unsubscribed = 0
	}

	return &model.PlatformSubscriptionStats{
		Active:       active,
		Unsubscribed: unsubscribed,
		ExpiringSoon: expiringSoon,
		EstimatedMrr: mrr,
		ByPlan:       byPlan,
		ByStatus:     byStatus,
	}
}

// quotaStatsFrom compares each tenant's head count against its effective limits
// (plan defaults + overrides), aggregating usage and listing breaches. Tenant
// names come from the preloaded Tenant association.
func quotaStatsFrom(subs []models.TenantSubscription, studentsByTenant, employeesByTenant map[string]int) *model.PlatformQuotaStats {
	var overQuota, studentUsage, studentLimit, employeeUsage, employeeLimit int
	breaches := make([]*model.TenantQuotaBreach, 0)

	for i := range subs {
		s := &subs[i]
		curStudents := studentsByTenant[s.TenantID]
		curEmployees := employeesByTenant[s.TenantID]
		maxStudents := s.EffectiveMaxStudents()
		maxEmployees := s.EffectiveMaxEmployees()
		over := false

		// A limit of 0 (or less) means unlimited, so it never counts toward
		// utilisation or a breach.
		if maxStudents > 0 {
			studentUsage += curStudents
			studentLimit += maxStudents
			if curStudents > maxStudents {
				over = true
				breaches = append(breaches, &model.TenantQuotaBreach{
					TenantID: s.TenantID, TenantName: tenantNameOf(s),
					Resource: models.QuotaStudents, Limit: maxStudents,
					Current: curStudents, OverBy: curStudents - maxStudents,
				})
			}
		}
		if maxEmployees > 0 {
			employeeUsage += curEmployees
			employeeLimit += maxEmployees
			if curEmployees > maxEmployees {
				over = true
				breaches = append(breaches, &model.TenantQuotaBreach{
					TenantID: s.TenantID, TenantName: tenantNameOf(s),
					Resource: models.QuotaEmployees, Limit: maxEmployees,
					Current: curEmployees, OverBy: curEmployees - maxEmployees,
				})
			}
		}
		if over {
			overQuota++
		}
	}

	sort.Slice(breaches, func(i, j int) bool { return breaches[i].OverBy > breaches[j].OverBy })
	if len(breaches) > 8 {
		breaches = breaches[:8]
	}

	return &model.PlatformQuotaStats{
		OverQuota:     overQuota,
		StudentUsage:  studentUsage,
		StudentLimit:  studentLimit,
		EmployeeUsage: employeeUsage,
		EmployeeLimit: employeeLimit,
		Breaches:      breaches,
	}
}

// monthlyPrice normalises a subscription's billing to a per-month figure so
// annual plans contribute comparably to MRR.
func monthlyPrice(s *models.TenantSubscription) float64 {
	if s.BillingPeriod == "annual" {
		if s.Plan.PriceAnnually > 0 {
			return s.Plan.PriceAnnually / 12
		}
		return s.Plan.PriceMonthly // fall back when no annual price is set
	}
	return s.Plan.PriceMonthly
}

func planName(s *models.TenantSubscription) string {
	if s.Plan.Name != "" {
		return s.Plan.Name
	}
	return "Unknown plan"
}

func tenantNameOf(s *models.TenantSubscription) string {
	if s.Tenant.Name != "" {
		return s.Tenant.Name
	}
	return "Unknown organisation"
}
