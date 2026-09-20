import { gql } from "@apollo/client";

export const GRADING_SCHEME = gql`
  query GradingScheme {
    gradingScheme {
      id
      mode
      gpaMax
      passThreshold
      decimals
      creditWeighted
      weightedByExamType
      bands {
        id
        letter
        minPercent
        maxPercent
        gradePoint
        isPass
        sortOrder
      }
    }
  }
`;

export const STUDENT_ACADEMIC_RESULT = gql`
  query StudentAcademicResult($studentId: String) {
    studentAcademicResult(studentId: $studentId) {
      studentId
      studentName
      rollNumber
      courseName
      mode
      gpaMax
      totalCredits
      marksObtained
      maxMarks
      percentage
      cgpa
      letter
      isPass
      generatedAt
      semesters {
        semester
        totalCredits
        marksObtained
        maxMarks
        percentage
        sgpa
        letter
        isPass
        subjects {
          subjectId
          subject
          credits
          marksObtained
          maxMarks
          percentage
          letter
          gradePoint
          isPass
        }
      }
    }
  }
`;
