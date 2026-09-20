import { gql } from "@apollo/client";

// Mutations for Phase 4 — General Staff Duty Roster (cross-industry HR).

export const CREATE_DUTY_ROSTER = gql`
  mutation CreateDutyRoster($input: CreateDutyRosterInput!) {
    createDutyRoster(input: $input) { id }
  }
`;

export const UPDATE_DUTY_ROSTER = gql`
  mutation UpdateDutyRoster($id: ID!, $input: UpdateDutyRosterInput!) {
    updateDutyRoster(id: $id, input: $input) { id }
  }
`;

export const DELETE_DUTY_ROSTER = gql`
  mutation DeleteDutyRoster($id: ID!) {
    deleteDutyRoster(id: $id)
  }
`;

export const BULK_SET_DUTY_ROSTER = gql`
  mutation BulkSetDutyRoster($input: BulkSetDutyRosterInput!) {
    bulkSetDutyRoster(input: $input) {
      created
      failed
      errors
    }
  }
`;
