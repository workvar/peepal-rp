"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Plus, PackagePlus, ArrowRightLeft, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "./useInventory";
import ItemModal from "./ItemModal";
import type { GqlInventoryItem, ItemForm } from "./types";

type StockAction = { item: GqlInventoryItem; mode: "receive" | "adjust" | "issue" };

export default function InventoryPage() {
  const { items, drugs, loading, createItemMut, updateItemMut, deleteItemMut, receiveMut, adjustMut, issueMut, refetchItems } = useInventory();

  const [itemModal, setItemModal] = useState<{ open: boolean; editing: GqlInventoryItem | null }>({ open: false, editing: null });
  const [stockAction, setStockAction] = useState<StockAction | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [search, setSearch] = useState("");

  const saveItem = async (editing: GqlInventoryItem | null, form: ItemForm) => {
    const base = {
      code: form.code.trim(), name: form.name.trim(), category: form.category, unit: form.unit || null,
      reorderLevel: parseFloat(form.reorder_level) || 0, unitCost: parseFloat(form.unit_cost) || 0,
      linkedDrugId: form.linked_drug_id || null,
    };
    try {
      if (editing) {
        await updateItemMut({ variables: { id: editing.id, input: base } });
        toast.success("Item updated");
      } else {
        await createItemMut({ variables: { input: { ...base, openingStock: parseFloat(form.opening_stock) || 0 } } });
        toast.success("Item added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
      throw err;
    }
  };

  const deleteItem = (it: GqlInventoryItem) => setConfirmState({
    title: "Delete Item", message: `Remove “${it.name}” and its stock history?`, variant: "danger", confirmLabel: "Delete",
    onConfirm: async () => {
      try { await deleteItemMut({ variables: { id: it.id } }); toast.success("Deleted"); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    },
  });

  const openStock = (item: GqlInventoryItem, mode: StockAction["mode"]) => {
    setQty(""); setReason(""); setStockAction({ item, mode });
  };

  const submitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAction) return;
    const n = parseFloat(qty);
    if (!n) return;
    setSaving(true);
    try {
      const id = stockAction.item.id;
      if (stockAction.mode === "receive") await receiveMut({ variables: { itemId: id, qty: n, reason: reason || null } });
      else if (stockAction.mode === "adjust") await adjustMut({ variables: { itemId: id, delta: n, reason: reason || null } });
      else await issueMut({ variables: { itemId: id, qty: n } });
      toast.success("Stock updated");
      setStockAction(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = q ? items.filter((it) => [it.name, it.code, it.category].some((v) => String(v ?? "").toLowerCase().includes(q))) : items;

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(items.map((it) => it.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id));
  const someFilteredSelected = filtered.some((it) => selected.has(it.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((it) => next.delete(it.id));
      else filtered.forEach((it) => next.add(it.id));
      return next;
    });

  const deleteMany = () => {
    const list = items.filter((it) => selected.has(it.id));
    if (list.length === 0) return;
    setConfirmState({
      title: `Delete ${list.length} item${list.length > 1 ? "s" : ""}`,
      message: `${list.length} item${list.length > 1 ? "s" : ""} and their stock history will be removed. This cannot be undone.`,
      variant: "danger",
      confirmLabel: `Delete ${list.length}`,
      onConfirm: async () => {
        let ok = 0;
        for (const it of list) {
          try {
            await deleteItemMut({ variables: { id: it.id }, refetchQueries: [] });
            ok++;
          } catch {
            // continue; report at the end
          }
        }
        await refetchItems();
        const failed = list.length - ok;
        if (failed === 0) toast.success(`Deleted ${ok}`);
        else toast.error(`Deleted ${ok}, ${failed} failed`);
      },
    });
  };

  // ── Lazy loading (render in pages, grow on scroll) ────────────────────────
  const PAGE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [search, items.length]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE, filtered.length));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
  });

  return (
    <div>
      <Header title="Inventory & Stores" subtitle="Consumables and reagents; issue stock into the pharmacy" />

      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search item or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Can module="inventory" action="create">
          <BulkUploadButton resource="inventory_items" label="Bulk Items"
            onFinished={(st) => { if (st.successful > 0) refetchItems(); }} />
          <button className="btn-primary flex items-center gap-2" onClick={() => setItemModal({ open: true, editing: null })}>
            <Plus size={16} /> Add Item
          </button>
        </Can>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
            <button className="ml-3 text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </span>
          <Can module="inventory" action="delete">
            <button className="btn-danger flex items-center gap-2 text-sm" onClick={deleteMany}>
              <Trash2 size={15} /> Delete {selected.size}
            </button>
          </Can>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No inventory items yet.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th w-10">
                  <input ref={headerCbRef} type="checkbox" aria-label="Select all" checked={allFilteredSelected} onChange={toggleAll} />
                </th>
                <th className="table-th">Code</th>
                <th className="table-th">Item</th>
                <th className="table-th">Category</th>
                <th className="table-th">Stock</th>
                <th className="table-th">Linked Drug</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((it) => {
                const low = it.reorderLevel > 0 && it.stockQty <= it.reorderLevel;
                const isSel = selected.has(it.id);
                return (
                  <tr key={it.id} className={`hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""}`}>
                    <td className="table-td w-10">
                      <input type="checkbox" aria-label={`Select ${it.name}`} checked={isSel} onChange={() => toggleOne(it.id)} />
                    </td>
                    <td className="table-td font-mono text-xs">{it.code}</td>
                    <td className="table-td font-medium">{it.name}{!it.active && <Badge label="Inactive" variant="gray" className="ml-2" />}</td>
                    <td className="table-td capitalize">{it.category}</td>
                    <td className="table-td">
                      <span className={`font-mono ${low ? "text-red-600 font-semibold" : ""}`}>{it.stockQty} {it.unit}</span>
                      {low && <Badge label="Low" variant="red" className="ml-2" />}
                    </td>
                    <td className="table-td text-xs text-muted-foreground">{it.linkedDrugName || "—"}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Can module="inventory" action="edit">
                          <button className="text-emerald-600 hover:text-emerald-700 p-1" title="Receive stock" onClick={() => openStock(it, "receive")}>
                            <PackagePlus size={15} />
                          </button>
                          <button className="text-blue-600 hover:text-blue-700 p-1" title="Adjust stock" onClick={() => openStock(it, "adjust")}>
                            <ArrowRightLeft size={15} />
                          </button>
                          {it.linkedDrugId && (
                            <button className="text-xs text-violet-600 hover:underline" title="Issue to pharmacy" onClick={() => openStock(it, "issue")}>
                              → Pharmacy
                            </button>
                          )}
                          <button className="text-blue-600 hover:text-blue-700 p-1" title="Edit" onClick={() => setItemModal({ open: true, editing: it })}>
                            <Pencil size={14} />
                          </button>
                        </Can>
                        <Can module="inventory" action="delete">
                          <button className="text-red-500 hover:text-red-700 p-1" aria-label={`Delete ${it.name}`} onClick={() => deleteItem(it)}>
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {hasMore && (
                <tr ref={sentinelRef}>
                  <td colSpan={7} className="table-td text-center text-sm text-muted-foreground/70 py-4">Loading more…</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
            Showing {visible.length} of {filtered.length}
          </div>
        </div>
      )}

      <ItemModal isOpen={itemModal.open} editing={itemModal.editing} drugs={drugs}
        onClose={() => setItemModal({ open: false, editing: null })} onSave={saveItem} />

      <Modal
        title={stockAction ? `${stockAction.mode === "receive" ? "Receive" : stockAction.mode === "adjust" ? "Adjust" : "Issue to Pharmacy"} — ${stockAction.item.name}` : ""}
        isOpen={!!stockAction} onClose={() => setStockAction(null)}>
        {stockAction && (
          <form onSubmit={submitStock} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current stock: <span className="font-mono">{stockAction.item.stockQty} {stockAction.item.unit}</span>.
              {stockAction.mode === "adjust" && " Use a negative value to reduce."}
              {stockAction.mode === "issue" && ` Moves into ${stockAction.item.linkedDrugName}.`}
            </p>
            <input type="number" step="any" className="input-field" autoFocus required
              placeholder={stockAction.mode === "adjust" ? "Delta (+/-)" : "Quantity"} value={qty} onChange={(e) => setQty(e.target.value)} />
            {stockAction.mode !== "issue" && (
              <input className="input-field" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Apply"}</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setStockAction(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
