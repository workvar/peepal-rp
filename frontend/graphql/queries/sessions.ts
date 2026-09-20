import { gql } from "@apollo/client";

/**
 * Signed-in sessions.
 *
 * A "session" here is one login, not one refresh: the server collapses a
 * refresh-token rotation chain back down to the browser or device it belongs
 * to, so this list has one row per place the user is actually signed in.
 */
const SESSION_FIELDS = gql`
  fragment SessionFields on UserSession {
    id
    current
    activeRole
    createdAt
    lastUsedAt
    expiresAt
    deviceLabel
    userAgent
    ip
  }
`;

/** Where the signed-in user is currently signed in, most recent first. */
export const MY_SESSIONS = gql`
  ${SESSION_FIELDS}
  query MySessions {
    mySessions {
      ...SessionFields
    }
  }
`;

/** One user's live sessions (admin only). */
export const USER_SESSIONS = gql`
  ${SESSION_FIELDS}
  query UserSessions($userId: ID!) {
    userSessions(userId: $userId) {
      ...SessionFields
    }
  }
`;
