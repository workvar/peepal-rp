"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { money, type GqlLedgerBatch } from "../types";

const SOURCE_LABEL: Record<string, string> = {
  fee_payment: "Fee Payment",
  invoice_payment: "Invoice Payment",
  payroll: "Payroll",
  purchase_invoice: "Purchase Invoice",
  purchase_payment: "Purchase Payment",
  manual: "Manual Journal",
};

export default function BatchList({ batches }: { batches: GqlLedgerBatch[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (batches.length === 0) {
    return <p className="text-sm text-muted-foreground">No journal entries in this range.</p>;
  }

  return (
    <div className="border rounded-lg divide-y">
      {batches.map((b) => {
        const total = b.lines.reduce((s, l) => s + l.debit, 0);
        const isOpen = !!open[b.id];
        return (
          <div key={b.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/40"
              onClick={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}
            >
              <span className="flex items-center gap-2">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-mono text-muted-foreground">{b.date}</span>
                <span>{b.memo || SOURCE_LABEL[b.sourceType ?? ""] || "Entry"}</span>
                {b.reversed && <span className="text-xs text-amber-600">(reversed)</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{SOURCE_LABEL[b.sourceType ?? ""] ?? b.sourceType}</span>
                <span className="font-medium">{money(total)}</span>
              </span>
            </button>
            {isOpen && (
              <div className="px-10 pb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left">
                      <th className="py-1 font-normal">Account</th>
                      <th className="py-1 font-normal text-right">Debit</th>
                      <th className="py-1 font-normal text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-1">
                          {l.accountCode ? `${l.accountCode} · ` : ""}
                          {l.accountName ?? l.accountId}
                        </td>
                        <td className="py-1 text-right">{l.debit ? money(l.debit) : ""}</td>
                        <td className="py-1 text-right">{l.credit ? money(l.credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
