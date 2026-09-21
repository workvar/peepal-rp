"use client";

import { TrendingUp, GraduationCap, Wallet, Banknote, ClipboardPlus, DoorOpen, BedDouble } from "lucide-react";
import { useAccess } from "@/lib/useAccess";
import { compactMoney } from "../analytics/format";
import type { DashboardAnalytics } from "../analytics/types";
import { useTerminology } from "@/store/hooks/useTerminology";

interface ClinicalStats {
  todayOpd?: number;
  openOpd?: number;
  activeAdmissions?: number;
  occupiedBeds?: number;
  availableBeds?: number;
}

/**
 * A row of KPI highlight tiles derived from the analytics queries plus
 * clinical dashboard counts.
 *
 * Education-only tiles (Pass Rate, Fees) drop out via canViewHref on /marks
 * and /fees. Healthcare tiles bind to /encounters, /ipd, /wards so they
 * actually appear for a hospital instead of hiding behind /students.
 */
export default function InsightStrip({
  data,
  stats = {},
}: {
  data: DashboardAnalytics;
  stats?: ClinicalStats;
}) {
  const { canViewHref } = useAccess();
  const term = useTerminology();

  const bedTotal = (stats.occupiedBeds ?? 0) + (stats.availableBeds ?? 0);
  const occupancy = bedTotal > 0 ? Math.round(((stats.occupiedBeds ?? 0) / bedTotal) * 100) : 0;

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
      path: "/encounters",
      label: "OPD today",
      value: String(stats.todayOpd ?? 0),
      sub: stats.openOpd ? `${stats.openOpd} still open` : "Visits recorded",
      icon: ClipboardPlus,
      color: "var(--color-category-blue)",
    },
    {
      path: "/ipd",
      label: "IPD occupancy",
      value: String(stats.activeAdmissions ?? 0),
      sub: "Currently admitted",
      icon: DoorOpen,
      color: "var(--color-category-orange)",
    },
    {
      path: "/wards",
      label: "Bed occupancy",
      value: `${occupancy}%`,
      sub: `${stats.occupiedBeds ?? 0} of ${bedTotal} beds`,
      icon: BedDouble,
      color: "var(--color-category-red)",
    },
    {
      path: "/payroll",
      label: "Net Payroll",
      value: `₹${compactMoney(data.payroll.totalNet)}`,
      sub: `${data.payroll.totalEmployees} employees`,
      icon: Banknote,
      color: "var(--color-category-indigo)",
    },
  ].filter((tile) => canViewHref(tile.path));

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
          >
            <div
              className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08]"
              style={{ background: tile.color }}
            />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${tile.color}1A`, color: tile.color }}
            >
              <Icon size={17} />
            </div>
            <p className="mt-3 text-2xl font-bold leading-none text-foreground tabular-nums">{tile.value}</p>
            <p className="mt-1.5 text-xs font-medium text-foreground">{tile.label}</p>
            <p className="text-[11px] text-muted-foreground">{tile.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
