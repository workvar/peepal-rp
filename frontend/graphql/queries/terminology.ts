import { gql } from "@apollo/client";

export const GET_TERMINOLOGY = gql`
  query GetTerminology {
    terminology {
      type
      labels {
        organization
        organizationPlural
        member
        memberPlural
        staff
        staffPlural
        department
        departmentPlural
        course
        coursePlural
        attendance
        marks
        leave
      }
    }
  }
`;
