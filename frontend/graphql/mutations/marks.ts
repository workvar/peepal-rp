import { gql } from "@apollo/client";

export const CREATE_MARK = gql`
  mutation CreateMark($input: CreateMarkInput!) {
    createMark(input: $input) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      status
    }
  }
`;

export const UPDATE_MARK = gql`
  mutation UpdateMark($id: ID!, $input: UpdateMarkInput!) {
    updateMark(id: $id, input: $input) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      status
    }
  }
`;

export const DELETE_MARK = gql`
  mutation DeleteMark($id: ID!) {
    deleteMark(id: $id)
  }
`;

export const DELETE_MARKS = gql`
  mutation DeleteMarks($ids: [ID!]!) {
    deleteMarks(ids: $ids)
  }
`;

export const DELETE_MARKS_BY_FILTER = gql`
  mutation DeleteMarksByFilter($studentId: String, $subjectId: String, $examType: String, $status: String) {
    deleteMarksByFilter(studentId: $studentId, subjectId: $subjectId, examType: $examType, status: $status)
  }
`;

export const PUBLISH_RESULTS = gql`
  mutation PublishResults($input: PublishResultsInput!) {
    publishResults(input: $input)
  }
`;
