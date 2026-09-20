import { gql } from "@apollo/client";

// Saves the single platform brochure content (JSON string). Super-admin only.
export const UPDATE_BROCHURE_CONTENT = gql`
  mutation UpdateBrochureContent($content: String!) {
    updateBrochureContent(content: $content)
  }
`;
