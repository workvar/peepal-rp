import { gql } from "@apollo/client";

// Shared fragment: one role column with its per-module CRUD flags.
const ROLE_ACCESS_FIELDS = `
  subjectType
  subjectKey
  label
  isCustom
  modules { module canView canCreate canEdit canDelete }
`;

// Full matrix for the admin editor: module metadata + every role column.
export const GET_ACCESS_MATRIX = gql`
  query AccessMatrix {
    accessMatrix {
      modules { id label group }
      roles { ${ROLE_ACCESS_FIELDS} }
    }
  }
`;

// The current user's own effective access — drives nav + route guards.
export const GET_MY_ACCESS = gql`
  query MyAccess {
    myAccess { module canView canCreate canEdit canDelete }
  }
`;

export { ROLE_ACCESS_FIELDS };
