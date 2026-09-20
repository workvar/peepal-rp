"use client";

import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { bulkEventSchema } from "./bulkEventSchema";

export interface RowResult {
  index: number;
  success: boolean;
  error?: string;
}

// Post-submit summary plus an expandable list of every submitted row (created
// and failed), so the admin can preview exactly what was added — matching the
// results view on the other bulk-upload pages.
export default function BulkEventResults({
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
          <CheckCircle2 size={18} /> {ok} created
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <XCircle size={18} /> {failed} failed
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          Total submitted: {results.length}
        </span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-80 overflow-auto divide-y divide-border/60">
          {results.map((r) => (
            <ResultRow key={r.index} result={r} row={rows[r.index] ?? {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result, row }: { result: RowResult; row: Record<string, string> }) {
  const title = (row.title ?? "").trim() || "(untitled)";
  const date = (row.event_date ?? "").trim();
  const end = (row.end_date ?? "").trim();
  const dateLabel = end && end !== date ? `${date} to ${end}` : date;

  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 list-none">
        <ChevronRight
          size={14}
          className="text-muted-foreground transition-transform group-open:rotate-90 shrink-0"
        />
        <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
          #{result.index + 1}
        </span>
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
              {title}
              {dateLabel && <span className="text-muted-foreground"> · {dateLabel}</span>}
            </span>
          ) : (
            <span className="text-red-700">{result.error}</span>
          )}
        </span>
      </summary>

      <div className="px-4 py-3 bg-muted/30 border-t border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          {bulkEventSchema.fields.map((f) => {
            const value = (row[f.name] ?? "").trim();
            return (
              <div key={f.name} className="flex gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0 w-28 truncate" title={f.label}>
                  {f.label}
                </span>
                <span
                  className={"truncate font-mono " + (value ? "text-foreground" : "text-muted-foreground/60 italic")}
                  title={value}
                >
                  {value || "—"}
                </span>
              </div>
            );
          })}
        </div>
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
