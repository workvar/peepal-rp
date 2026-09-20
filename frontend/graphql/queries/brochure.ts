import { gql } from "@apollo/client";

// Returns the saved brochure content as a JSON string (or null if unset).
export const BROCHURE_CONTENT = gql`
  query BrochureContent {
    brochureContent
  }
`;
