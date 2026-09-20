import { gql } from "@apollo/client";

// Saves the tenant's OPD slip design (JSON string). Admin only.
export const UPDATE_OPD_SLIP_CONFIG = gql`
  mutation UpdateOpdSlipConfig($content: String!) {
    updateOpdSlipConfig(content: $content)
  }
`;
