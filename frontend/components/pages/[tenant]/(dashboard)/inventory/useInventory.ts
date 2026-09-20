"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_INVENTORY_ITEMS } from "@/graphql/queries/operations";
import { LIST_DRUGS } from "@/graphql/queries/clinical";
import {
  CREATE_INVENTORY_ITEM, UPDATE_INVENTORY_ITEM, DELETE_INVENTORY_ITEM,
  RECEIVE_STOCK, ADJUST_INVENTORY_STOCK, ISSUE_TO_PHARMACY,
} from "@/graphql/mutations/operations";
import type { GqlInventoryItem } from "./types";
import type { GqlDrug } from "../pharmacy/types";

const ITEM_VARS = { includeInactive: true };
const refetchQueries = [{ query: LIST_INVENTORY_ITEMS, variables: ITEM_VARS }];

export function useInventory() {
  const { data, loading, refetch: refetchItems } = useQuery(LIST_INVENTORY_ITEMS, { variables: ITEM_VARS });
  const { data: drugData } = useQuery(LIST_DRUGS, { variables: { includeInactive: false } });

  const [createItemMut] = useMutation(CREATE_INVENTORY_ITEM, { refetchQueries });
  const [updateItemMut] = useMutation(UPDATE_INVENTORY_ITEM, { refetchQueries });
  const [deleteItemMut] = useMutation(DELETE_INVENTORY_ITEM, { refetchQueries });
  const [receiveMut] = useMutation(RECEIVE_STOCK, { refetchQueries });
  const [adjustMut] = useMutation(ADJUST_INVENTORY_STOCK, { refetchQueries });
  const [issueMut] = useMutation(ISSUE_TO_PHARMACY, { refetchQueries });

  const items: GqlInventoryItem[] = data?.inventoryItems ?? [];
  const drugs: GqlDrug[] = drugData?.drugs ?? [];

  return { items, drugs, loading, createItemMut, updateItemMut, deleteItemMut, receiveMut, adjustMut, issueMut, refetchItems };
}
