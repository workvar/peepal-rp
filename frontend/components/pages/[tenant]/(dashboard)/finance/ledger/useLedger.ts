"use client";

import { useQuery } from "@apollo/client";
import { LEDGER_BATCHES } from "@/graphql/queries/finance";
import type { GqlLedgerBatch } from "../types";

export function useLedger(vars: { from?: string; to?: string; sourceType?: string }) {
  const { data, loading } = useQuery(LEDGER_BATCHES, { variables: vars });
  const batches: GqlLedgerBatch[] = data?.ledgerBatches ?? [];
  return { batches, loading };
}
