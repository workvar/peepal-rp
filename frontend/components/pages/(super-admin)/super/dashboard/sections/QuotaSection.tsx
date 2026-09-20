"use client";

import ChartCard from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/ChartCard";
import EmptyChart from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/EmptyChart";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/components/pages/[tenant]/(dashboard)/dashboard/analytics/format";
import UsageBar from "./UsageBar";
import type { PlatformQuotaStats } from "../types";

// Quota & usage: aggregate capacity bars plus the list of breaching orgs.
export default function QuotaSection({ quota }: { quota: PlatformQuotaStats }) {
  const noLimits = quota.studentLimit === 0 && quota.employeeLimit === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Capacity Usage" subtitle="Aggregate usage vs metered limits">
        <div className="space-y-4 pt-1">
          <UsageBar
            label="Students"
            current={quota.studentUsage}
            limit={quota.studentLimit}
            color="var(--color-category-purple)"
          />
          <UsageBar
            label="Employees"
            current={quota.employeeUsage}
            limit={quota.employeeLimit}
            color="var(--color-category-pink)"
          />
          {noLimits && (
            <p className="text-xs text-muted-foreground">No metered limits configured yet.</p>
          )}
        </div>
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Quota Breaches"
        subtitle={`${quota.overQuota} organisation${quota.overQuota === 1 ? "" : "s"} over capacity`}
      >
        {quota.breaches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Organisation</th>
                  <th className="py-2 px-3 font-medium">Resource</th>
                  <th className="py-2 px-3 font-medium text-right">Usage</th>
                  <th className="py-2 pl-3 font-medium text-right">Over by</th>
                </tr>
              </thead>
              <tbody>
                {quota.breaches.map((b, i) => (
                  <tr
                    key={`${b.tenantId}-${b.resource}-${i}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 pr-3 text-foreground">{b.tenantName}</td>
                    <td className="py-2 px-3">
                      <Badge variant="gray" label={titleCase(b.resource)} />
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                      {b.current.toLocaleString()} / {b.limit.toLocaleString()}
                    </td>
                    <td
                      className="py-2 pl-3 text-right tabular-nums font-semibold"
                      style={{ color: "var(--color-category-red)" }}
                    >
                      +{b.overBy.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart
            message="All within capacity"
            hint="No organisation is over its student or employee quota."
            height={200}
          />
        )}
      </ChartCard>
    </div>
  );
}
