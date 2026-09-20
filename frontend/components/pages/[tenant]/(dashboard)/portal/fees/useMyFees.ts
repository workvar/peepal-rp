"use client";

// Data + derived views for the student "My Fees" page. Pulls the caller's own
// fee records and payments (self-service GraphQL) and shapes them into a
// summary, an upcoming-due list, and a receipt-label lookup.

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { MY_STUDENT_FEES, MY_FEE_PAYMENTS } from "@/queries/pages/fees/fees";
import { useAppSelector } from "@/store/hooks";
import { prettyInstitute, type FeePdfMeta } from "@/functions/fees/pdfShared";
import type { GqlStudentFee, GqlFeePayment } from "@/components/pages/[tenant]/(dashboard)/fees/types";

export interface UpcomingItem {
  id: string;
  feeName: string;
  label: string;
  dueDate?: string | null;
  remaining: number;
  status: string;
  isOverdue: boolean;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Sort by due date ascending; undated installments sort last.
function byDueDate(a: UpcomingItem, b: UpcomingItem): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export function useMyFees() {
  const user = useAppSelector((s) => s.auth.user);
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);

  const feesQ = useQuery(MY_STUDENT_FEES);
  const payQ = useQuery(MY_FEE_PAYMENTS);

  const fees: GqlStudentFee[] = feesQ.data?.myStudentFees ?? [];
  const payments: GqlFeePayment[] = payQ.data?.myFeePayments ?? [];

  const meta: FeePdfMeta = useMemo(() => {
    const st = fees[0]?.student;
    return {
      studentName: st?.user?.name || user?.name || "-",
      rollNumber: st?.rollNumber || "-",
      courseName: st?.course?.name || "-",
      institute: prettyInstitute(tenantSlug),
    };
  }, [fees, user, tenantSlug]);

  const summary = useMemo(() => {
    const totalPayable = round2(fees.reduce((s, f) => s + f.netAmount, 0));
    const totalPaid = round2(fees.reduce((s, f) => s + f.paidAmount, 0));
    return { totalPayable, totalPaid, totalDue: round2(totalPayable - totalPaid) };
  }, [fees]);

  // Every unpaid installment across all fees, soonest-due first.
  const upcoming: UpcomingItem[] = useMemo(() => {
    const items: UpcomingItem[] = [];
    for (const f of fees) {
      for (const i of f.installments) {
        if (i.status === "paid") continue;
        items.push({
          id: i.id,
          feeName: f.feeAllocation?.name || "Fee",
          label: i.label,
          dueDate: i.dueDate,
          remaining: round2(i.amount - i.paidAmount),
          status: i.status,
          isOverdue: i.isOverdue,
        });
      }
    }
    return items.sort(byDueDate);
  }, [fees]);

  const overdueCount = useMemo(() => upcoming.filter((i) => i.isOverdue).length, [upcoming]);

  // installmentId -> label, so receipts can name the installment paid.
  const installmentLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of fees) for (const i of f.installments) map[i.id] = i.label;
    return map;
  }, [fees]);

  const paidPayments = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);

  return {
    loading: feesQ.loading || payQ.loading,
    error: feesQ.error || payQ.error,
    fees,
    payments,
    paidPayments,
    meta,
    summary,
    upcoming,
    nextDue: upcoming[0] ?? null,
    overdueCount,
    installmentLabels,
    hasFees: fees.length > 0,
  };
}

export type MyFeesState = ReturnType<typeof useMyFees>;
