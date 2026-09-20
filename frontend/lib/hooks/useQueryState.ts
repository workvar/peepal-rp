"use client";

import { useQuery } from "@apollo/client";
import type { DocumentNode, OperationVariables, QueryHookOptions } from "@apollo/client";

export interface ListQueryState<TRow> {
  rows: TRow[];
  loading: boolean;
  /** Ready-to-render message; null when the query succeeded. */
  errorMessage: string | null;
  refetch: () => void;
}

/**
 * useListQuery wraps Apollo useQuery for the common list-page shape:
 * pull a single array field out of the result, default it to [],
 * and surface the error as a renderable message instead of being dropped.
 *
 *   const { rows: leaves, loading, errorMessage, refetch } =
 *     useListQuery<GqlLeave>(LIST_LEAVES, "leaves");
 */
export function useListQuery<TRow, TVars extends OperationVariables = OperationVariables>(
  query: DocumentNode,
  field: string,
  options?: QueryHookOptions<Record<string, unknown>, TVars>,
): ListQueryState<TRow> {
  const { data, loading, error, refetch } = useQuery<Record<string, unknown>, TVars>(query, options);
  const value = data?.[field];
  const rows = (Array.isArray(value) ? value : []) as TRow[];
  return {
    rows,
    loading,
    errorMessage: error ? error.message : null,
    refetch: () => {
      void refetch();
    },
  };
}
