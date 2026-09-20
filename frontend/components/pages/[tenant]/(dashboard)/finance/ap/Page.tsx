"use client";

import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AP_AGING } from "@/graphql/queries/finance";
import AgingTable from "../AgingTable";
import type { GqlAgingRow } from "../types";

export default function AccountsPayablePage() {
  const { data, loading } = useQuery(AP_AGING, { variables: {} });
  const rows: GqlAgingRow[] = data?.accountsPayableAging ?? [];

  return (
    <div>
      <Header
        title="Accounts Payable"
        subtitle="What you owe your vendors, aged from each invoice's due date."
      />
      {loading ? <LoadingSpinner /> : <AgingTable rows={rows} partyLabel="Vendor" />}
    </div>
  );
}
