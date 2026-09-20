import { gql } from "@apollo/client";

export const CREATE_STUDENT = gql`
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) {
      id
      rollNumber
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

export const UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $input: UpdateStudentInput!) {
    updateStudent(id: $id, input: $input) {
      id
      rollNumber
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

export const DELETE_STUDENT = gql`
  mutation DeleteStudent($id: ID!) {
    deleteStudent(id: $id)
  }
`;

export const DELETE_ALL_STUDENTS = gql`
  mutation DeleteAllStudents {
    deleteAllStudents
  }
`;
