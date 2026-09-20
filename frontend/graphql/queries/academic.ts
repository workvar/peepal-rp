import { gql } from "@apollo/client";

export const LIST_COURSES = gql`
  query ListCourses {
    courses {
      id
      name
      code
      description
      durationYears
      totalSemesters
      departmentId
      department {
        id
        name
      }
    }
  }
`;

export const LIST_COURSE_BATCHES = gql`
  query CourseBatches($courseId: ID!) {
    courseBatches(courseId: $courseId) {
      id
      name
      startYear
      endYear
    }
  }
`;

export const LIST_SUBJECTS = gql`
  query ListSubjects($departmentId: String, $search: String) {
    subjects(departmentId: $departmentId, search: $search) {
      id
      name
      code
      credits
      teachingHours
      labHours
      semesterNumber
      description
      syllabusUrl
      departmentId
      department {
        id
        name
      }
      courseOutcomes
      units {
        title
        content
        labActivities
        fieldVisits
        others
      }
    }
  }
`;

export const CURRICULUM = gql`
  query Curriculum($courseId: ID!) {
    curriculum(courseId: $courseId) {
      id
      courseId
      semesterNumber
      sortOrder
      subject {
        id
        name
        code
        credits
        semesterNumber
        departmentId
        courseOutcomes
        units {
          title
          content
          labActivities
          fieldVisits
          others
        }
      }
    }
  }
`;

export const LIST_ACADEMIC_YEARS = gql`
  query ListAcademicYears {
    academicYears {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`;

export const LIST_EXAM_SCHEDULES = gql`
  query ListExamSchedules($semesterNumber: Int, $examType: String) {
    examSchedules(semesterNumber: $semesterNumber, examType: $examType) {
      id
      name
      examType
      semesterNumber
      startDate
      endDate
      published
      instructions
      academicYearId
    }
  }
`;

export const LIST_EXAM_TYPES = gql`
  query ListExamTypes($departmentId: String, $includeInactive: Boolean) {
    examTypes(departmentId: $departmentId, includeInactive: $includeInactive) {
      id
      name
      departmentId
      department {
        id
        name
      }
      maxMarks
      weightage
      active
      createdAt
    }
  }
`;
