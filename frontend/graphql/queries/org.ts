import { gql } from "@apollo/client";

export const GET_ORG_PROFILE = gql`
  query GetOrgProfile {
    orgProfile {
      id name logoUrl tagline primaryColor accentColor accreditation
    }
  }
`;

export const GET_ORG_SETUP_STATUS = gql`
  query GetOrgSetupStatus {
    orgSetupStatus {
      orgProfile departments academicYear firstUser
    }
  }
`;

export const GET_ORG_USERS = gql`
  query GetOrgUsers {
    orgUsers {
      id name email role photoUrl managerId departmentId designation
    }
  }
`;

export const GET_ORG_STRUCTURE = gql`
  query GetOrgStructure($department: String) {
    orgStructure(department: $department) {
      roots {
        id name email role photoUrl managerId departmentId designation
        children {
          id name email role photoUrl managerId departmentId designation
          children {
            id name email role photoUrl managerId departmentId designation
            children {
              id name email role photoUrl managerId departmentId designation
              children { id name email role photoUrl managerId departmentId designation children { id name } }
            }
          }
        }
      }
      users {
        id name email role photoUrl managerId departmentId designation
      }
    }
  }
`;

export const GET_SEMESTERS = gql`
  query GetSemesters($academicYearId: String) {
    semesters(academicYearId: $academicYearId) {
      id academicYearId number name startDate endDate
    }
  }
`;

export const GET_CUSTOM_ROLES = gql`
  query GetCustomRoles {
    customRoles {
      id name permissions
    }
  }
`;

export const GET_SYSTEM_ROLES = gql`
  query GetSystemRoles {
    systemRoles {
      id roleId label description color sortOrder
    }
  }
`;
