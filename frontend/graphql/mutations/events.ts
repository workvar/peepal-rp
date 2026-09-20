import { gql } from "@apollo/client";

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id title description eventDate endDate location category color isPublic createdBy
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id title description eventDate endDate location category color isPublic
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;

export const CREATE_EVENT_CATEGORY = gql`
  mutation CreateEventCategory($input: CreateEventCategoryInput!) {
    createEventCategory(input: $input) {
      id name slug color description
    }
  }
`;

export const UPDATE_EVENT_CATEGORY = gql`
  mutation UpdateEventCategory($id: ID!, $input: UpdateEventCategoryInput!) {
    updateEventCategory(id: $id, input: $input) {
      id name slug color description
    }
  }
`;

export const DELETE_EVENT_CATEGORY = gql`
  mutation DeleteEventCategory($id: ID!) {
    deleteEventCategory(id: $id)
  }
`;
