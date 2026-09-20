import { gql } from "@apollo/client";

export const LIST_LEAVES = gql`
  query ListLeaves($status: String) {
    leaves(status: $status) {
      id
      applicantId
      leaveTypeName
      leaveTypeId
      fromDate
      toDate
      reason
      status
      reviewedBy
      reviewNote
      applicant { id name email role isActive }
    }
  }
`;

export const LIST_LEAVE_TYPES = gql`
  query ListLeaveTypes {
    leaveTypes {
      id
      name
      code
      daysPerYear
      carryForward
      maxCarryForward
      applicableTo
      isActive
    }
  }
`;

export const MY_LEAVE_BALANCE = gql`
  query MyLeaveBalance {
    myLeaveBalance {
      id
      userId
      leaveTypeId
      year
      total
      used
      pending
      leaveType { id name code daysPerYear carryForward maxCarryForward applicableTo isActive }
    }
  }
`;

export const LIST_LEAVE_BALANCES = gql`
  query ListLeaveBalances($year: Int, $userId: String) {
    leaveBalances(year: $year, userId: $userId) {
      id
      userId
      leaveTypeId
      year
      total
      used
      pending
      leaveType { id name code }
    }
  }
`;
