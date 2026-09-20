import { gql } from "@apollo/client";

// Output selections alias camelCase -> snake_case to match the TS types (same
// convention as the other modules). Input variables are sent with the schema's
// camelCase field names (publishYear, totalCopies, bookId, dueDate…).

export const CREATE_LIBRARY_BOOK = gql`
  mutation CreateLibraryBook($input: CreateLibraryBookInput!) {
    createLibraryBook(input: $input) {
      id
      title
      author
      isbn
      publisher
      publish_year: publishYear
      category
      total_copies: totalCopies
      available_copies: availableCopies
      rack
      shelf
    }
  }
`;

export const UPDATE_LIBRARY_BOOK = gql`
  mutation UpdateLibraryBook($id: ID!, $input: UpdateLibraryBookInput!) {
    updateLibraryBook(id: $id, input: $input) {
      id
      title
      author
      isbn
      publisher
      publish_year: publishYear
      category
      total_copies: totalCopies
      available_copies: availableCopies
      rack
      shelf
    }
  }
`;

export const DELETE_LIBRARY_BOOK = gql`
  mutation DeleteLibraryBook($id: ID!) {
    deleteLibraryBook(id: $id)
  }
`;

export const ISSUE_LIBRARY_BOOK = gql`
  mutation IssueLibraryBook($input: IssueLibraryBookInput!) {
    issueLibraryBook(input: $input) {
      id
      book_id: bookId
      user_id: userId
      issue_date: issueDate
      due_date: dueDate
      return_date: returnDate
      status
      fine_amount: fineAmount
      book { id title author }
      user { id name email }
    }
  }
`;

export const RETURN_LIBRARY_BOOK = gql`
  mutation ReturnLibraryBook($id: ID!, $input: ReturnLibraryBookInput!) {
    returnLibraryBook(id: $id, input: $input) {
      id
      book_id: bookId
      user_id: userId
      issue_date: issueDate
      due_date: dueDate
      return_date: returnDate
      status
      fine_amount: fineAmount
    }
  }
`;
