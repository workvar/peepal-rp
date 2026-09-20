"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export interface RowResult {
  index: number;
  success: boolean;
  error?: string;
}

// Post-submit summary plus a per-row list (added / failed), matching the other
// bulk-upload dialogs.
export default function BulkTimetableResults({
  results,
  rows,
}: {
  results: RowResult[];
  rows: Record<string, string>[];
}) {
  const ok = results.filter((r) => r.success).length;
  const failed = results.length - ok;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border border-border text-sm">
        <span className="flex items-center gap-2 text-green-600">
          <CheckCircle2 size={18} /> {ok} added
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <XCircle size={18} /> {failed} failed
        </span>
        <span className="ml-auto text-xs text-muted-foreground">Total rows: {results.length}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-80 overflow-auto divide-y divide-border/60">
          {results.map((r) => {
            const row = rows[r.index] ?? {};
            const course = (row.course_code ?? "").trim();
            const day = (row.day ?? "").trim();
            const period = (row.period ?? "").trim();
            const code = (row.subject_code ?? "").trim();
            return (
              <div key={r.index} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="font-mono text-muted-foreground w-8 shrink-0">#{r.index + 1}</span>
                <span className="w-16 shrink-0">
                  {r.success ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                      <CheckCircle2 size={12} /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                      <XCircle size={12} /> Failed
                    </span>
                  )}
                </span>
                <span className="flex-1 truncate">
                  {r.success ? (
                    <span className="text-foreground/80">
                      <span className="font-mono">{course || "—"}</span> · {day || "—"} P{period || "—"} ·{" "}
                      <span className="font-mono">{code || "—"}</span>
                    </span>
                  ) : (
                    <span className="text-red-700">{r.error}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
