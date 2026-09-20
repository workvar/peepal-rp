"use client";

import { useQuery, useMutation } from "@apollo/client";
import {
  LIST_PURCHASE_ORDERS,
  LIST_PURCHASE_INVOICES,
  LIST_VENDORS,
} from "@/graphql/queries/procurement";
import { LIST_INVENTORY_ITEMS } from "@/graphql/queries/operations";
import {
  CREATE_PURCHASE_ORDER,
  UPDATE_PURCHASE_ORDER,
  SET_PURCHASE_ORDER_STATUS,
  RECEIVE_PURCHASE_ORDER,
  DELETE_PURCHASE_ORDER,
  CREATE_PURCHASE_INVOICE,
  RECORD_PURCHASE_PAYMENT,
  DELETE_PURCHASE_INVOICE,
} from "@/graphql/mutations/procurement";
import type {
  GqlPurchaseOrder,
  GqlPurchaseInvoice,
  GqlVendorRef,
  GqlInventoryItemRef,
} from "./types";

const ITEM_VARS = { includeInactive: false };

// Both mutations that change orders/invoices refetch the two lists so the tabs
// stay in sync from one place.
const refetchQueries = [
  { query: LIST_PURCHASE_ORDERS, variables: {} },
  { query: LIST_PURCHASE_INVOICES, variables: {} },
];

export function usePurchaseOrders() {
  const ordersQ = useQuery(LIST_PURCHASE_ORDERS, { variables: {} });
  const invoicesQ = useQuery(LIST_PURCHASE_INVOICES, { variables: {} });
  const vendorsQ = useQuery(LIST_VENDORS, { variables: { active: true } });
  const itemsQ = useQuery(LIST_INVENTORY_ITEMS, { variables: ITEM_VARS });

  const [createPO] = useMutation(CREATE_PURCHASE_ORDER, { refetchQueries });
  const [updatePO] = useMutation(UPDATE_PURCHASE_ORDER, { refetchQueries });
  const [setStatus] = useMutation(SET_PURCHASE_ORDER_STATUS, { refetchQueries });
  const [receivePO] = useMutation(RECEIVE_PURCHASE_ORDER, { refetchQueries });
  // Bulk delete calls this in a loop, so skip per-call refetch and let the
  // caller refetch once at the end.
  const [deletePO] = useMutation(DELETE_PURCHASE_ORDER);
  const [createInvoice] = useMutation(CREATE_PURCHASE_INVOICE, { refetchQueries });
  const [recordPayment] = useMutation(RECORD_PURCHASE_PAYMENT, { refetchQueries });
  const [deleteInvoice] = useMutation(DELETE_PURCHASE_INVOICE, { refetchQueries });

  const orders: GqlPurchaseOrder[] = ordersQ.data?.purchaseOrders ?? [];
  const invoices: GqlPurchaseInvoice[] = invoicesQ.data?.purchaseInvoices ?? [];
  const vendors: GqlVendorRef[] = vendorsQ.data?.vendors ?? [];
  const items: GqlInventoryItemRef[] = itemsQ.data?.inventoryItems ?? [];

  return {
    orders,
    invoices,
    vendors,
    items,
    loading: ordersQ.loading || invoicesQ.loading,
    refetch: () => {
      ordersQ.refetch();
      invoicesQ.refetch();
    },
    refetchOrders: () => ordersQ.refetch(),
    createPO,
    updatePO,
    setStatus,
    receivePO,
    deletePO,
    createInvoice,
    recordPayment,
    deleteInvoice,
  };
}
