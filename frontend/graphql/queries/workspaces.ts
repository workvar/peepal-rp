import { gql } from "@apollo/client";

const WORKSPACE_FIELDS = gql`
  fragment WorkspaceFields on Workspace {
    role
    label
    isPrimary
    customRoleId
  }
`;

/** Workspaces the signed-in user may switch into. */
export const MY_WORKSPACES = gql`
  ${WORKSPACE_FIELDS}
  query MyWorkspaces {
    myWorkspaces {
      ...WorkspaceFields
    }
  }
`;

/** Workspaces held by any user in the tenant (admin only). */
export const USER_WORKSPACES = gql`
  ${WORKSPACE_FIELDS}
  query UserWorkspaces($userId: ID!) {
    userWorkspaces(userId: $userId) {
      ...WorkspaceFields
    }
  }
`;
