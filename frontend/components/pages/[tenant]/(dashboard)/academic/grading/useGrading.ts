"use client";

import { useQuery, useMutation } from "@apollo/client";
import { GRADING_SCHEME } from "@/graphql/queries/grading";
import { SAVE_GRADING_SCHEME } from "@/graphql/mutations/grading";
import type { GqlGradingScheme } from "@/types/grading";

export function useGrading() {
  const { data, loading } = useQuery(GRADING_SCHEME);
  const [saveMut, { loading: saving }] = useMutation(SAVE_GRADING_SCHEME, {
    refetchQueries: [{ query: GRADING_SCHEME }],
  });
  const scheme: GqlGradingScheme | null = data?.gradingScheme ?? null;
  return { scheme, loading, saveMut, saving };
}
