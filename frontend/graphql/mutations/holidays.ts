import { gql } from "@apollo/client";

export const CREATE_HOLIDAY = gql`
  mutation CreateHoliday($input: CreateHolidayInput!) {
    createHoliday(input: $input) {
      id academicYearId name date type autoGen
    }
  }
`;

export const DELETE_HOLIDAY = gql`
  mutation DeleteHoliday($id: ID!) {
    deleteHoliday(id: $id)
  }
`;

export const BULK_DELETE_HOLIDAYS = gql`
  mutation BulkDeleteHolidays($ids: [ID!]!) {
    bulkDeleteHolidays(ids: $ids)
  }
`;

export const COPY_HOLIDAYS_TO_ACADEMIC_YEAR = gql`
  mutation CopyHolidaysToAcademicYear($ids: [ID!]!, $targetAcademicYearId: String!) {
    copyHolidaysToAcademicYear(ids: $ids, targetAcademicYearId: $targetAcademicYearId) {
      copied
    }
  }
`;
