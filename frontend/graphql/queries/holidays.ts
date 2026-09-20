import { gql } from "@apollo/client";

export const GET_HOLIDAYS = gql`
  query GetHolidays($year: String, $academicYearId: String) {
    holidays(year: $year, academicYearId: $academicYearId) {
      id academicYearId name date type autoGen
    }
  }
`;
