import { gql } from "@apollo/client";

export const LIST_MARKS = gql`
  query ListMarks($studentId: String, $subjectId: String, $examType: String, $semester: Int, $limit: Int, $offset: Int, $status: String) {
    marks(studentId: $studentId, subjectId: $subjectId, examType: $examType, semester: $semester, limit: $limit, offset: $offset, status: $status) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      enteredBy
      subjectId
      assessmentType
      status
      academicYearId
      isPublished
      publishedAt
      student {
        id
        rollNumber
        user {
          id
          name
        }
      }
    }
  }
`;

export const MARKS_COUNT = gql`
  query MarksCount($studentId: String, $subjectId: String, $examType: String, $status: String) {
    marksCount(studentId: $studentId, subjectId: $subjectId, examType: $examType, status: $status)
  }
`;

export const LIST_PUBLISHED_RESULTS = gql`
  query ListPublishedResults($examType: String, $subject: String, $semester: Int, $courseId: String) {
    publishedResults(examType: $examType, subject: $subject, semester: $semester, courseId: $courseId) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      isPublished
      student {
        id
        rollNumber
        user {
          id
          name
        }
        course {
          id
          name
        }
      }
    }
  }
`;

export const GET_RESULT_SUMMARY = gql`
  query GetResultSummary($courseId: String!, $semester: Int!) {
    resultSummary(courseId: $courseId, semester: $semester) {
      totalStudents
      passCount
      failCount
    }
  }
`;
