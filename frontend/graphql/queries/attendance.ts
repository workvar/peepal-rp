import { gql } from "@apollo/client";

export const LIST_ATTENDANCE = gql`
  query ListAttendance(
    $entityId: String
    $entityType: String
    $subjectId: String
    $date: String
    $limit: Int
    $offset: Int
    $search: String
  ) {
    attendance(
      entityId: $entityId
      entityType: $entityType
      subjectId: $subjectId
      date: $date
      limit: $limit
      offset: $offset
      search: $search
    ) {
      id
      entityId
      entityType
      date
      status
      markedBy
      remarks
      subjectId
    }
  }
`;

export const ATTENDANCE_SUMMARY = gql`
  query AttendanceSummary($entityType: String) {
    attendanceSummary(entityType: $entityType) {
      entityId
      total
      present
      absent
      late
      attendancePct
    }
  }
`;

export const GET_ATTENDANCE_SETTINGS = gql`
  query GetAttendanceSettings {
    attendanceSettings {
      id
      minAttendancePct
      gracePeriodMinutes
      lockAfterHours
    }
  }
`;

export const ATTENDANCE_SHORTAGE = gql`
  query AttendanceShortage {
    attendanceShortage {
      threshold
      count
      students {
        total
        present
        attendancePct
        student {
          id
          rollNumber
          user { id name }
          course { id name }
        }
      }
    }
  }
`;
