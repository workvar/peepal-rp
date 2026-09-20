"use client";

import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlMessExpense } from "./types";

export default function ExpenseTable({
  expenses,
  canWrite,
  onEdit,
  onDelete,
}: {
  expenses: GqlMessExpense[];
  canWrite: boolean;
  onEdit: (e: GqlMessExpense) => void;
  onDelete: (e: GqlMessExpense) => void;
}) {
  if (expenses.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No expenses recorded in this period.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Category</th>
            <th className="table-th">Description</th>
            <th className="table-th">Vendor</th>
            <th className="table-th">PO</th>
            <th className="table-th text-right">Amount</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {expenses.map((e) => (
            <tr key={e.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{e.date}</td>
              <td className="table-td capitalize">{e.category}</td>
              <td className="table-td">{e.description || "—"}</td>
              <td className="table-td">{e.vendorName || "—"}</td>
              <td className="table-td font-mono">{e.poNumber || "—"}</td>
              <td className="table-td text-right font-mono">{e.amount.toFixed(2)}</td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="mess" action="edit">
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => onEdit(e)}>
                        Edit
                      </button>
                    </Can>
                    <Can module="mess" action="delete">
                      <button className="text-red-500 hover:text-red-700 p-1"
                        aria-label="Delete expense" onClick={() => onDelete(e)}>
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
