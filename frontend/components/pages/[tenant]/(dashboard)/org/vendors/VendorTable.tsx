"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlVendor } from "./types";

export default function VendorTable({
  vendors,
  canWrite,
  onEdit,
  onDelete,
  onDeleteMany,
}: {
  vendors: GqlVendor[];
  canWrite: boolean;
  onEdit: (v: GqlVendor) => void;
  onDelete: (v: GqlVendor) => void;
  onDeleteMany?: (vendors: GqlVendor[]) => void;
}) {
  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drop ids that no longer exist (e.g. after a delete/refetch).
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(vendors.map((v) => v.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [vendors]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = vendors.length > 0 && vendors.every((v) => selected.has(v.id));
  const someSelected = vendors.some((v) => selected.has(v.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) vendors.forEach((v) => next.delete(v.id));
      else vendors.forEach((v) => next.add(v.id));
      return next;
    });

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected && !allSelected;
  });

  // ── Lazy loading (render in pages, grow on scroll) ────────────────────────
  const PAGE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [vendors.length]);
  const visible = vendors.slice(0, visibleCount);
  const hasMore = visibleCount < vendors.length;

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE, vendors.length));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, vendors.length]);

  if (vendors.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No vendors yet. Add a supplier to raise purchase orders against it.
      </div>
    );
  }

  const cols = (canWrite ? 1 : 0) + 5 + (canWrite ? 1 : 0); // checkbox + 5 data + actions

  return (
    <div>
      {canWrite && selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
            <button className="ml-3 text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </span>
          <Can module="vendors" action="delete">
            <button className="btn-danger flex items-center gap-2 text-sm"
              onClick={() => onDeleteMany?.(vendors.filter((v) => selected.has(v.id)))}>
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
                  <input ref={headerCbRef} type="checkbox" aria-label="Select all"
                    checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              <th className="table-th">Vendor</th>
              <th className="table-th">Code</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Terms</th>
              <th className="table-th">Status</th>
              {canWrite && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.map((v) => {
              const isSel = selected.has(v.id);
              return (
                <tr key={v.id} className={`hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""}`}>
                  {canWrite && (
                    <td className="table-td w-10">
                      <input type="checkbox" aria-label={`Select ${v.name}`}
                        checked={isSel} onChange={() => toggleOne(v.id)} />
                    </td>
                  )}
                  <td className="table-td font-medium">{v.name}</td>
                  <td className="table-td font-mono">{v.code || "—"}</td>
                  <td className="table-td">
                    {v.contactName || v.phone || v.email || (
                      <span className="text-muted-foreground/70">—</span>
                    )}
                  </td>
                  <td className="table-td">{v.paymentTerms || "—"}</td>
                  <td className="table-td">
                    <Badge label={v.active ? "Active" : "Inactive"} variant={v.active ? "green" : "gray"} />
                  </td>
                  {canWrite && (
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Can module="vendors" action="edit">
                          <button onClick={() => onEdit(v)} className="text-sm text-blue-600 hover:underline">
                            Edit
                          </button>
                        </Can>
                        <Can module="vendors" action="delete">
                          <button
                            onClick={() => onDelete(v)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label={`Delete ${v.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={cols} className="table-td text-center text-sm text-muted-foreground/70 py-4">
                  Loading more…
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
          Showing {visible.length} of {vendors.length}
        </div>
      </div>
    </div>
  );
}
