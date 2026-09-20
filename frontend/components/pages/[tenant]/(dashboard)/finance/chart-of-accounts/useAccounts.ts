"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_ACCOUNTS } from "@/graphql/queries/finance";
import {
  CREATE_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
  CREATE_MANUAL_JOURNAL,
} from "@/graphql/mutations/finance";
import type { GqlAccount } from "../types";

const refetchQueries = [{ query: LIST_ACCOUNTS, variables: {} }];

export function useAccounts() {
  const { data, loading } = useQuery(LIST_ACCOUNTS, { variables: {} });

  const [createAccountMut] = useMutation(CREATE_ACCOUNT, { refetchQueries });
  const [updateAccountMut] = useMutation(UPDATE_ACCOUNT, { refetchQueries });
  const [deleteAccountMut] = useMutation(DELETE_ACCOUNT, { refetchQueries });
  const [createJournalMut] = useMutation(CREATE_MANUAL_JOURNAL, { refetchQueries });

  const accounts: GqlAccount[] = data?.accounts ?? [];

  return {
    accounts,
    loading,
    createAccountMut,
    updateAccountMut,
    deleteAccountMut,
    createJournalMut,
  };
}
