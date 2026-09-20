// GraphQL response shapes for the reports pages.
// Mirrors graphql/queries/reports.ts (camelCase, gqlgen default).

export interface GqlAttendanceDailyRow {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface GqlGradeRow {
  grade: string;
  count: number;
}

export interface GqlSubjectAvgRow {
  subjectId: string;
  subjectName: string;
  avgMarks: number;
  maxMarks: number;
  passCount: number;
  failCount: number;
  totalCount: number;
}

export interface GqlStatusCount {
  status: string;
  count: number;
}

export interface GqlMonthCount {
  month: string;
  count: number;
}

export interface GqlDepartmentCount {
  department: string;
  count: number;
}

export interface GqlFeeMonthRow {
  month: string;
  amount: number;
  count: number;
}

export interface GqlFeeModeRow {
  mode: string;
  amount: number;
  count: number;
}

export interface GqlFeePlanRow {
  plan: string;
  amount: number;
  count: number;
}

export interface GqlPayrollMonthRow {
  month: string;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  employeeCount: number;
}
