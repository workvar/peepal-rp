"use client";

import type { AssignRow } from "./bulkManager";

// Review table for the bulk manager-assignment flow. Identity columns are
// pre-filled and locked; only the Manager cell is editable (email or employee
// ID). Invalid cells are outlined in red with the reason on hover.
export default function BulkManagerReview({
  rows,
  errors,
  hints,
  onChange,
}: {
  rows: AssignRow[];
  errors: Record<number, string>;
  hints: Record<number, string>;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="grid grid-cols-[2fr_1.3fr_1.5fr] bg-muted/60 border-b border-border text-xs font-semibold text-foreground/80">
        <div className="px-3 py-2 border-r border-border">Employee</div>
        <div className="px-3 py-2 border-r border-border">Current manager</div>
        <div className="px-3 py-2">Manager (email or employee ID)</div>
      </div>

      <div className="max-h-[48vh] overflow-auto divide-y divide-border/60">
        {rows.map((r, i) => {
          const err = errors[i];
          return (
            <div key={r.userId} className="grid grid-cols-[2fr_1.3fr_1.5fr] items-center">
              <div className="px-3 py-1.5 min-w-0">
                <p className="text-sm text-foreground truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {[r.employeeId, r.email, r.department].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
                {r.currentManager || "—"}
              </div>
              <div className="px-2 py-1.5" title={err}>
                <input
                  className={
                    "input-field h-8 text-sm " +
                    (err ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "")
                  }
                  placeholder="manager@org.edu or EMP0421"
                  value={r.manager}
                  onChange={(e) => onChange(i, e.target.value)}
                />
                {err ? (
                  <p className="text-[11px] text-red-600 mt-0.5 truncate">{err}</p>
                ) : hints[i] ? (
                  <p className="text-[11px] text-green-600 mt-0.5 truncate">→ {hints[i]}</p>
                ) : null}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No employees to assign.
          </div>
        )}
      </div>
    </div>
  );
}
