import { gql } from "@apollo/client";

export const GET_SALARY_TEMPLATES = gql`
  query GetSalaryTemplates {
    salaryTemplates {
      id name description
      basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions
      isActive
    }
  }
`;

export const GET_SALARY_ASSIGNMENTS = gql`
  query GetSalaryAssignments($employeeId: String) {
    salaryAssignments(employeeId: $employeeId) {
      id employeeId templateId extraAllowance extraDeduction
      effectiveFrom effectiveTo isActive notes
      employee {
        id employeeId designation
        user { id name email }
        department { id name }
      }
      template {
        id name basicSalary hra da ta medicalAllowance otherAllowances
        pf esi tds otherDeductions
      }
    }
  }
`;
