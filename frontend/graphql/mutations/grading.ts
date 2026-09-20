import { gql } from "@apollo/client";

export const SAVE_GRADING_SCHEME = gql`
  mutation SaveGradingScheme($input: SaveGradingSchemeInput!) {
    saveGradingScheme(input: $input) {
      id
      mode
      gpaMax
      passThreshold
      decimals
      creditWeighted
      weightedByExamType
      bands {
        id
        letter
        minPercent
        maxPercent
        gradePoint
        isPass
        sortOrder
      }
    }
  }
`;
