"use client";

import { money, type GqlStatement } from "../types";

// Renders a computed P&L or balance sheet: titled sections with a headline total.
export default function StatementView({
  statement,
  headlineLabel,
}: {
  statement: GqlStatement | undefined;
  headlineLabel: string;
}) {
  if (!statement) return null;

  return (
    <div className="max-w-2xl space-y-5">
      {statement.sections.map((sec) => (
        <div key={sec.title}>
          <h3 className="text-sm font-semibold mb-1">{sec.title}</h3>
          <div className="border rounded-lg divide-y">
            {sec.lines.length === 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground">No entries.</div>
            )}
            {sec.lines.map((l, i) => (
              <div key={`${l.code}-${i}`} className="flex justify-between px-4 py-1.5 text-sm">
                <span>
                  {l.code ? `${l.code} · ` : ""}
                  {l.name}
                </span>
                <span>{money(l.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-1.5 text-sm font-medium bg-muted/40">
              <span>Total {sec.title}</span>
              <span>{money(sec.total)}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between border-t pt-3 text-base font-semibold">
        <span>{headlineLabel}</span>
        <span>{money(statement.total)}</span>
      </div>
      {statement.asOf && !statement.balanced && (
        <p className="text-sm text-red-500">This statement does not balance; review recent postings.</p>
      )}
    </div>
  );
}
