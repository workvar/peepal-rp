import { gql } from "@apollo/client";

// The schema exposes camelCase fields (publishYear, totalCopies…). We alias them
// to the snake_case keys the LibraryBook / LibraryIssue types use, matching the
// convention in the other modules (see queries/transport.ts). Single-word fields
// (rack, shelf, title…) need no alias.

export const GET_LIBRARY_BOOKS = gql`
  query GetLibraryBooks($search: String, $category: String) {
    libraryBooks(search: $search, category: $category) {
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

export const GET_LIBRARY_ISSUES = gql`
  query GetLibraryIssues {
    libraryIssues {
      id
      book_id: bookId
      user_id: userId
      issue_date: issueDate
      due_date: dueDate
      return_date: returnDate
      status
      fine_amount: fineAmount
      book { id title author isbn rack shelf }
      user { id name email }
    }
  }
`;

export const GET_LIBRARY_OVERDUE = gql`
  query GetLibraryOverdue {
    libraryOverdue {
      id
      book_id: bookId
      user_id: userId
      issue_date: issueDate
      due_date: dueDate
      return_date: returnDate
      status
      fine_amount: fineAmount
      book { id title author isbn rack shelf }
      user { id name email }
    }
  }
`;
