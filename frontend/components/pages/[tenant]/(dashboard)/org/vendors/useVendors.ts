"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_VENDORS } from "@/graphql/queries/procurement";
import {
  CREATE_VENDOR,
  UPDATE_VENDOR,
  DELETE_VENDOR,
} from "@/graphql/mutations/procurement";
import type { GqlVendor } from "./types";

const VARS = {};
const refetchQueries = [{ query: LIST_VENDORS, variables: VARS }];

export function useVendors() {
  const { data, loading, refetch } = useQuery(LIST_VENDORS, { variables: VARS });

  const [createMut] = useMutation(CREATE_VENDOR, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_VENDOR, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_VENDOR, { refetchQueries });

  const vendors: GqlVendor[] = data?.vendors ?? [];

  return { vendors, loading, refetch, createMut, updateMut, deleteMut };
}
