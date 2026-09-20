"use client";

import { Wallet, CheckCircle2, AlertCircle, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/functions/fees/feeFormatters";
import type { MyFeesState } from "./useMyFees";

// Four headline figures: total payable, paid, outstanding, and the next due.
export default function FeeSummaryCards({ s }: { s: MyFeesState }) {
  const { summary, nextDue, overdueCount } = s;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card text-center">
        <Wallet size={20} className="mx-auto text-indigo-500 mb-2" />
        <p className="text-xl font-bold text-foreground">{formatCurrency(summary.totalPayable)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Total Payable</p>
      </div>

      <div className="card text-center">
        <CheckCircle2 size={20} className="mx-auto text-green-500 mb-2" />
        <p className="text-xl font-bold text-foreground">{formatCurrency(summary.totalPaid)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Paid</p>
      </div>

      <div className="card text-center">
        <AlertCircle size={20} className={`mx-auto mb-2 ${summary.totalDue > 0 ? "text-amber-500" : "text-green-500"}`} />
        <p className="text-xl font-bold text-foreground">{formatCurrency(summary.totalDue)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Outstanding{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
        </p>
      </div>

      <div className="card text-center">
        <CalendarClock size={20} className="mx-auto text-blue-500 mb-2" />
        {nextDue ? (
          <>
            <p className="text-xl font-bold text-foreground">{formatCurrency(nextDue.remaining)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Next Due{nextDue.dueDate ? ` · ${nextDue.dueDate}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-green-600">All clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nothing due</p>
          </>
        )}
      </div>
    </div>
  );
}
