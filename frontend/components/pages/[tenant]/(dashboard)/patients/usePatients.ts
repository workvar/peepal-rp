"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_PATIENTS } from "@/graphql/queries/clinical";
import {
  CREATE_PATIENT,
  UPDATE_PATIENT,
  DELETE_PATIENT,
} from "@/graphql/mutations/clinical";
import type { GqlPatient } from "./types";

// The registry loads a recent slice and filters client-side, like the other
// management pages. Server-side search/pagination is available on the query
// when a tenant outgrows this.
const VARS = { limit: 500 };
const refetchQueries = [{ query: LIST_PATIENTS, variables: VARS }];

export function usePatients() {
  const { data, loading, refetch } = useQuery(LIST_PATIENTS, { variables: VARS });

  const [createMut] = useMutation(CREATE_PATIENT, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_PATIENT, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_PATIENT, { refetchQueries });

  const patients: GqlPatient[] = data?.patients ?? [];

  return { patients, loading, refetch, createMut, updateMut, deleteMut };
}
