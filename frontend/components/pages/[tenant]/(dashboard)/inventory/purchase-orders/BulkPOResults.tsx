"use client";

import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import type { POGroup } from "./bulkPOSchema";

export interface GroupResult {
  index: number; // index into the groups array
  success: boolean;
  poNumber?: string;
  error?: string;
}

// Post-submit summary plus an expandable list of every purchase order group
// (created and failed), so the admin can see exactly what was added.
export default function BulkPOResults({
  results,
  groups,
}: {
  results: GroupResult[];
  groups: POGroup[];
}) {
  const ok = results.filter((r) => r.success).length;
  const failed = results.length - ok;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border border-border text-sm">
        <span className="flex items-center gap-2 text-green-600">
          <CheckCircle2 size={18} /> {ok} created
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <XCircle size={18} /> {failed} failed
        </span>
        <span className="ml-auto text-xs text-muted-foreground">Total orders: {results.length}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-80 overflow-auto divide-y divide-border/60">
          {results.map((r) => (
            <ResultRow key={r.index} result={r} group={groups[r.index]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result, group }: { result: GroupResult; group?: POGroup }) {
  const lines = group?.input.items ?? [];
  const total = lines.reduce((s, l) => {
    const net = l.qty * l.unitCost;
    return s + net + (net * l.taxPct) / 100;
  }, 0);

  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 list-none">
        <ChevronRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{group?.ref ?? "—"}</span>
        <span className="w-16 shrink-0">
          {result.success ? (
            <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
              <CheckCircle2 size={12} /> OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
              <XCircle size={12} /> Failed
            </span>
          )}
        </span>
        <span className="flex-1 truncate text-xs">
          {result.success ? (
            <span className="text-foreground/80">
              {result.poNumber && <span className="font-mono">{result.poNumber} · </span>}
              {group?.vendorName}
              <span className="text-muted-foreground"> · {lines.length} line{lines.length !== 1 ? "s" : ""} · {total.toFixed(2)}</span>
            </span>
          ) : (
            <span className="text-red-700">{result.error}</span>
          )}
        </span>
      </summary>

      <div className="px-4 py-3 bg-muted/30 border-t border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium py-1">Item</th>
              <th className="text-right font-medium py-1">Qty</th>
              <th className="text-right font-medium py-1">Unit</th>
              <th className="text-right font-medium py-1">Tax %</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="py-1">{l.itemName || "—"}</td>
                <td className="py-1 text-right font-mono">{l.qty}</td>
                <td className="py-1 text-right font-mono">{l.unitCost}</td>
                <td className="py-1 text-right font-mono">{l.taxPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.success && result.error && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground">Reason: </span>
            <span className="text-red-700">{result.error}</span>
          </div>
        )}
      </div>
    </details>
  );
}
