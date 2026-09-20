"use client";

import {
  Users, GraduationCap, Briefcase, Clock,
  CheckCircle, XCircle, Bell,
} from "lucide-react";
import StatCard, { type StatCardProps } from "./StatCard";
import { useAccess } from "@/lib/useAccess";
import { useTerminology } from "@/store/hooks/useTerminology";

interface Stats {
  students?: number;
  employees?: number;
  teachers?: number;
  users?: number;
  todayPresent?: number;
  todayAbsent?: number;
  pendingLeaves?: number;
  pendingPayrolls?: number;
}

// A stat tile plus the module path it links to (used for access filtering).
type StatTile = Omit<StatCardProps, "href"> & { path: string };

export default function StatsGrid({
  stats,
  presentSpark = [],
  absentSpark = [],
  tenantHref,
}: {
  stats: Stats;
  presentSpark?: number[];
  absentSpark?: number[];
  tenantHref: (p: string) => string;
}) {
  const { canViewHref } = useAccess();
  const t = useTerminology();

  // Hide tiles whose module the org isn't subscribed to (or the role can't
  // view), so the dashboard never surfaces an excluded module like Payroll.
  // Labels come from terminology so a hospital reads "Clinicians", not
  // "Teachers", on the tiles backed by shared modules.
  const tiles: StatTile[] = [
    { label: t.member_plural, value: stats.students ?? 0,      icon: GraduationCap, color: "var(--color-category-blue)",   path: "/students",  trend: "Enrolled" },
    { label: "Employees",     value: stats.employees ?? 0,     icon: Briefcase,     color: "var(--color-category-pink)",   path: "/employees", trend: "On staff" },
    { label: t.staff_plural,  value: stats.teachers ?? 0,      icon: Users,         color: "var(--color-category-teal)",   path: "/employees", trend: t.staff_plural },
    { label: "Total Users",   value: stats.users ?? 0,         icon: Users,         color: "var(--color-category-indigo)", path: "/employees", trend: "Accounts" },
    { label: "Present Today", value: stats.todayPresent ?? 0,  icon: CheckCircle,   color: "var(--color-category-green)",  path: "/attendance", spark: presentSpark },
    { label: "Absent Today",  value: stats.todayAbsent ?? 0,   icon: XCircle,       color: "var(--color-category-red)",    path: "/attendance", spark: absentSpark },
    { label: "Pending Leaves", value: stats.pendingLeaves ?? 0, icon: Clock,        color: "var(--color-category-orange)", path: "/leaves",    trend: "Awaiting action" },
    { label: "Draft Payrolls", value: stats.pendingPayrolls ?? 0, icon: Bell,       color: "var(--color-category-purple)", path: "/payroll",   trend: "To process" },
  ].filter((t) => canViewHref(t.path));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <StatCard
          key={t.label}
          label={t.label}
          value={t.value}
          icon={t.icon}
          color={t.color}
          href={tenantHref(t.path)}
          trend={t.trend}
          spark={t.spark}
        />
      ))}
    </div>
  );
}
