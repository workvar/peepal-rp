import { gql } from "@apollo/client";
import { ROLE_ACCESS_FIELDS } from "@/graphql/queries/access";

// Upsert one role's access across the supplied modules.
export const UPDATE_ROLE_ACCESS = gql`
  mutation UpdateRoleAccess($input: UpdateRoleAccessInput!) {
    updateRoleAccess(input: $input) { ${ROLE_ACCESS_FIELDS} }
  }
`;

// Reset one role back to the built-in defaults.
export const RESET_ROLE_ACCESS = gql`
  mutation ResetRoleAccess($subjectType: String!, $subjectKey: String!) {
    resetRoleAccess(subjectType: $subjectType, subjectKey: $subjectKey) { ${ROLE_ACCESS_FIELDS} }
  }
`;
