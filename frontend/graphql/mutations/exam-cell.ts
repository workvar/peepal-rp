import { gql } from "@apollo/client";

// Exam cell (Phase 5) writes: question authoring, paper generation, hall
// ticket issuing and holds.

export const CREATE_QUESTION_BANK_ITEM = gql`
  mutation CreateQuestionBankItem($input: CreateQuestionBankItemInput!) {
    createQuestionBankItem(input: $input) {
      id
      questionText
      questionType
      difficulty
      marks
      unit
      options
      answer
      courseOutcome
      active
    }
  }
`;

export const UPDATE_QUESTION_BANK_ITEM = gql`
  mutation UpdateQuestionBankItem($id: ID!, $input: UpdateQuestionBankItemInput!) {
    updateQuestionBankItem(id: $id, input: $input) {
      id
      questionText
      questionType
      difficulty
      marks
      unit
      options
      answer
      courseOutcome
      active
    }
  }
`;

export const DELETE_QUESTION_BANK_ITEM = gql`
  mutation DeleteQuestionBankItem($id: ID!) {
    deleteQuestionBankItem(id: $id)
  }
`;

export const GENERATE_QUESTION_PAPER = gql`
  mutation GenerateQuestionPaper($input: GenerateQuestionPaperInput!) {
    generateQuestionPaper(input: $input) {
      id
      title
      totalMarks
      durationMinutes
      status
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

export const FINALIZE_QUESTION_PAPER = gql`
  mutation FinalizeQuestionPaper($id: ID!) {
    finalizeQuestionPaper(id: $id) {
      id
      status
    }
  }
`;

export const DELETE_QUESTION_PAPER = gql`
  mutation DeleteQuestionPaper($id: ID!) {
    deleteQuestionPaper(id: $id)
  }
`;

export const ISSUE_HALL_TICKETS = gql`
  mutation IssueHallTickets($input: IssueHallTicketsInput!) {
    issueHallTickets(input: $input) {
      issued
      held
      skipped
      tickets {
        id
        ticketNumber
        seatNumber
        eligible
        holdReason
        status
      }
    }
  }
`;

export const REVOKE_HALL_TICKET = gql`
  mutation RevokeHallTicket($id: ID!) {
    revokeHallTicket(id: $id) {
      id
      status
      eligible
      holdReason
    }
  }
`;

export const RELEASE_HALL_TICKET_HOLD = gql`
  mutation ReleaseHallTicketHold($id: ID!) {
    releaseHallTicketHold(id: $id) {
      id
      status
      eligible
      holdReason
    }
  }
`;
