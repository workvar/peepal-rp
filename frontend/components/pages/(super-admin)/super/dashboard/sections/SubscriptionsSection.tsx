"use client";

import ChartCard from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/ChartCard";
import EmptyChart from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/EmptyChart";
import DonutChart from "@/components/pages/[tenant]/(dashboard)/dashboard/charts/DonutChart";
import { Badge } from "@/components/ui/badge";
import {
  compactMoney,
  titleCase,
} from "@/components/pages/[tenant]/(dashboard)/dashboard/analytics/format";
import type { PlatformSubscriptionStats } from "../types";

const STATUS_VARIANT: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
  active: "green",
  trial: "blue",
  suspended: "yellow",
  expired: "red",
};

// Subscriptions & revenue: plan mix, billing status, MRR, and a per-plan list.
export default function SubscriptionsSection({
  subscriptions,
}: {
  subscriptions: PlatformSubscriptionStats;
}) {
  const planMix = subscriptions.byPlan.map((p) => ({ label: p.planName, value: p.tenants }));

  const tiles = [
    { label: "Active", value: subscriptions.active, color: "var(--color-category-green)" },
    { label: "Expiring 30d", value: subscriptions.expiringSoon, color: "var(--color-category-orange)" },
    { label: "No plan", value: subscriptions.unsubscribed, color: "var(--color-category-red)" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Plan Mix" subtitle="Organisations per plan">
        {planMix.length > 0 ? (
          <DonutChart data={planMix} height={220} />
        ) : (
          <EmptyChart message="No subscriptions yet" height={220} />
        )}
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Subscriptions"
        subtitle={`₹${compactMoney(subscriptions.estimatedMrr)} estimated MRR`}
      >
        <div className="grid grid-cols-3 gap-3 mb-4">
          {tiles.map((m) => (
            <div key={m.label} className="rounded-xl border border-border p-3">
              <p className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>
                {m.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {subscriptions.byStatus.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subscriptions.byStatus.map((s) => (
              <Badge
                key={s.status}
                variant={STATUS_VARIANT[s.status] ?? "gray"}
                label={`${titleCase(s.status)} · ${s.count}`}
              />
            ))}
          </div>
        )}

        {subscriptions.byPlan.length > 0 ? (
          <div className="space-y-1.5">
            {subscriptions.byPlan.map((p) => (
              <div key={p.planId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.planName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.tenants} org{p.tenants === 1 ? "" : "s"} · ₹{compactMoney(p.priceMonthly)}/mo
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No plans assigned yet.</p>
        )}
      </ChartCard>
    </div>
  );
}
