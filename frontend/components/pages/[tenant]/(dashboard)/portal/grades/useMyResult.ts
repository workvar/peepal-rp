"use client";

import { useQuery } from "@apollo/client";
import { STUDENT_ACADEMIC_RESULT } from "@/graphql/queries/grading";
import type { GqlAcademicResult } from "@/types/grading";

// Students get their own result (the resolver ignores studentId for students).
export function useMyResult() {
  const { data, loading, error } = useQuery(STUDENT_ACADEMIC_RESULT, {
    fetchPolicy: "cache-and-network",
  });
  const result: GqlAcademicResult | null = data?.studentAcademicResult ?? null;
  return { result, loading, error };
}
