import { gql } from "@apollo/client";

export const LIST_EMPLOYEES = gql`
  query ListEmployees {
    employees {
      id
      employeeId
      designation
      phone
      joinDate
      gender
      bloodGroup
      dateOfBirth
      photoUrl
      emergencyName
      emergencyPhone
      employmentType
      user {
        id
        name
        email
        role
      }
      department {
        id
        name
      }
      paymentDetails {
        bankName
        accountNumber
        accountType
        ifscCode
        branchName
        pfNumber
        uanNumber
        pfEmployeePercent
        pfEmployerPercent
        esiNumber
        esiDispensary
        panNumber
        taxRegime
        form16Ref
        npsAccountNumber
        npsTier
        gratuityEligible
      }
    }
  }
`;

export const LIST_DEPARTMENTS = gql`
  query ListDepartments {
    departments {
      id
      name
    }
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    users {
      id
      name
      email
      role
      isActive
    }
  }
`;
