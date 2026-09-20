import { gql } from "@apollo/client";

export const GET_CALENDAR_SETTINGS = gql`
  query GetCalendarSettings {
    calendarSettings {
      id sundayOff saturdayRule saturdayWeeks defaultWorking
    }
  }
`;

export const GET_CALENDAR_MONTH = gql`
  query GetCalendarMonth($year: Int!, $month: Int!) {
    calendarMonth(year: $year, month: $month) {
      year month working totalDays
      days {
        date weekday type name autoGen
      }
    }
  }
`;

// Attendance settings are defined once, with the rest of the attendance
// documents. Re-exported here so the existing imports from this module keep
// working without a second copy of the same query drifting from the first.
export { GET_ATTENDANCE_SETTINGS } from "./attendance";
