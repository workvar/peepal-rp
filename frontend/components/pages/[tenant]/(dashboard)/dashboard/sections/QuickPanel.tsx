"use client";

import Link from "next/link";
import { ChevronRight, SlidersHorizontal, Building2, UserPlus, CalendarCheck, ClipboardPlus, DoorOpen, HeartPulse } from "lucide-react";
import { useAccess } from "@/lib/useAccess";
import { useTerminology } from "@/store/hooks/useTerminology";
import type { Terminology } from "@/constants/terminology";

// Labels are terminology-driven so a non-education tenant never reads
// "Student" or "Department" when its vertical calls them something else.
// Healthcare shortcuts bind to the clinical pages (patients / OPD / IPD),
// not /students — that path is industry-gated and never appears in a hospital.
const actionsFor = (t: Terminology) => [
  { label: `Mark ${t.attendance}`,  desc: `Record today's ${t.attendance.toLowerCase()}`, path: "/attendance",       icon: CalendarCheck },
  { label: `Add ${t.member}`,       desc: `Register a new ${t.member.toLowerCase()}`,     path: "/students",         icon: UserPlus },
  { label: "Register Patient",     desc: "Add someone to the patient registry",          path: "/patients",         icon: HeartPulse },
  { label: "Book Appointment",     desc: "Schedule a consultation",                      path: "/appointments",     icon: CalendarCheck },
  { label: "Record OPD Visit",     desc: "Open today's outpatient encounter",            path: "/encounters",       icon: ClipboardPlus },
  { label: "Admit Patient",        desc: "IPD admit, transfer & discharge",              path: "/ipd",              icon: DoorOpen },
  { label: "Salary Setup",          desc: "Templates & assignments",                      path: "/salary/templates", icon: SlidersHorizontal },
  { label: t.department_plural,     desc: `Manage org ${t.department_plural.toLowerCase()}`, path: "/org/departments", icon: Building2 },
];

const REPORTS = [
  { label: "Attendance Report",     path: "/reports/attendance" },
  { label: "Fee Collection Report", path: "/reports/fees" },
  { label: "Payroll Report",        path: "/reports/payroll" },
];

export default function QuickPanel({ tenantHref }: { tenantHref: (p: string) => string }) {
  // Drop shortcuts the org can't reach (subscription gating + role matrix), so
  // the panel never links to a module the org isn't subscribed to.
  const { canViewHref } = useAccess();
  const t = useTerminology();
  const actions = actionsFor(t).filter((a) => canViewHref(a.path));
  const reports = REPORTS.filter((r) => canViewHref(r.path));

  return (
    <div className="space-y-4">
      {actions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick Actions
          </p>
          <div className="divide-y divide-border">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.path}
                  href={tenantHref(a.path)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgb(var(--primary) / 0.10)", color: "rgb(var(--primary))" }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ChevronRight size={15} className="text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick Reports
          </p>
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <Link
                key={r.path}
                href={tenantHref(r.path)}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors"
              >
                <span className="text-sm font-semibold text-foreground">{r.label}</span>
                <ChevronRight size={15} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
