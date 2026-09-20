import { gql } from "@apollo/client";

export const SNOOZE_SYSTEM_UPDATE = gql`
  mutation SnoozeSystemUpdate {
    snoozeSystemUpdate {
      updateAvailable
      snoozed
      snoozedUntil
      activeUsersInTenant
      agentReachable
    }
  }
`;

export const APPLY_SYSTEM_UPDATE = gql`
  mutation ApplySystemUpdate {
    applySystemUpdate
  }
`;
