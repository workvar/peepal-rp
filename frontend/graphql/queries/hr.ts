import { gql } from "@apollo/client";

// Queries for Phase 4 — General Staff Duty Roster (cross-industry HR).

export const LIST_DUTY_ROSTER = gql`
  query ListDutyRoster($from: String, $to: String, $employeeId: String, $departmentId: String) {
    dutyRoster(from: $from, to: $to, employeeId: $employeeId, departmentId: $departmentId) {
      id
      employeeId
      employeeName
      date
      shiftName
      startTime
      endTime
      location
      notes
      createdAt
    }
  }
`;

// Light picker for the roster form — avoids the heavyweight LIST_EMPLOYEES
// payload (payment details etc.) just to fill a dropdown.
export const LIST_EMPLOYEE_OPTIONS = gql`
  query ListEmployeeOptions {
    employees {
      id
      designation
      user {
        name
      }
      department {
        id
        name
      }
    }
  }
`;
