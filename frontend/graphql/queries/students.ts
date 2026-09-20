import { gql } from "@apollo/client";

export const LIST_STUDENTS = gql`
  query ListStudents($courseId: String, $semester: Int) {
    students(courseId: $courseId, semester: $semester) {
      id
      rollNumber
      section
      semester
      phone
      enrollDate
      dateOfBirth
      gender
      bloodGroup
      photoUrl
      address
      city
      state
      pincode
      nationality
      emergencyName
      emergencyPhone
      fatherName
      fatherPhone
      motherName
      motherPhone
      admissionStatus
      batch
      user {
        id
        name
        email
        role
        isActive
      }
      course {
        id
        name
        code
      }
    }
  }
`;

export const LIST_COURSES = gql`
  query ListCoursesWithBatches {
    courses {
      id
      name
      code
      department {
        id
        name
      }
      batches {
        id
        name
        startYear
        endYear
      }
    }
  }
`;

export const GET_STUDENT = gql`
  query GetStudent($id: ID!) {
    student(id: $id) {
      id
      rollNumber
      section
      semester
      phone
      enrollDate
      dateOfBirth
      gender
      bloodGroup
      user {
        id
        name
        email
      }
      course {
        id
        name
        code
      }
    }
  }
`;
