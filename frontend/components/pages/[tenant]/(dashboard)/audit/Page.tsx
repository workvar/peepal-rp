"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { LIST_AUDIT_LOGS } from "@/graphql/queries/extended";

// "bulk" is not a real action (bulk rows are stored as create + operation
// bulk_upload); it is filtered client-side below.
const ACTIONS = ["", "create", "update", "delete", "login", "bulk"];
const actionLabel = (a: string) => (a === "" ? "All actions" : a === "bulk" ? "Bulk upload" : a);
const actionVariant = (a: string): "green" | "blue" | "red" | "purple" | "gray" =>
  a === "create" ? "green" : a === "update" ? "blue" : a === "delete" ? "red" : a === "login" ? "purple" : "gray";

export default function AuditPage() {
  const [action, setAction] = useState("");
  // Bulk entries carry action=create, so query the server for creates and
  // narrow to bulk_upload operations in the browser.
  const serverAction = action === "bulk" ? "create" : action;
  const { data, loading } = useQuery(LIST_AUDIT_LOGS, { variables: { action: serverAction || null, limit: 300 } });
  const allLogs = data?.auditLogs ?? [];
  const logs = action === "bulk"
    ? allLogs.filter((l: { operation?: string | null }) => l.operation === "bulk_upload")
    : allLogs;

  return (
    <div>
      <Header title="Audit Trail" subtitle="Every write and login, most recent first" />
      <div className="mb-3 flex gap-3">
        <select className="input-field w-48" value={action} onChange={(e) => setAction(e.target.value)}>
          {ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : logs.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No audit entries.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr>
              <th className="table-th">Time</th><th className="table-th">Actor</th><th className="table-th">Action</th>
              <th className="table-th">Module</th><th className="table-th">Operation</th><th className="table-th">Entity</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((l: { id: string; createdAt: string; actorName?: string | null; actorRole?: string | null; action: string; module?: string | null; operation?: string | null; entityId?: string | null; detail?: string | null }) => {
                const isBulk = l.operation === "bulk_upload";
                return (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="table-td whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="table-td">{l.actorName || "—"}<span className="text-xs text-muted-foreground/70 ml-1">{l.actorRole}</span></td>
                  <td className="table-td"><Badge label={l.action} variant={actionVariant(l.action)} className="capitalize" /></td>
                  <td className="table-td text-xs">{l.module || "—"}</td>
                  <td className="table-td font-mono text-xs">
                    {isBulk ? <Badge label="Bulk upload" variant="purple" /> : (l.operation || "—")}
                    {isBulk && l.detail ? <span className="ml-2 font-sans text-[11px] text-muted-foreground/70">{l.detail}</span> : null}
                  </td>
                  <td className="table-td font-mono text-[11px] text-muted-foreground/70">{l.entityId ? l.entityId.slice(0, 8) : "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
