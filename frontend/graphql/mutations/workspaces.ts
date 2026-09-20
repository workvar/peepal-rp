import { gql } from "@apollo/client";

/**
 * Replace a user's additional workspace grants. The primary role is implicit
 * and must not be sent; the mutation returns the resulting full list.
 */
export const SET_USER_WORKSPACE_ROLES = gql`
  mutation SetUserWorkspaceRoles($userId: ID!, $roles: [WorkspaceRoleInput!]!) {
    setUserWorkspaceRoles(userId: $userId, roles: $roles) {
      role
      label
      isPrimary
      customRoleId
    }
  }
`;
