import type { ChartPoint } from "../charts/types";
import type { GroupedPoint } from "../charts/GroupedBarChart";

// ── Raw GraphQL report shapes (only the fields the dashboard reads) ──────
export interface AttendanceReportData {
  attendanceReport?: {
    daily: Array<{ date: string; present: number; absent: number; late: number; total: number }>;
  };
}
export interface MarksReportData {
  marksReport?: {
    gradeDistribution: Array<{ grade: string; count: number }>;
    subjectAverages: Array<{ subjectName: string; avgMarks: number }>;
  };
}
export interface LeaveReportData {
  leaveReport?: {
    total: number;
    approved: number;
    statusBreakdown: Array<{ status: string; count: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
  };
}
export interface FeeReportData {
  feeReport?: {
    totalCollected: number;
    paymentCount: number;
    monthlyTrend: Array<{ month: string; amount: number; count: number }>;
    byPaymentMode: Array<{ mode: string; amount: number; count: number }>;
  };
}
export interface PayrollReportData {
  payrollReport?: {
    totalGross: number;
    totalNet: number;
    totalEmployees: number;
    monthlyTrend: Array<{
      month: string;
      grossSalary: number;
      netSalary: number;
      totalDeductions: number;
      employeeCount: number;
    }>;
  };
}

// ── Normalized, chart-ready output ──────────────────────────────────────
export interface AttendancePoint {
  label: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export interface DashboardAnalytics {
  loading: boolean;
  attendance: {
    trend: AttendancePoint[];
    presentSpark: number[];
    absentSpark: number[];
    avgPercentage: number;
  };
  marks: {
    grades: ChartPoint[];
    subjects: ChartPoint[];
    passRate: number;
  };
  fees: {
    monthly: ChartPoint[];
    byMode: ChartPoint[];
    totalCollected: number;
    paymentCount: number;
  };
  leaves: {
    status: ChartPoint[];
    monthly: ChartPoint[];
    total: number;
    approved: number;
  };
  payroll: {
    monthly: GroupedPoint[];
    totalGross: number;
    totalNet: number;
    totalEmployees: number;
  };
}
