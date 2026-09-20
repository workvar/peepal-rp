"use client";

import { useQuery } from "@apollo/client";
import { EXPIRING_DRUGS } from "@/graphql/queries/procurement";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type GqlExpiringBatch = {
  id: string;
  drugId: string;
  drugName?: string | null;
  batchNo: string;
  expiryDate?: string | null;
  qty: number;
};

// Batches expiring within `days` days, soonest first. Batches within a week are
// flagged red, others amber.
export default function ExpiringDrugsPanel({ days = 90 }: { days?: number }) {
  const { data, loading } = useQuery(EXPIRING_DRUGS, { variables: { days } });
  const batches: GqlExpiringBatch[] = data?.expiringDrugs ?? [];

  if (loading) return <LoadingSpinner />;

  if (batches.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No batches expiring in the next {days} days.
      </div>
    );
  }

  const soon = (d?: string | null) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff <= 7;
  };

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Drug</th>
            <th className="table-th">Batch</th>
            <th className="table-th">Expiry</th>
            <th className="table-th">Qty Left</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {batches.map((b) => (
            <tr key={b.id} className="hover:bg-muted/40">
              <td className="table-td font-medium">{b.drugName ?? "—"}</td>
              <td className="table-td font-mono">{b.batchNo}</td>
              <td className="table-td">
                <Badge label={b.expiryDate ?? "—"} variant={soon(b.expiryDate) ? "red" : "yellow"} />
              </td>
              <td className="table-td font-mono">{b.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
