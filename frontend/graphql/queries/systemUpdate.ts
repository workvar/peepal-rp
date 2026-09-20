import { gql } from "@apollo/client";

export const SYSTEM_UPDATE_STATUS = gql`
  query SystemUpdateStatus {
    systemUpdateStatus {
      installedBackend
      installedFrontend
      availableBackend
      availableFrontend
      updateAvailable
      snoozed
      snoozedUntil
      activeUsersInTenant
      agentReachable
    }
  }
`;
