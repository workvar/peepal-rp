import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import {
  GET_LIBRARY_BOOKS,
  GET_LIBRARY_ISSUES,
  GET_LIBRARY_OVERDUE,
} from "@/graphql/queries/library";
import {
  CREATE_LIBRARY_BOOK,
  UPDATE_LIBRARY_BOOK,
  DELETE_LIBRARY_BOOK,
  ISSUE_LIBRARY_BOOK,
  RETURN_LIBRARY_BOOK,
} from "@/graphql/mutations/library";
import type { LibraryBook, LibraryIssue } from "@/types";

interface LibraryState {
  books: LibraryBook[];
  issues: LibraryIssue[];
  overdue: LibraryIssue[];
  loading: boolean;
  error: string | null;
}

const initialState: LibraryState = {
  books: [],
  issues: [],
  overdue: [],
  loading: false,
  error: null,
};

// ── Books ───────────────────────────────────────────────────────
export const fetchBooks = createAsyncThunk(
  "library/fetchBooks",
  async (params?: { search?: string; category?: string }) => {
    const { data } = await apolloClient.query({
      query: GET_LIBRARY_BOOKS,
      variables: { search: params?.search, category: params?.category },
      fetchPolicy: "network-only",
    });
    return data.libraryBooks as LibraryBook[];
  }
);

export const createBook = createAsyncThunk(
  "library/createBook",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_LIBRARY_BOOK,
        variables: { input },
      });
      return data.createLibraryBook as LibraryBook;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create book");
    }
  }
);

export const updateBook = createAsyncThunk(
  "library/updateBook",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_LIBRARY_BOOK,
        variables: { id, input },
      });
      return data.updateLibraryBook as LibraryBook;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update book");
    }
  }
);

export const deleteBook = createAsyncThunk(
  "library/deleteBook",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_LIBRARY_BOOK, variables: { id } });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete book");
    }
  }
);

// ── Issues ──────────────────────────────────────────────────────
export const fetchIssues = createAsyncThunk("library/fetchIssues", async () => {
  const { data } = await apolloClient.query({
    query: GET_LIBRARY_ISSUES,
    fetchPolicy: "network-only",
  });
  return data.libraryIssues as LibraryIssue[];
});

export const issueBook = createAsyncThunk(
  "library/issueBook",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: ISSUE_LIBRARY_BOOK,
        variables: { input },
      });
      return data.issueLibraryBook as LibraryIssue;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to issue book");
    }
  }
);

export const returnBook = createAsyncThunk(
  "library/returnBook",
  async (
    { id, input }: { id: string; input: { returnDate: string; fineAmount?: number } },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: RETURN_LIBRARY_BOOK,
        variables: { id, input },
      });
      return data.returnLibraryBook as LibraryIssue;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to return book");
    }
  }
);

// ── Overdue ─────────────────────────────────────────────────────
export const fetchOverdue = createAsyncThunk("library/fetchOverdue", async () => {
  const { data } = await apolloClient.query({
    query: GET_LIBRARY_OVERDUE,
    fetchPolicy: "network-only",
  });
  return data.libraryOverdue as LibraryIssue[];
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBooks.pending, (state) => { state.loading = true; })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.books.push(action.payload);
      })
      .addCase(updateBook.fulfilled, (state, action) => {
        const idx = state.books.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.books[idx] = action.payload;
      })
      .addCase(deleteBook.fulfilled, (state, action) => {
        state.books = state.books.filter((b) => b.id !== action.payload);
      })
      .addCase(fetchIssues.pending, (state) => { state.loading = true; })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = action.payload;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(issueBook.fulfilled, (state, action) => {
        state.issues.push(action.payload);
      })
      .addCase(returnBook.fulfilled, (state, action) => {
        const idx = state.issues.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.issues[idx] = action.payload;
      })
      .addCase(fetchOverdue.pending, (state) => { state.loading = true; })
      .addCase(fetchOverdue.fulfilled, (state, action) => {
        state.loading = false;
        state.overdue = action.payload;
      })
      .addCase(fetchOverdue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      });
  },
});

export default librarySlice.reducer;
