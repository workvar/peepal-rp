export interface GqlPayroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  da: number;
  ta: number;
  medicalAllowance: number;
  otherAllowances: number;
  extraAllowance: number;
  grossSalary: number;
  pf: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  extraDeduction: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  status: string;
  paymentDate?: string | null;
  paymentMode?: string | null;
  notes?: string | null;
  processedBy?: string | null;
  templateName?: string | null;
  employee?: {
    id: string;
    employeeId: string;
    designation?: string | null;
    user?: { id: string; name: string; email: string } | null;
    department?: { id: string; name: string } | null;
  } | null;
}

export interface GqlPayrollSummary {
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  draftCount: number;
  approvedCount: number;
  paidCount: number;
}
