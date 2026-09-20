import { gql } from "@apollo/client";

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id code name type parentId isSystem active
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      id code name type parentId isSystem active
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;

export const CREATE_MANUAL_JOURNAL = gql`
  mutation CreateManualJournal($input: CreateManualJournalInput!) {
    createManualJournal(input: $input) {
      id date memo posted
      lines { id accountId accountCode debit credit memo }
    }
  }
`;
