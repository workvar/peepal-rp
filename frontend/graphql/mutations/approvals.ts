import { gql } from "@apollo/client";

export const APPROVE_REQUEST = gql`
  mutation ApproveRequest($id: ID!, $comment: String) {
    approveRequest(id: $id, comment: $comment) {
      id flowId process referenceId requesterId title currentStep status createdAt
    }
  }
`;

export const REJECT_REQUEST = gql`
  mutation RejectRequest($id: ID!, $comment: String) {
    rejectRequest(id: $id, comment: $comment) {
      id flowId process referenceId requesterId title currentStep status createdAt
    }
  }
`;
