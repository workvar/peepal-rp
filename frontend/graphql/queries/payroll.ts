import { gql } from "@apollo/client";

const PAYROLL_FIELDS = `
  id employeeId month year
  basicSalary hra da ta medicalAllowance otherAllowances extraAllowance
  grossSalary pf esi tds otherDeductions extraDeduction totalDeductions netSalary
  workingDays presentDays leaveDays
  status paymentDate paymentMode notes processedBy templateName
  employee { id employeeId user { id name email } department { id name } designation }
`;

export const LIST_SALARY_STRUCTURES = gql`
  query ListSalaryStructures($employeeId: ID) {
    salaryStructures(employeeId: $employeeId) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
      employee { id employeeId user { id name email } department { id name } }
    }
  }
`;

export const LIST_PAYROLLS = gql`
  query ListPayrolls($month: Int, $year: Int, $employeeId: ID, $status: String) {
    payrolls(month: $month, year: $year, employeeId: $employeeId, status: $status) {
      ${PAYROLL_FIELDS}
    }
  }
`;

export const MY_PAYROLLS = gql`
  query MyPayrolls {
    myPayrolls {
      ${PAYROLL_FIELDS}
    }
  }
`;

export const PAYROLL_SUMMARY = gql`
  query PayrollSummary($month: Int, $year: Int) {
    payrollSummary(month: $month, year: $year) {
      totalEmployees totalGross totalDeductions totalNet
      draftCount approvedCount paidCount
    }
  }
`;
