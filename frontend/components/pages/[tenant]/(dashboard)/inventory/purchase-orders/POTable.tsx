"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Download, Trash2 } from "lucide-react";
import type { GqlPurchaseOrder } from "./types";
import { PO_STATUS_LABELS } from "./types";
import { API_BASE_URL } from "@/config";

const statusVariant: Record<string, "gray" | "blue" | "yellow" | "green" | "red"> = {
  draft: "gray",
  ordered: "blue",
  partially_received: "yellow",
  received: "green",
  cancelled: "red",
};

// A PO with received stock can't be deleted (backend blocks it), so we only
// offer selection on orders that are safe to remove.
const isDeletable = (s: string) => s !== "received" && s !== "partially_received";

const PAGE = 40;

export default function POTable({
  orders,
  canWrite,
  onEdit,
  onReceive,
  onDelete,
}: {
  orders: GqlPurchaseOrder[];
  canWrite: boolean;
  onEdit: (p: GqlPurchaseOrder) => void;
  onReceive: (p: GqlPurchaseOrder) => void;
  onDelete: (orders: GqlPurchaseOrder[]) => void;
}) {
  const canReceive = (s: string) => s === "ordered" || s === "partially_received" || s === "draft";

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deletable = orders.filter((p) => isDeletable(p.status));

  // Drop ids that no longer exist after a refetch.
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(orders.map((p) => p.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [orders]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = deletable.length > 0 && deletable.every((p) => selected.has(p.id));
  const someSelected = deletable.some((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) deletable.forEach((p) => next.delete(p.id));
      else deletable.forEach((p) => next.add(p.id));
      return next;
    });

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected && !allSelected;
  });

  const removeSelected = () => {
    const list = orders.filter((p) => selected.has(p.id));
    if (list.length === 0) return;
    onDelete(list);
    setSelected(new Set());
  };

  // ── Lazy loading (render in pages, grow on scroll) ────────────────────────
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [orders.length]);
  const visible = orders.slice(0, visibleCount);
  const hasMore = visibleCount < orders.length;

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE, orders.length));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, orders.length]);

  if (orders.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No purchase orders yet. Create one to order stock from a vendor.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canWrite && selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
            <button
              className="ml-3 text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </span>
          <Can module="purchase-orders" action="delete">
            <button className="btn-danger flex items-center gap-2 text-sm" onClick={removeSelected}>
              <Trash2 size={15} /> Delete {selected.size}
            </button>
          </Can>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              {canWrite && (
                <th className="table-th w-10">
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    aria-label="Select all deletable"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={deletable.length === 0}
                  />
                </th>
              )}
              <th className="table-th">PO #</th>
              <th className="table-th">Vendor</th>
              <th className="table-th">Order Date</th>
              <th className="table-th">Total</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <tr key={p.id} className={`hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""}`}>
                  {canWrite && (
                    <td className="table-td w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.poNumber}`}
                        checked={isSel}
                        onChange={() => toggleOne(p.id)}
                        disabled={!isDeletable(p.status)}
                      />
                    </td>
                  )}
                  <td className="table-td font-mono">{p.poNumber}</td>
                  <td className="table-td">{p.vendor?.name ?? "—"}</td>
                  <td className="table-td">{p.orderDate ?? "—"}</td>
                  <td className="table-td font-mono">{p.total.toFixed(2)}</td>
                  <td className="table-td">
                    <Badge label={PO_STATUS_LABELS[p.status] ?? p.status} variant={statusVariant[p.status] ?? "gray"} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <a
                        href={`${API_BASE_URL}/procurement/purchase-orders/${p.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label={`Download ${p.poNumber}`}
                      >
                        <Download size={15} />
                      </a>
                      {canWrite && p.status === "draft" && (
                        <Can module="purchase-orders" action="edit">
                          <button onClick={() => onEdit(p)} className="text-sm text-blue-600 hover:underline">
                            Edit
                          </button>
                        </Can>
                      )}
                      {canWrite && canReceive(p.status) && (
                        <Can module="purchase-orders" action="edit">
                          <button onClick={() => onReceive(p)} className="text-sm text-emerald-600 hover:underline">
                            Receive
                          </button>
                        </Can>
                      )}
                      {canWrite && isDeletable(p.status) && (
                        <Can module="purchase-orders" action="delete">
                          <button
                            onClick={() => onDelete([p])}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label={`Delete ${p.poNumber}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={canWrite ? 7 : 6} className="table-td text-center text-sm text-muted-foreground/70 py-4">
                  Loading more…
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
          Showing {visible.length} of {orders.length}
        </div>
      </div>
    </div>
  );
}
