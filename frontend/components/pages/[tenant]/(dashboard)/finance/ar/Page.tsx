"use client";

import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AR_AGING } from "@/graphql/queries/finance";
import AgingTable from "../AgingTable";
import type { GqlAgingRow } from "../types";

export default function AccountsReceivablePage() {
  const { data, loading } = useQuery(AR_AGING, { variables: {} });
  const rows: GqlAgingRow[] = data?.accountsReceivableAging ?? [];

  return (
    <div>
      <Header
        title="Accounts Receivable"
        subtitle="What is owed to you, aged by how long it has been outstanding."
      />
      {loading ? <LoadingSpinner /> : <AgingTable rows={rows} partyLabel="Debtor" />}
    </div>
  );
}
