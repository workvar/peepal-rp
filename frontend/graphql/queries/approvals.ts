import { gql } from "@apollo/client";

const APPROVAL_REQUEST_FIELDS = `
  id flowId process referenceId requesterId title currentStep status createdAt
`;

export const GET_MY_APPROVALS = gql`
  query GetMyApprovals {
    myApprovals {
      ${APPROVAL_REQUEST_FIELDS}
    }
  }
`;

export const GET_PENDING_APPROVALS = gql`
  query GetPendingApprovals {
    pendingApprovals {
      ${APPROVAL_REQUEST_FIELDS}
    }
  }
`;
