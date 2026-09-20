import { gql } from "@apollo/client";

export const LIST_EVENTS = gql`
  query ListEvents($category: String) {
    events(category: $category) {
      id title description eventDate endDate location category color isPublic createdBy
    }
  }
`;

export const LIST_EVENT_CATEGORIES = gql`
  query ListEventCategories {
    eventCategories {
      id name slug color description
    }
  }
`;
