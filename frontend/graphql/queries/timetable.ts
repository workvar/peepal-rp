import { gql } from "@apollo/client";

export const LIST_TIMETABLE = gql`
  query ListTimetable($academicYearId: String, $courseId: String, $semester: Int, $section: String, $dayOfWeek: String, $employeeId: String) {
    timetable(academicYearId: $academicYearId, courseId: $courseId, semester: $semester, section: $section, dayOfWeek: $dayOfWeek, employeeId: $employeeId) {
      id
      academicYearId
      courseId
      subjectId
      employeeId
      dayOfWeek
      periodNumber
      startTime
      endTime
      semester
      section
      room
      course { id name code }
      subject { id name code }
    }
  }
`;
