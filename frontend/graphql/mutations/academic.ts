import { gql } from "@apollo/client";

export const CREATE_COURSE = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
      name
      code
      description
      durationYears
      totalSemesters
      departmentId
      department { id name }
    }
  }
`;

export const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
      name
      code
      description
      durationYears
      totalSemesters
      departmentId
      department { id name }
    }
  }
`;

export const DELETE_COURSE = gql`
  mutation DeleteCourse($id: ID!) {
    deleteCourse(id: $id)
  }
`;

export const CREATE_SUBJECT = gql`
  mutation CreateSubject($input: CreateSubjectInput!) {
    createSubject(input: $input) {
      id
      name
      code
      credits
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

export const UPDATE_SUBJECT = gql`
  mutation UpdateSubject($id: ID!, $input: UpdateSubjectInput!) {
    updateSubject(id: $id, input: $input) {
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

export const DELETE_SUBJECT = gql`
  mutation DeleteSubject($id: ID!) {
    deleteSubject(id: $id)
  }
`;

export const SET_CURRICULUM_SUBJECTS = gql`
  mutation SetCurriculumSubjects($input: SetCurriculumSubjectsInput!) {
    setCurriculumSubjects(input: $input) {
      id
      courseId
      semesterNumber
      sortOrder
      subject {
        id
        name
        code
      }
    }
  }
`;

export const CREATE_EXAM_SCHEDULE = gql`
  mutation CreateExamSchedule($input: CreateExamScheduleInput!) {
    createExamSchedule(input: $input) {
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

export const UPDATE_EXAM_SCHEDULE = gql`
  mutation UpdateExamSchedule($id: ID!, $input: UpdateExamScheduleInput!) {
    updateExamSchedule(id: $id, input: $input) {
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

export const PUBLISH_EXAM_SCHEDULE = gql`
  mutation PublishExamSchedule($id: ID!, $published: Boolean!) {
    publishExamSchedule(id: $id, published: $published) {
      id
      published
    }
  }
`;

export const DELETE_EXAM_SCHEDULE = gql`
  mutation DeleteExamSchedule($id: ID!) {
    deleteExamSchedule(id: $id)
  }
`;

export const CREATE_EXAM_TYPE = gql`
  mutation CreateExamType($input: CreateExamTypeInput!) {
    createExamType(input: $input) {
      id
      name
      departmentId
      department { id name }
      maxMarks
      weightage
      active
      createdAt
    }
  }
`;

export const UPDATE_EXAM_TYPE = gql`
  mutation UpdateExamType($id: ID!, $input: UpdateExamTypeInput!) {
    updateExamType(id: $id, input: $input) {
      id
      name
      departmentId
      department { id name }
      maxMarks
      weightage
      active
      createdAt
    }
  }
`;

export const DELETE_EXAM_TYPE = gql`
  mutation DeleteExamType($id: ID!) {
    deleteExamType(id: $id)
  }
`;

export const DELETE_SEMESTER = gql`
  mutation DeleteSemester($id: ID!) {
    deleteSemester(id: $id)
  }
`;

export const DELETE_ACADEMIC_YEAR = gql`
  mutation DeleteAcademicYear($id: ID!) {
    deleteAcademicYear(id: $id)
  }
`;

export const CREATE_COURSE_BATCH = gql`
  mutation CreateCourseBatch($courseId: ID!, $startYear: Int!) {
    createCourseBatch(courseId: $courseId, startYear: $startYear) {
      id
      name
      startYear
      endYear
    }
  }
`;

export const DELETE_COURSE_BATCH = gql`
  mutation DeleteCourseBatch($id: ID!) {
    deleteCourseBatch(id: $id)
  }
`;
