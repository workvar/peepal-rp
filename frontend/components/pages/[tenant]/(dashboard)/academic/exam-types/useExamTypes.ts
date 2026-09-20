"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_EXAM_TYPES } from "@/graphql/queries/academic";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
import {
  CREATE_EXAM_TYPE,
  UPDATE_EXAM_TYPE,
  DELETE_EXAM_TYPE,
} from "@/graphql/mutations/academic";
import type { GqlExamType, GqlDeptRef } from "./types";

// The management page shows active + inactive exams; the marks dropdown queries
// separately (active only, department-filtered).
const VARS = { includeInactive: true };
const refetchQueries = [{ query: LIST_EXAM_TYPES, variables: VARS }];

export function useExamTypes() {
  const { data, loading, refetch } = useQuery(LIST_EXAM_TYPES, { variables: VARS });
  const { data: deptData } = useQuery(LIST_DEPARTMENTS);

  const [createMut] = useMutation(CREATE_EXAM_TYPE, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_EXAM_TYPE, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_EXAM_TYPE, { refetchQueries });

  const examTypes: GqlExamType[] = data?.examTypes ?? [];
  const departments: GqlDeptRef[] = deptData?.departments ?? [];

  return { examTypes, departments, loading, refetch, createMut, updateMut, deleteMut };
}
