import { gql } from "@apollo/client";

export const CREATE_SALARY_STRUCTURE = gql`
  mutation CreateSalaryStructure($input: CreateSalaryStructureInput!) {
    createSalaryStructure(input: $input) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
      employee { id employeeId user { id name } }
    }
  }
`;

export const UPDATE_SALARY_STRUCTURE = gql`
  mutation UpdateSalaryStructure($id: ID!, $input: UpdateSalaryStructureInput!) {
    updateSalaryStructure(id: $id, input: $input) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
    }
  }
`;

export const DELETE_SALARY_STRUCTURE = gql`
  mutation DeleteSalaryStructure($id: ID!) {
    deleteSalaryStructure(id: $id)
  }
`;

export const GENERATE_PAYROLL = gql`
  mutation GeneratePayroll($input: GeneratePayrollInput!) {
    generatePayroll(input: $input) {
      id employeeId month year
      basicSalary hra da ta medicalAllowance otherAllowances
      grossSalary pf esi tds otherDeductions totalDeductions netSalary
      workingDays presentDays leaveDays
      status paymentDate paymentMode notes processedBy
      employee {
        id
        employeeId
        user { id name email }
        department { id name }
      }
    }
  }
`;

export const UPDATE_PAYROLL_STATUS = gql`
  mutation UpdatePayrollStatus($id: ID!, $input: UpdatePayrollStatusInput!) {
    updatePayrollStatus(id: $id, input: $input) {
      id status paymentDate paymentMode
    }
  }
`;

export const DELETE_PAYROLL = gql`
  mutation DeletePayroll($id: ID!) {
    deletePayroll(id: $id)
  }
`;
