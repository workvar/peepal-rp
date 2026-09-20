"use client";

import type { LucideIcon } from "lucide-react";

export interface Stat {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
}

interface Props {
  stats: Stat[];
  cols?: 2 | 3 | 4;
}

const colMap: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

/** Compact metrics-style grid used for "at-a-glance" facts in the docs. */
export default function StatGrid({ stats, cols = 4 }: Props) {
  return (
    <div className={`grid ${colMap[cols]} gap-3`}>
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {Icon && <Icon size={14} />}
              {s.label}
            </div>
            <div className="text-lg font-bold text-foreground">{s.value}</div>
            {s.hint && (
              <div className="text-[11px] text-muted-foreground mt-1">{s.hint}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
