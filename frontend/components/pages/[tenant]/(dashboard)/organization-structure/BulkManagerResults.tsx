"use client";

import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export interface RowResult {
  name: string;
  manager: string; // the manager value the admin typed
  status: "assigned" | "skipped" | "failed";
  error?: string;
}

// Post-submit summary for the bulk manager-assignment flow. "Skipped" rows are
// the ones left blank (no change requested), so they're not failures.
export default function BulkManagerResults({ results }: { results: RowResult[] }) {
  const assigned = results.filter((r) => r.status === "assigned").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  // Hide the (often long) list of untouched rows; show only what changed/failed.
  const shown = results.filter((r) => r.status !== "skipped");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border border-border text-sm">
        <span className="flex items-center gap-2 text-green-600">
          <CheckCircle2 size={18} /> {assigned} assigned
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <XCircle size={18} /> {failed} failed
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <MinusCircle size={18} /> {skipped} left blank
        </span>
      </div>

      {shown.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="max-h-80 overflow-auto divide-y divide-border/60">
            {shown.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="w-16 shrink-0">
                  {r.status === "assigned" ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                      <CheckCircle2 size={12} /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                      <XCircle size={12} /> Failed
                    </span>
                  )}
                </span>
                <span className="flex-1 truncate text-foreground/80">{r.name}</span>
                {r.status === "assigned" ? (
                  <span className="text-muted-foreground truncate font-mono">→ {r.manager}</span>
                ) : (
                  <span className="text-red-700 truncate">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
