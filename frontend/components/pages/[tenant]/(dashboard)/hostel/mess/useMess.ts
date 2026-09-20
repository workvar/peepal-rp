"use client";

import { useQuery, useMutation } from "@apollo/client";
import {
  LIST_MESS_MENU,
  LIST_MESS_ATTENDANCE,
  LIST_MESS_EXPENSES,
  MESS_EXPENSE_SUMMARY,
} from "@/graphql/queries/campus";
import {
  SET_MESS_MENU,
  MARK_MESS_ATTENDANCE,
  CREATE_MESS_EXPENSE,
  UPDATE_MESS_EXPENSE,
  DELETE_MESS_EXPENSE,
} from "@/graphql/mutations/campus";
import { GET_HOSTEL_BLOCKS } from "@/graphql/queries/hostel";
import { LIST_VENDORS, LIST_PURCHASE_ORDERS } from "@/graphql/queries/procurement";
import type {
  GqlMessAttendanceRow,
  GqlMessExpense,
  GqlMessMenu,
  PickerBlock,
  PickerPO,
  PickerVendor,
} from "./types";

/** Weekly menu for one block (or campus-wide when blockId is empty). */
export function useMessMenu(blockId: string) {
  const variables = { hostelBlockId: blockId || null };
  const { data, loading } = useQuery(LIST_MESS_MENU, { variables });
  const [setMenuMut] = useMutation(SET_MESS_MENU, {
    refetchQueries: [{ query: LIST_MESS_MENU, variables }],
  });
  const { data: blockData } = useQuery(GET_HOSTEL_BLOCKS);

  return {
    menu: (data?.messMenu ?? []) as GqlMessMenu[],
    blocks: (blockData?.hostelBlocks ?? []) as PickerBlock[],
    loading,
    setMenuMut,
  };
}

/** Meal roster for one date + meal. */
export function useMessAttendance(date: string, meal: string, blockId: string) {
  const variables = { date, meal, hostelBlockId: blockId || null };
  const { data, loading } = useQuery(LIST_MESS_ATTENDANCE, { variables, skip: !date || !meal });
  const [markMut] = useMutation(MARK_MESS_ATTENDANCE, {
    refetchQueries: [{ query: LIST_MESS_ATTENDANCE, variables }],
  });

  return {
    rows: (data?.messAttendance ?? []) as GqlMessAttendanceRow[],
    loading,
    markMut,
  };
}

/** Provisioning expenses for a date range, plus the vendor / PO pickers. */
export function useMessExpenses(from: string, to: string) {
  const variables = { from: from || null, to: to || null, category: null };
  const summaryVariables = { from: from || null, to: to || null };
  const refetchQueries = [
    { query: LIST_MESS_EXPENSES, variables },
    { query: MESS_EXPENSE_SUMMARY, variables: summaryVariables },
  ];

  const { data, loading } = useQuery(LIST_MESS_EXPENSES, { variables });
  const { data: summaryData } = useQuery(MESS_EXPENSE_SUMMARY, { variables: summaryVariables });
  const { data: vendorData } = useQuery(LIST_VENDORS, { variables: { active: true } });
  const { data: poData } = useQuery(LIST_PURCHASE_ORDERS, { variables: {} });

  const [createMut] = useMutation(CREATE_MESS_EXPENSE, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_MESS_EXPENSE, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_MESS_EXPENSE, { refetchQueries });

  return {
    expenses: (data?.messExpenses ?? []) as GqlMessExpense[],
    total: (summaryData?.messExpenseSummary?.total ?? 0) as number,
    vendors: (vendorData?.vendors ?? []) as PickerVendor[],
    purchaseOrders: (poData?.purchaseOrders ?? []) as PickerPO[],
    loading,
    createMut,
    updateMut,
    deleteMut,
  };
}
