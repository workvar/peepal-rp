import { gql } from "@apollo/client";

export const MARK_ATTENDANCE = gql`
  mutation MarkAttendance($input: MarkAttendanceInput!) {
    markAttendance(input: $input) {
      id
      entityId
      entityType
      date
      status
      remarks
    }
  }
`;

export const BULK_MARK_ATTENDANCE = gql`
  mutation BulkMarkAttendance($inputs: [MarkAttendanceInput!]!) {
    bulkMarkAttendance(inputs: $inputs) {
      id
      entityId
      entityType
      date
      status
    }
  }
`;
