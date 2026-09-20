"use client";

import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import StatCard from "@/components/pages/[tenant]/(dashboard)/dashboard/sections/StatCard";
import { compactMoney } from "@/components/pages/[tenant]/(dashboard)/dashboard/analytics/format";
import type { PlatformAnalytics } from "../types";

// Headline KPIs across the four metric groups. Reuses the generic StatCard.
export default function KpiStrip({ a }: { a: PlatformAnalytics }) {
  const cards = [
    {
      label: "Total Organisations",
      value: a.tenants.total,
      icon: Building2,
      color: "var(--color-category-blue)",
      href: "/super/tenants",
      trend: `+${a.tenants.newThisMonth} this month`,
    },
    {
      label: "Active",
      value: a.tenants.active,
      icon: CheckCircle2,
      color: "var(--color-category-green)",
      trend: `${a.tenants.suspended} suspended`,
    },
    {
      label: "Students",
      value: a.people.students.toLocaleString(),
      icon: GraduationCap,
      color: "var(--color-category-purple)",
      trend: "All organisations",
    },
    {
      label: "Employees",
      value: a.people.employees.toLocaleString(),
      icon: Briefcase,
      color: "var(--color-category-pink)",
      trend: "All organisations",
    },
    {
      label: "Est. MRR",
      value: `₹${compactMoney(a.subscriptions.estimatedMrr)}`,
      icon: Wallet,
      color: "var(--color-category-teal)",
      href: "/super/subscriptions",
      trend: `${a.subscriptions.active} active`,
    },
    {
      label: "Over Quota",
      value: a.quota.overQuota,
      icon: AlertTriangle,
      color: "var(--color-category-orange)",
      href: "/super/subscriptions",
      trend: "Needs attention",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <StatCard
          key={c.label}
          label={c.label}
          value={c.value}
          icon={c.icon}
          color={c.color}
          href={c.href}
          trend={c.trend}
        />
      ))}
    </div>
  );
}
