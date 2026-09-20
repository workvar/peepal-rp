// Response shape for the PLATFORM_ANALYTICS query. Kept in lockstep with the
// backend model (backend/graph/model/models_gen.go).

export interface TenantGrowthPoint {
  month: string; // YYYY-MM
  created: number;
  cumulative: number;
}

export interface TenantTypeCount {
  type: string;
  count: number;
}

export interface PlatformTenantStats {
  total: number;
  active: number;
  suspended: number;
  newThisMonth: number;
  growth: TenantGrowthPoint[];
  byType: TenantTypeCount[];
}

export interface TenantPeopleCount {
  tenantId: string;
  tenantName: string;
  students: number;
  employees: number;
}

export interface PlatformPeopleStats {
  students: number;
  employees: number;
  users: number;
  topTenants: TenantPeopleCount[];
}

export interface PlanCount {
  planId: string;
  planName: string;
  tenants: number;
  priceMonthly: number;
}

export interface SubStatusCount {
  status: string;
  count: number;
}

export interface PlatformSubscriptionStats {
  active: number;
  unsubscribed: number;
  expiringSoon: number;
  estimatedMrr: number;
  byPlan: PlanCount[];
  byStatus: SubStatusCount[];
}

export interface TenantQuotaBreach {
  tenantId: string;
  tenantName: string;
  resource: string; // students | employees
  limit: number;
  current: number;
  overBy: number;
}

export interface PlatformQuotaStats {
  overQuota: number;
  studentUsage: number;
  studentLimit: number;
  employeeUsage: number;
  employeeLimit: number;
  breaches: TenantQuotaBreach[];
}

export interface PlatformAnalytics {
  generatedAt: string;
  tenants: PlatformTenantStats;
  people: PlatformPeopleStats;
  subscriptions: PlatformSubscriptionStats;
  quota: PlatformQuotaStats;
}

export interface PlatformAnalyticsData {
  platformAnalytics: PlatformAnalytics;
}
