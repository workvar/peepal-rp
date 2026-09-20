"use client";

import { ListChecks } from "lucide-react";
import { formatCurrency } from "@/functions/fees/feeFormatters";
import { StatusBadge } from "@/components/pages/[tenant]/(dashboard)/fees/ui";
import type { GqlStudentFee } from "@/components/pages/[tenant]/(dashboard)/fees/types";
import type { MyFeesState } from "./useMyFees";

// The complete payment schedule: every fee with its full installment plan.
export default function FullSchedule({ s }: { s: MyFeesState }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks size={18} className="text-indigo-500" />
        <h2 className="font-semibold text-foreground">Full Payment Schedule</h2>
      </div>
      {s.fees.map((fee) => (
        <FeeScheduleCard key={fee.id} fee={fee} />
      ))}
    </div>
  );
}

function FeeScheduleCard({ fee }: { fee: GqlStudentFee }) {
  const due = Math.round((fee.netAmount - fee.paidAmount) * 100) / 100;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/20">
        <div>
          <p className="font-medium text-foreground">{fee.feeAllocation?.name ?? "Fee"}</p>
          <p className="text-xs text-muted-foreground">
            Payable {formatCurrency(fee.netAmount)} · Paid {formatCurrency(fee.paidAmount)} · Due {formatCurrency(due)}
            {fee.discountAmount > 0 && (
              <span className="text-green-600"> · {formatCurrency(fee.discountAmount)} discount</span>
            )}
          </p>
        </div>
        <StatusBadge status={fee.status} />
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="table-th">#</th>
            <th className="table-th">Installment</th>
            <th className="table-th">Due Date</th>
            <th className="table-th text-right">Amount</th>
            <th className="table-th text-right">Paid</th>
            <th className="table-th">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fee.installments.map((i) => (
            <tr key={i.id}>
              <td className="table-td text-muted-foreground">{i.sequence}</td>
              <td className="table-td">{i.label}</td>
              <td className="table-td">
                {i.dueDate || "—"}
                {i.isOverdue && <span className="ml-2 text-xs font-medium text-red-600">overdue</span>}
              </td>
              <td className="table-td text-right">{formatCurrency(i.amount)}</td>
              <td className="table-td text-right">{formatCurrency(i.paidAmount)}</td>
              <td className="table-td"><StatusBadge status={i.status} /></td>
            </tr>
          ))}
          {fee.installments.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                No installments scheduled.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
