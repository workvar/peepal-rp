"use client";

import { useRef, useState } from "react";
import { useQuery } from "@apollo/client";
import { LIST_EMPLOYEES } from "@/queries/pages/employees/employees";
import { Building2, Info, Users } from "lucide-react";
import type { GqlEmployee } from "@/types/pages/employees/page";

const EMPLOYMENT_COLORS: Record<string, string> = {
  permanent:  "bg-green-400",
  contract:   "bg-yellow-400",
  "part-time": "bg-blue-400",
};

export default function EmployeeStatsChip() {
  const { data, loading } = useQuery<{ employees: GqlEmployee[] }>(LIST_EMPLOYEES, {
    fetchPolicy: "cache-and-network",
  });

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const employees: GqlEmployee[] = data?.employees ?? [];
  const total = employees.length;

  // Department breakdown.
  const deptCounts: Record<string, { name: string; count: number }> = {};
  let noDept = 0;
  for (const e of employees) {
    if (e.department) {
      const key = e.department.id;
      if (!deptCounts[key]) deptCounts[key] = { name: e.department.name, count: 0 };
      deptCounts[key].count++;
    } else {
      noDept++;
    }
  }
  const deptRows = Object.values(deptCounts).sort((a, b) => b.count - a.count);

  // Employment type breakdown.
  const typeCounts: Record<string, number> = {};
  for (const e of employees) {
    const t = e.employmentType ?? "permanent";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  if (loading && total === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground shadow-sm">
        <Users size={14} className="text-muted-foreground" />
        <span>{total} {total === 1 ? "Employee" : "Employees"}</span>
      </div>

      <div className="relative">
        <button
          ref={btnRef}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-label="Employee breakdown"
          type="button"
        >
          <Info size={13} />
        </button>

        {open && total > 0 && (
          <div
            className="absolute right-0 top-8 z-50 w-64 rounded-xl border border-border bg-popover p-4 shadow-xl"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {/* Arrow */}
            <div className="absolute -top-1.5 right-2 h-3 w-3 rotate-45 border-l border-t border-border bg-popover" />

            {/* By Department */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              By Department
            </p>
            <div className="mb-3 space-y-1">
              {deptRows.map((d) => (
                <StatRow
                  key={d.name}
                  label={d.name}
                  count={d.count}
                  total={total}
                  color="bg-emerald-400"
                  icon={<Building2 size={10} className="text-muted-foreground/60" />}
                />
              ))}
              {noDept > 0 && (
                <StatRow label="No department" count={noDept} total={total} color="bg-border" dim />
              )}
            </div>

            {/* By Employment Type */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              By Type
            </p>
            <div className="space-y-1">
              {Object.entries(typeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <StatRow
                    key={type}
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                    count={count}
                    total={total}
                    color={EMPLOYMENT_COLORS[type] ?? "bg-gray-400"}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  count,
  total,
  color,
  dim = false,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  dim?: boolean;
  icon?: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-2 text-xs${dim ? " opacity-50" : ""}`}>
      {icon ?? <span className={`h-2 w-2 flex-shrink-0 rounded-full ${color}`} />}
      <span className="flex-1 truncate text-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{count}</span>
      <span className="w-8 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}
