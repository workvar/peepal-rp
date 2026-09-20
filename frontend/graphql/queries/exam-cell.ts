import { gql } from "@apollo/client";

// Exam cell (Phase 5) reads: question bank, generated papers, hall tickets.

export const QUESTION_BANK = gql`
  query QuestionBank(
    $curriculumSubjectId: ID!
    $unit: String
    $difficulty: String
    $questionType: String
    $includeInactive: Boolean
  ) {
    questionBank(
      curriculumSubjectId: $curriculumSubjectId
      unit: $unit
      difficulty: $difficulty
      questionType: $questionType
      includeInactive: $includeInactive
    ) {
      id
      curriculumSubjectId
      subjectId
      unit
      questionText
      questionType
      difficulty
      marks
      options
      answer
      courseOutcome
      active
      createdAt
    }
  }
`;

export const QUESTION_PAPERS = gql`
  query QuestionPapers($curriculumSubjectId: String, $status: String) {
    questionPapers(curriculumSubjectId: $curriculumSubjectId, status: $status) {
      id
      title
      examTypeId
      curriculumSubjectId
      subjectId
      totalMarks
      durationMinutes
      instructions
      status
      createdAt
      items {
        id
        seqNo
        questionText
        questionType
        marks
        options
        section
      }
    }
  }
`;

export const QUESTION_PAPER = gql`
  query QuestionPaper($id: ID!) {
    questionPaper(id: $id) {
      id
      title
      totalMarks
      durationMinutes
      instructions
      generationRule
      status
      createdAt
      subject {
        id
        name
        code
      }
      examType {
        id
        name
      }
      items {
        id
        seqNo
        questionText
        questionType
        marks
        options
        section
      }
    }
  }
`;

export const HALL_TICKETS = gql`
  query HallTickets($examScheduleId: ID!, $status: String) {
    hallTickets(examScheduleId: $examScheduleId, status: $status) {
      id
      examScheduleId
      studentId
      ticketNumber
      seatNumber
      examCenter
      eligible
      holdReason
      issuedOn
      status
      qrPayload
      student {
        id
        rollNumber
        semester
        section
        user {
          id
          name
        }
        course {
          id
          name
          code
        }
      }
    }
  }
`;

export const MY_HALL_TICKETS = gql`
  query MyHallTickets {
    myHallTickets {
      id
      examScheduleId
      ticketNumber
      seatNumber
      examCenter
      eligible
      issuedOn
      status
      qrPayload
      examSchedule {
        id
        name
        examType
        startDate
        endDate
        instructions
      }
    }
  }
`;
