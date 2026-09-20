"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  ATTENDANCE_REPORT,
  MARKS_REPORT,
  LEAVE_REPORT,
  FEE_REPORT,
  PAYROLL_REPORT,
} from "@/graphql/queries/reports";
import { useAccess } from "@/lib/useAccess";
import { useTenantType } from "@/store/hooks/useTerminology";
import { moduleAllowedForIndustry } from "@/lib/access";
import { monthLabel, titleCase, isoDaysAgo } from "./format";
import type {
  DashboardAnalytics,
  AttendanceReportData,
  MarksReportData,
  LeaveReportData,
  FeeReportData,
  PayrollReportData,
} from "./types";

/**
 * Sources every dashboard chart from the existing GraphQL report resolvers
 * (attendance / marks / fees / leave / payroll). Each query is independent and
 * gated by module access, so a missing module just hides its charts instead of
 * breaking the page. Replaces the old REST /dashboard/charts call.
 */
export function useDashboardAnalytics(enabled: boolean): DashboardAnalytics {
  const { canViewHref } = useAccess();

  const opt = (path: string) => ({
    skip: !enabled || !canViewHref(path),
    errorPolicy: "all" as const,
    fetchPolicy: "cache-and-network" as const,
  });

  // Education tracks the member population; every other industry only has
  // employee attendance, so asking for "student" there returns an empty chart.
  const entityType = moduleAllowedForIndustry("students", useTenantType()) ? "student" : "employee";

  const attendance = useQuery<AttendanceReportData>(ATTENDANCE_REPORT, {
    variables: { fromDate: isoDaysAgo(13), toDate: isoDaysAgo(0), entityType },
    ...opt("/attendance"),
  });
  const marks = useQuery<MarksReportData>(MARKS_REPORT, opt("/marks"));
  const leaves = useQuery<LeaveReportData>(LEAVE_REPORT, opt("/leaves"));
  const fees = useQuery<FeeReportData>(FEE_REPORT, opt("/fees"));
  const payroll = useQuery<PayrollReportData>(PAYROLL_REPORT, opt("/payroll"));

  const loading =
    attendance.loading || marks.loading || leaves.loading || fees.loading || payroll.loading;

  return useMemo<DashboardAnalytics>(() => {
    const daily = attendance.data?.attendanceReport?.daily ?? [];
    const totPresent = daily.reduce((s, d) => s + d.present, 0);
    const totAbsent = daily.reduce((s, d) => s + d.absent, 0);
    const attBase = totPresent + totAbsent;

    const grades = marks.data?.marksReport?.gradeDistribution ?? [];
    const gradeTotal = grades.reduce((s, g) => s + g.count, 0);
    const passCount = grades
      .filter((g) => g.grade !== "F" && g.grade !== "")
      .reduce((s, g) => s + g.count, 0);

    const feeReport = fees.data?.feeReport;
    const leaveReport = leaves.data?.leaveReport;
    const payrollReport = payroll.data?.payrollReport;

    return {
      loading,
      attendance: {
        trend: daily.map((d) => ({
          label: d.date.slice(5),
          present: d.present,
          absent: d.absent,
          total: d.total,
          percentage: d.total > 0 ? (d.present / d.total) * 100 : 0,
        })),
        presentSpark: daily.map((d) => d.present),
        absentSpark: daily.map((d) => d.absent),
        avgPercentage: attBase > 0 ? (totPresent / attBase) * 100 : 0,
      },
      marks: {
        grades: grades.map((g) => ({ label: g.grade, value: g.count })),
        subjects: (marks.data?.marksReport?.subjectAverages ?? [])
          .filter((s) => s.subjectName)
          .map((s) => ({ label: s.subjectName, value: Math.round(s.avgMarks) })),
        passRate: gradeTotal > 0 ? (passCount / gradeTotal) * 100 : 0,
      },
      fees: {
        monthly: (feeReport?.monthlyTrend ?? []).map((m) => ({
          label: monthLabel(m.month),
          value: m.amount,
        })),
        byMode: (feeReport?.byPaymentMode ?? []).map((m) => ({
          label: titleCase(m.mode || "Other"),
          value: m.amount,
        })),
        totalCollected: feeReport?.totalCollected ?? 0,
        paymentCount: feeReport?.paymentCount ?? 0,
      },
      leaves: {
        status: (leaveReport?.statusBreakdown ?? []).map((s) => ({
          label: titleCase(s.status),
          value: s.count,
        })),
        monthly: (leaveReport?.monthlyTrend ?? []).map((m) => ({
          label: monthLabel(m.month),
          value: m.count,
        })),
        total: leaveReport?.total ?? 0,
        approved: leaveReport?.approved ?? 0,
      },
      payroll: {
        monthly: (payrollReport?.monthlyTrend ?? []).map((m) => ({
          label: monthLabel(m.month),
          values: [m.grossSalary, m.netSalary],
        })),
        totalGross: payrollReport?.totalGross ?? 0,
        totalNet: payrollReport?.totalNet ?? 0,
        totalEmployees: payrollReport?.totalEmployees ?? 0,
      },
    };
  }, [attendance.data, marks.data, leaves.data, fees.data, payroll.data, loading]);
}
