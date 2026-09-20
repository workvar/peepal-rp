import { gql } from "@apollo/client";

export const APPLY_LEAVE = gql`
  mutation ApplyLeave($input: ApplyLeaveInput!) {
    applyLeave(input: $input) {
      id
      leaveTypeName
      fromDate
      toDate
      reason
      status
    }
  }
`;

export const REVIEW_LEAVE = gql`
  mutation ReviewLeave($id: ID!, $input: ReviewLeaveInput!) {
    reviewLeave(id: $id, input: $input) {
      id
      status
      reviewNote
      reviewedBy
    }
  }
`;

export const CREATE_LEAVE_TYPE = gql`
  mutation CreateLeaveType($input: CreateLeaveTypeInput!) {
    createLeaveType(input: $input) {
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

export const UPDATE_LEAVE_TYPE = gql`
  mutation UpdateLeaveType($id: ID!, $input: UpdateLeaveTypeInput!) {
    updateLeaveType(id: $id, input: $input) {
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

export const DELETE_LEAVE_TYPE = gql`
  mutation DeleteLeaveType($id: ID!) {
    deleteLeaveType(id: $id)
  }
`;
