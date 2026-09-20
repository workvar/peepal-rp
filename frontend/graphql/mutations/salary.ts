import { gql } from "@apollo/client";

export const CREATE_SALARY_TEMPLATE = gql`
  mutation CreateSalaryTemplate($input: CreateSalaryTemplateInput!) {
    createSalaryTemplate(input: $input) {
      id name description
      basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions isActive
    }
  }
`;

export const UPDATE_SALARY_TEMPLATE = gql`
  mutation UpdateSalaryTemplate($id: ID!, $input: UpdateSalaryTemplateInput!) {
    updateSalaryTemplate(id: $id, input: $input) {
      id name description
      basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions isActive
    }
  }
`;

export const DELETE_SALARY_TEMPLATE = gql`
  mutation DeleteSalaryTemplate($id: ID!) {
    deleteSalaryTemplate(id: $id)
  }
`;

export const ASSIGN_SALARY_TEMPLATE = gql`
  mutation AssignSalaryTemplate($input: AssignSalaryTemplateInput!) {
    assignSalaryTemplate(input: $input)
  }
`;

export const BULK_ASSIGN_SALARY_TEMPLATE = gql`
  mutation BulkAssignSalaryTemplate($input: BulkAssignSalaryTemplateInput!) {
    bulkAssignSalaryTemplate(input: $input) {
      assignedCount
    }
  }
`;

export const UPDATE_SALARY_ASSIGNMENT = gql`
  mutation UpdateSalaryAssignment($id: ID!, $input: UpdateSalaryAssignmentInput!) {
    updateSalaryAssignment(id: $id, input: $input) {
      id employeeId templateId extraAllowance extraDeduction
      effectiveFrom effectiveTo isActive notes
    }
  }
`;

export const DELETE_SALARY_ASSIGNMENT = gql`
  mutation DeleteSalaryAssignment($id: ID!) {
    deleteSalaryAssignment(id: $id)
  }
`;
