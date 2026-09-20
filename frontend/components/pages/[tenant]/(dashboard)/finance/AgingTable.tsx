"use client";

import { money, type GqlAgingRow } from "./types";

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

const bucketClass: Record<string, string> = {
  current: "text-green-600",
  "1-30": "text-foreground",
  "31-60": "text-amber-600",
  "61-90": "text-orange-600",
  "90+": "text-red-600",
};

export default function AgingTable({
  rows,
  partyLabel,
}: {
  rows: GqlAgingRow[];
  partyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing outstanding.</p>;
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byBucket = BUCKETS.map((b) => ({
    bucket: b,
    total: rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.amount, 0),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {byBucket.map((b) => (
          <div key={b.bucket} className="border rounded-lg px-4 py-2 text-sm">
            <div className={`font-medium ${bucketClass[b.bucket]}`}>{b.bucket}</div>
            <div>{money(b.total)}</div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg divide-y">
        <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground">
          <span className="col-span-4">{partyLabel}</span>
          <span className="col-span-3">Reference</span>
          <span className="col-span-2">Due</span>
          <span className="col-span-1 text-right">Days</span>
          <span className="col-span-2 text-right">Amount</span>
        </div>
        {rows.map((r, i) => (
          <div key={`${r.partyId}-${r.reference}-${i}`} className="grid grid-cols-12 px-4 py-1.5 text-sm">
            <span className="col-span-4">{r.partyName}</span>
            <span className="col-span-3 text-muted-foreground">{r.reference}</span>
            <span className="col-span-2 text-muted-foreground">{r.dueDate ?? r.date ?? "—"}</span>
            <span className={`col-span-1 text-right ${bucketClass[r.bucket]}`}>{r.daysOverdue}</span>
            <span className="col-span-2 text-right">{money(r.amount)}</span>
          </div>
        ))}
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium bg-muted/40">
          <span className="col-span-10">Total Outstanding</span>
          <span className="col-span-2 text-right">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
