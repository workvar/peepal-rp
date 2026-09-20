import { gql } from "@apollo/client";

// Ask PeepalAI — natural-language question over the caller's permitted data.
export const ASK_PEEPAL_AI = gql`
  query AskPeepalAI($question: String!) {
    askPeepalAI(question: $question) {
      answer
      sql
      columns
      rows
      denied
      message
    }
  }
`;
