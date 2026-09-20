"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_WARDS } from "@/graphql/queries/diagnostics";
import {
  CREATE_WARD,
  UPDATE_WARD,
  DELETE_WARD,
  CREATE_BED,
  UPDATE_BED,
  DELETE_BED,
} from "@/graphql/mutations/diagnostics";
import type { GqlWard } from "../ipd/types";

const WARD_VARS = { includeInactive: true };
const refetchQueries = [{ query: LIST_WARDS, variables: WARD_VARS }];

export function useWards() {
  const { data, loading, refetch } = useQuery(LIST_WARDS, { variables: WARD_VARS });

  const [createWardMut] = useMutation(CREATE_WARD, { refetchQueries });
  const [updateWardMut] = useMutation(UPDATE_WARD, { refetchQueries });
  const [deleteWardMut] = useMutation(DELETE_WARD, { refetchQueries });
  const [createBedMut] = useMutation(CREATE_BED, { refetchQueries });
  const [updateBedMut] = useMutation(UPDATE_BED, { refetchQueries });
  const [deleteBedMut] = useMutation(DELETE_BED, { refetchQueries });

  const wards: GqlWard[] = data?.wards ?? [];

  return {
    wards, loading, refetch,
    createWardMut, updateWardMut, deleteWardMut,
    createBedMut, updateBedMut, deleteBedMut,
  };
}
