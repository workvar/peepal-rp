"use client";

import { CalendarClock } from "lucide-react";
import { formatCurrency } from "@/functions/fees/feeFormatters";
import type { MyFeesState } from "./useMyFees";

// The student's unpaid installments, soonest due first. Overdue ones are flagged.
export default function UpcomingSchedule({ s }: { s: MyFeesState }) {
  const { upcoming } = s;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={18} className="text-blue-500" />
        <h2 className="font-semibold text-foreground">Upcoming Payments</h2>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-muted-foreground/70 text-sm text-center py-6">
          You have no pending installments. You&apos;re all caught up.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{i.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {i.feeName}
                  {i.dueDate ? ` · due ${i.dueDate}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0 pl-3">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(i.remaining)}</p>
                {i.isOverdue ? (
                  <span className="text-xs font-medium text-red-600">Overdue</span>
                ) : (
                  <span className="text-xs text-muted-foreground capitalize">{i.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
