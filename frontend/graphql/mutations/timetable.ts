import { gql } from "@apollo/client";

export const CREATE_TIMETABLE_SLOT = gql`
  mutation CreateTimetableSlot($input: CreateTimetableSlotInput!) {
    createTimetableSlot(input: $input) {
      id courseId subjectId dayOfWeek periodNumber startTime endTime semester section room
      course { id name } subject { id name }
    }
  }
`;

export const UPDATE_TIMETABLE_SLOT = gql`
  mutation UpdateTimetableSlot($id: ID!, $input: UpdateTimetableSlotInput!) {
    updateTimetableSlot(id: $id, input: $input) {
      id subjectId employeeId dayOfWeek periodNumber startTime endTime semester section room
      course { id name } subject { id name }
    }
  }
`;

export const DELETE_TIMETABLE_SLOT = gql`
  mutation DeleteTimetableSlot($id: ID!) {
    deleteTimetableSlot(id: $id)
  }
`;

export const BULK_CREATE_TIMETABLE_SLOTS = gql`
  mutation BulkCreateTimetableSlots($input: BulkCreateTimetableSlotsInput!) {
    bulkCreateTimetableSlots(input: $input) {
      id courseId subjectId dayOfWeek periodNumber startTime endTime semester section room
    }
  }
`;
