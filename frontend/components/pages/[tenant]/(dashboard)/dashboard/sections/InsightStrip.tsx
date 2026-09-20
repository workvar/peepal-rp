"use client";

import { TrendingUp, GraduationCap, Wallet, Banknote } from "lucide-react";
import { useAccess } from "@/lib/useAccess";
import { compactMoney } from "../analytics/format";
import type { DashboardAnalytics } from "../analytics/types";
import { useTerminology } from "@/store/hooks/useTerminology";

/**
 * A row of KPI highlight tiles derived from the analytics queries.
 *
 * The Pass Rate and Fees tiles are education-only; they drop out for other
 * verticals because canViewHref denies /marks and /fees outside education.
 */
export default function InsightStrip({ data }: { data: DashboardAnalytics }) {
  const { canViewHref } = useAccess();
  const term = useTerminology();

  const tiles = [
    {
      path: "/attendance",
      label: `Avg ${term.attendance}`,
      value: `${data.attendance.avgPercentage.toFixed(0)}%`,
      sub: "Last 14 days",
      icon: TrendingUp,
      color: "var(--color-category-blue)",
    },
    {
      path: "/marks",
      label: "Pass Rate",
      value: `${data.marks.passRate.toFixed(0)}%`,
      sub: "Across assessments",
      icon: GraduationCap,
      color: "var(--color-category-purple)",
    },
    {
      path: "/fees",
      label: "Fees Collected",
      value: `₹${compactMoney(data.fees.totalCollected)}`,
      sub: `${data.fees.paymentCount} payments`,
      icon: Wallet,
      color: "var(--color-category-green)",
    },
    {
      path: "/payroll",
      label: "Net Payroll",
      value: `₹${compactMoney(data.payroll.totalNet)}`,
      sub: `${data.payroll.totalEmployees} employees`,
      icon: Banknote,
      color: "var(--color-category-indigo)",
    },
  ].filter((t) => canViewHref(t.path));

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
          >
            <div
              className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08]"
              style={{ background: t.color }}
            />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${t.color}1A`, color: t.color }}
            >
              <Icon size={17} />
            </div>
            <p className="mt-3 text-2xl font-bold leading-none text-foreground tabular-nums">{t.value}</p>
            <p className="mt-1.5 text-xs font-medium text-foreground">{t.label}</p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
