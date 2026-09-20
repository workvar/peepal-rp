import { gql } from "@apollo/client";

export const UPDATE_ORG_PROFILE = gql`
  mutation UpdateOrgProfile($input: UpdateOrgProfileInput!) {
    updateOrgProfile(input: $input) {
      id name logoUrl tagline primaryColor accentColor accreditation
    }
  }
`;

// Identity policy editor (staff / student email-vs-ID login). Kept as a
// SEPARATE operation so the branding save above keeps working even before the
// schema is regenerated. Requires `./regen.sh` for the new fields to activate.
export const UPDATE_ORG_IDENTITY = gql`
  mutation UpdateOrgIdentity($input: UpdateOrgProfileInput!) {
    updateOrgProfile(input: $input) {
      id staffEmailRequired studentEmailRequired
    }
  }
`;

export const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment($id: ID!, $input: UpdateDepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id name
    }
  }
`;

export const DELETE_DEPARTMENT = gql`
  mutation DeleteDepartment($id: ID!) {
    deleteDepartment(id: $id)
  }
`;

export const CREATE_ACADEMIC_YEAR = gql`
  mutation CreateAcademicYear($input: CreateAcademicYearInput!) {
    createAcademicYear(input: $input) {
      id name startDate endDate isCurrent
    }
  }
`;

export const UPDATE_ACADEMIC_YEAR = gql`
  mutation UpdateAcademicYear($id: ID!, $input: UpdateAcademicYearInput!) {
    updateAcademicYear(id: $id, input: $input) {
      id name startDate endDate isCurrent
    }
  }
`;

export const SET_CURRENT_ACADEMIC_YEAR = gql`
  mutation SetCurrentAcademicYear($id: ID!) {
    setCurrentAcademicYear(id: $id) {
      id name startDate endDate isCurrent
    }
  }
`;

export const CREATE_SEMESTER = gql`
  mutation CreateSemester($input: CreateSemesterInput!) {
    createSemester(input: $input) {
      id academicYearId number name startDate endDate
    }
  }
`;

export const CREATE_CUSTOM_ROLE = gql`
  mutation CreateCustomRole($input: CreateCustomRoleInput!) {
    createCustomRole(input: $input) {
      id name permissions
    }
  }
`;

export const UPDATE_CUSTOM_ROLE = gql`
  mutation UpdateCustomRole($id: ID!, $input: UpdateCustomRoleInput!) {
    updateCustomRole(id: $id, input: $input) {
      id name permissions
    }
  }
`;

export const DELETE_CUSTOM_ROLE = gql`
  mutation DeleteCustomRole($id: ID!) {
    deleteCustomRole(id: $id)
  }
`;

export const ASSIGN_USER_CUSTOM_ROLE = gql`
  mutation AssignUserCustomRole($userId: ID!, $customRoleId: ID) {
    assignUserCustomRole(userId: $userId, customRoleId: $customRoleId)
  }
`;

export const ASSIGN_USER_MANAGER = gql`
  mutation AssignUserManager($userId: ID!, $managerId: ID, $departmentId: ID) {
    assignUserManager(userId: $userId, managerId: $managerId, departmentId: $departmentId)
  }
`;
