import { gql } from "@apollo/client";

export const MY_NOTIFICATIONS = gql`
  query MyNotifications {
    myNotifications {
      id userId title body type category refId refType isRead createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = gql`
  query UnreadNotificationCount {
    unreadNotificationCount {
      count
    }
  }
`;
