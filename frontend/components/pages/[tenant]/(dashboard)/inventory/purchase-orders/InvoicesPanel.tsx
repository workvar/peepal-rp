"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlPurchaseInvoice } from "./types";

const statusVariant: Record<string, "gray" | "yellow" | "green"> = {
  unpaid: "gray",
  partially_paid: "yellow",
  paid: "green",
};

const statusLabel: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export default function InvoicesPanel({
  invoices,
  canWrite,
  onPay,
  onDelete,
}: {
  invoices: GqlPurchaseInvoice[];
  canWrite: boolean;
  onPay: (inv: GqlPurchaseInvoice) => void;
  onDelete: (inv: GqlPurchaseInvoice) => void;
}) {
  if (invoices.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No supplier invoices recorded yet.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Invoice #</th>
            <th className="table-th">Vendor</th>
            <th className="table-th">Date</th>
            <th className="table-th">Total</th>
            <th className="table-th">Paid</th>
            <th className="table-th">Status</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{inv.invoiceNumber}</td>
              <td className="table-td">{inv.vendor?.name ?? "—"}</td>
              <td className="table-td">{inv.invoiceDate ?? "—"}</td>
              <td className="table-td font-mono">{inv.total.toFixed(2)}</td>
              <td className="table-td font-mono">{inv.paidAmount.toFixed(2)}</td>
              <td className="table-td">
                <Badge label={statusLabel[inv.status] ?? inv.status} variant={statusVariant[inv.status] ?? "gray"} />
              </td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    {inv.status !== "paid" && (
                      <Can module="purchase-orders" action="edit">
                        <button onClick={() => onPay(inv)} className="text-sm text-emerald-600 hover:underline">
                          Record payment
                        </button>
                      </Can>
                    )}
                    <Can module="purchase-orders" action="delete">
                      <button onClick={() => onDelete(inv)} className="text-red-500 hover:text-red-700 p-1" aria-label={`Delete ${inv.invoiceNumber}`}>
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
