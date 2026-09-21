"use client";

import {
  Users, GraduationCap, Briefcase, Clock,
  CheckCircle, XCircle, Bell, HeartPulse,
  ClipboardPlus, DoorOpen, BedDouble, CalendarCheck,
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
  patients?: number;
  todayAppointments?: number;
  todayOpd?: number;
  openOpd?: number;
  activeAdmissions?: number;
  occupiedBeds?: number;
  availableBeds?: number;
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
  // Clinical tiles bind to /patients, /encounters, /ipd — not /students with
  // a relabelled "Patients" heading, which healthcare industry-gating then
  // hid even though those modules already existed.
  const tiles: StatTile[] = [
    { label: t.member_plural, value: stats.students ?? 0,      icon: GraduationCap, color: "var(--color-category-blue)",   path: "/students",  trend: "Enrolled" },
    { label: "Patients",      value: stats.patients ?? 0,      icon: HeartPulse,    color: "var(--color-category-red)",    path: "/patients",  trend: "Registered" },
    { label: "Employees",     value: stats.employees ?? 0,     icon: Briefcase,     color: "var(--color-category-pink)",   path: "/employees", trend: "On staff" },
    { label: t.staff_plural,  value: stats.teachers ?? 0,      icon: Users,         color: "var(--color-category-teal)",   path: "/employees", trend: t.staff_plural },
    { label: "Total Users",   value: stats.users ?? 0,         icon: Users,         color: "var(--color-category-indigo)", path: "/employees", trend: "Accounts" },
    { label: "Appointments today", value: stats.todayAppointments ?? 0, icon: CalendarCheck, color: "var(--color-category-teal)", path: "/appointments", trend: "Scheduled" },
    { label: "OPD today",     value: stats.todayOpd ?? 0,      icon: ClipboardPlus, color: "var(--color-category-blue)",   path: "/encounters", trend: stats.openOpd ? `${stats.openOpd} open` : "Visits" },
    { label: "IPD admitted",  value: stats.activeAdmissions ?? 0, icon: DoorOpen,  color: "var(--color-category-orange)", path: "/ipd",        trend: "In ward" },
    { label: "Beds occupied", value: stats.occupiedBeds ?? 0,  icon: BedDouble,     color: "var(--color-category-red)",    path: "/wards",     trend: `${stats.availableBeds ?? 0} free` },
    { label: "Present Today", value: stats.todayPresent ?? 0,  icon: CheckCircle,   color: "var(--color-category-green)",  path: "/attendance", spark: presentSpark },
    { label: "Absent Today",  value: stats.todayAbsent ?? 0,   icon: XCircle,       color: "var(--color-category-red)",    path: "/attendance", spark: absentSpark },
    { label: "Pending Leaves", value: stats.pendingLeaves ?? 0, icon: Clock,        color: "var(--color-category-orange)", path: "/leaves",    trend: "Awaiting action" },
    { label: "Draft Payrolls", value: stats.pendingPayrolls ?? 0, icon: Bell,       color: "var(--color-category-purple)", path: "/payroll",   trend: "To process" },
  ].filter((tile) => canViewHref(tile.path));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <StatCard
          key={`${tile.path}-${tile.label}`}
          label={tile.label}
          value={tile.value}
          icon={tile.icon}
          color={tile.color}
          href={tenantHref(tile.path)}
          trend={tile.trend}
          spark={tile.spark}
        />
      ))}
    </div>
  );
}
