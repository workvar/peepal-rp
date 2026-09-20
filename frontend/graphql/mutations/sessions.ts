import { gql } from "@apollo/client";

/** End one of the signed-in user's own sessions. */
export const REVOKE_MY_SESSION = gql`
  mutation RevokeMySession($sessionId: ID!) {
    revokeMySession(sessionId: $sessionId)
  }
`;

/** End every session but the one making the request. Returns how many ended. */
export const REVOKE_MY_OTHER_SESSIONS = gql`
  mutation RevokeMyOtherSessions {
    revokeMyOtherSessions
  }
`;

/** End every session belonging to a user (admin only). Returns how many ended. */
export const REVOKE_USER_SESSIONS = gql`
  mutation RevokeUserSessions($userId: ID!) {
    revokeUserSessions(userId: $userId)
  }
`;
