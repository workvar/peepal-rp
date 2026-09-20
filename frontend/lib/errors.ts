import { ApolloError } from "@apollo/client";

/**
 * Extracts a human-readable message from an unknown caught error.
 * Prefers the first GraphQL error when the failure came from Apollo,
 * so resolver messages ("roll number already exists") surface as-is.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApolloError) {
    return err.graphQLErrors[0]?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string" && err) return err;
  return fallback;
}
