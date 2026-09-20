import { gql } from "@apollo/client";

export const LIST_ANNOUNCEMENTS = gql`
  query ListAnnouncements {
    announcements {
      id title body authorId targetRoles priority isPublished expiresAt
      author { id name }
    }
  }
`;

export const LIST_ALL_ANNOUNCEMENTS = gql`
  query ListAllAnnouncements {
    allAnnouncements {
      id title body authorId targetRoles priority isPublished expiresAt
      author { id name }
    }
  }
`;
