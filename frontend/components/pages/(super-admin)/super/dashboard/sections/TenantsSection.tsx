"use client";

import ChartCard from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/ChartCard";
import EmptyChart from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/EmptyChart";
import LineChart from "@/components/pages/[tenant]/(dashboard)/dashboard/charts/LineChart";
import DonutChart from "@/components/pages/[tenant]/(dashboard)/dashboard/charts/DonutChart";
import {
  monthLabel,
  titleCase,
} from "@/components/pages/[tenant]/(dashboard)/dashboard/analytics/format";
import type { PlatformTenantStats } from "../types";

// Tenants & growth: a cumulative growth line plus the organisation type mix.
export default function TenantsSection({ tenants }: { tenants: PlatformTenantStats }) {
  const growth = tenants.growth.map((g) => ({ label: monthLabel(g.month), value: g.cumulative }));
  const hasGrowth = tenants.growth.some((g) => g.cumulative > 0);
  const byType = tenants.byType.map((t) => ({ label: titleCase(t.type), value: t.count }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-2"
        title="Organisation Growth"
        subtitle="Cumulative organisations, last 12 months"
      >
        {hasGrowth ? (
          <LineChart data={growth} color="var(--color-category-blue)" height={240} />
        ) : (
          <EmptyChart
            message="No organisations yet"
            hint="Growth appears here as you onboard organisations."
            height={240}
          />
        )}
      </ChartCard>

      <ChartCard title="By Type" subtitle="Organisation mix">
        {byType.length > 0 ? (
          <DonutChart data={byType} height={240} />
        ) : (
          <EmptyChart message="No data yet" height={240} />
        )}
      </ChartCard>
    </div>
  );
}
