import { gql } from "@apollo/client";

export const UPDATE_CALENDAR_SETTINGS = gql`
  mutation UpdateCalendarSettings($input: UpdateCalendarSettingsInput!) {
    updateCalendarSettings(input: $input) {
      id sundayOff saturdayRule saturdayWeeks defaultWorking
    }
  }
`;

export const GENERATE_CALENDAR = gql`
  mutation GenerateCalendar($year: Int!) {
    generateCalendar(year: $year) {
      year created
    }
  }
`;

export const UPSERT_CALENDAR_DAY = gql`
  mutation UpsertCalendarDay($input: UpsertCalendarDayInput!) {
    upsertCalendarDay(input: $input) {
      id date type name autoGen
    }
  }
`;

export const UPDATE_ATTENDANCE_SETTINGS = gql`
  mutation UpdateAttendanceSettings($input: UpdateAttendanceSettingsInput!) {
    updateAttendanceSettings(input: $input) {
      id minAttendancePct gracePeriodMinutes lockAfterHours
    }
  }
`;
