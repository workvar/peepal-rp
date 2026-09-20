"use client";

import Can from "@/components/access/Can";
import { Pencil, Trash2, Lock } from "lucide-react";
import type { GqlAccount } from "../types";

const TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"];

export default function AccountsTable({
  accounts,
  onEdit,
  onDelete,
}: {
  accounts: GqlAccount[];
  onEdit: (a: GqlAccount) => void;
  onDelete: (a: GqlAccount) => void;
}) {
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    rows: accounts.filter((a) => a.type === type),
  })).filter((g) => g.rows.length > 0);

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No accounts yet.</p>;
  }

  return (
    <div className="space-y-6">
      {grouped.map((g) => (
        <div key={g.type}>
          <h3 className="text-sm font-semibold capitalize text-muted-foreground mb-2">{g.type}</h3>
          <div className="border rounded-lg divide-y">
            {g.rows.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground w-14">{a.code}</span>
                  <span>{a.name}</span>
                  {a.isSystem && <Lock size={12} className="text-muted-foreground" />}
                  {!a.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                </div>
                <div className="flex items-center gap-3">
                  <Can module="chart-of-accounts" action="edit">
                    <button onClick={() => onEdit(a)} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={15} />
                    </button>
                  </Can>
                  {!a.isSystem && (
                    <Can module="chart-of-accounts" action="delete">
                      <button onClick={() => onDelete(a)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
