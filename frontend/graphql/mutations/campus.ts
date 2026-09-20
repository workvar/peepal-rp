import { gql } from "@apollo/client";

// Phase 6 — Student Life & Campus Ops writes.

export const CREATE_STUDENT_ASSIGNMENT = gql`
  mutation CreateStudentAssignment($input: CreateStudentAssignmentInput!) {
    createStudentAssignment(input: $input) { id }
  }
`;

export const UPDATE_STUDENT_ASSIGNMENT = gql`
  mutation UpdateStudentAssignment($id: ID!, $input: UpdateStudentAssignmentInput!) {
    updateStudentAssignment(id: $id, input: $input) { id }
  }
`;

export const PUBLISH_STUDENT_ASSIGNMENT = gql`
  mutation PublishStudentAssignment($id: ID!) {
    publishStudentAssignment(id: $id) { id status }
  }
`;

export const CLOSE_STUDENT_ASSIGNMENT = gql`
  mutation CloseStudentAssignment($id: ID!) {
    closeStudentAssignment(id: $id) { id status }
  }
`;

export const DELETE_STUDENT_ASSIGNMENT = gql`
  mutation DeleteStudentAssignment($id: ID!) {
    deleteStudentAssignment(id: $id)
  }
`;

export const GRADE_ASSIGNMENT_SUBMISSION = gql`
  mutation GradeAssignmentSubmission($id: ID!, $marksAwarded: Float!, $feedback: String) {
    gradeAssignmentSubmission(id: $id, marksAwarded: $marksAwarded, feedback: $feedback) { id }
  }
`;

export const SUBMIT_ASSIGNMENT = gql`
  mutation SubmitAssignment($assignmentId: ID!, $input: SubmitAssignmentInput!) {
    submitAssignment(assignmentId: $assignmentId, input: $input) { id }
  }
`;

export const SET_MESS_MENU = gql`
  mutation SetMessMenu($input: MessMenuInput!) {
    setMessMenu(input: $input) { id }
  }
`;

export const DELETE_MESS_MENU = gql`
  mutation DeleteMessMenu($id: ID!) {
    deleteMessMenu(id: $id)
  }
`;

export const MARK_MESS_ATTENDANCE = gql`
  mutation MarkMessAttendance($date: String!, $meal: String!, $studentIds: [String!]!) {
    markMessAttendance(date: $date, meal: $meal, studentIds: $studentIds) {
      marked
      cleared
    }
  }
`;

export const CREATE_MESS_EXPENSE = gql`
  mutation CreateMessExpense($input: MessExpenseInput!) {
    createMessExpense(input: $input) { id }
  }
`;

export const UPDATE_MESS_EXPENSE = gql`
  mutation UpdateMessExpense($id: ID!, $input: MessExpenseInput!) {
    updateMessExpense(id: $id, input: $input) { id }
  }
`;

export const DELETE_MESS_EXPENSE = gql`
  mutation DeleteMessExpense($id: ID!) {
    deleteMessExpense(id: $id)
  }
`;

export const PING_VEHICLE_LOCATION = gql`
  mutation PingVehicleLocation($vehicleId: ID!, $latitude: Float!, $longitude: Float!) {
    pingVehicleLocation(vehicleId: $vehicleId, latitude: $latitude, longitude: $longitude) {
      id
      latitude
      longitude
      lastPingAt
    }
  }
`;

export const MARK_DRIVER_ATTENDANCE = gql`
  mutation MarkDriverAttendance($input: DriverAttendanceInput!) {
    markDriverAttendance(input: $input) { id }
  }
`;

export const DELETE_DRIVER_ATTENDANCE = gql`
  mutation DeleteDriverAttendance($id: ID!) {
    deleteDriverAttendance(id: $id)
  }
`;
