"use client";

// Drug catalog tab: stock-aware table + add/edit modal + quick stock adjust.

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, PackagePlus, Layers } from "lucide-react";
import type { GqlDrug, DrugForm, BatchForm } from "./types";
import { emptyDrugForm, emptyBatchForm, DRUG_FORMS } from "./types";

export default function DrugsTab({
  drugs,
  onSave,
  onDelete,
  onAdjustStock,
  onAddBatch,
  onDeleteMany,
  onBulkFinished,
}: {
  drugs: GqlDrug[];
  onSave: (editing: GqlDrug | null, form: DrugForm) => Promise<void>;
  onDelete: (d: GqlDrug) => void;
  onAdjustStock: (d: GqlDrug, delta: number) => Promise<void>;
  onAddBatch: (d: GqlDrug, form: BatchForm) => Promise<void>;
  onDeleteMany: (drugs: GqlDrug[]) => void;
  onBulkFinished?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlDrug | null>(null);
  const [form, setForm] = useState<DrugForm>(emptyDrugForm);
  const [saving, setSaving] = useState(false);
  const [restocking, setRestocking] = useState<GqlDrug | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [batchFor, setBatchFor] = useState<GqlDrug | null>(null);
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatchForm);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!showModal) return;
    setForm(
      editing
        ? {
            name: editing.name,
            generic_name: editing.genericName ?? "",
            form: editing.form,
            strength: editing.strength ?? "",
            unit: editing.unit,
            unit_price: String(editing.unitPrice),
            stock_qty: "", // stock changes go through Restock
            reorder_level: String(editing.reorderLevel),
            active: editing.active,
            batch_no: "", // batches are managed via Add Batch, not the edit form
            expiry_date: "",
          }
        : emptyDrugForm,
    );
  }, [showModal, editing]);

  const set = (patch: Partial<DrugForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      setShowModal(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const submitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restocking) return;
    setSaving(true);
    try {
      await onAdjustStock(restocking, parseFloat(restockQty) || 0);
      setRestocking(null);
      setRestockQty("");
    } finally {
      setSaving(false);
    }
  };

  const openBatch = (d: GqlDrug) => {
    setBatchForm(emptyBatchForm);
    setBatchFor(d);
  };

  const submitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFor) return;
    setSaving(true);
    try {
      await onAddBatch(batchFor, batchForm);
      setBatchFor(null);
    } finally {
      setSaving(false);
    }
  };

  const setBatch = (patch: Partial<BatchForm>) => setBatchForm((f) => ({ ...f, ...patch }));

  const q = search.toLowerCase();
  const filtered = q
    ? drugs.filter((d) =>
        [d.name, d.genericName].some((v) => String(v ?? "").toLowerCase().includes(q)),
      )
    : drugs;

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drop ids that no longer exist (e.g. after a delete/refetch).
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(drugs.map((d) => d.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [drugs]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someFilteredSelected = filtered.some((d) => selected.has(d.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((d) => next.delete(d.id));
      else filtered.forEach((d) => next.add(d.id));
      return next;
    });

  const selectedDrugs = drugs.filter((d) => selected.has(d.id));

  // ── Lazy loading (render in pages, grow on scroll) ────────────────────────
  const PAGE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [search, drugs.length]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE, filtered.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) {
      headerCbRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search drug or generic name…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Can module="pharmacy" action="create">
          <BulkUploadButton resource="drugs" label="Bulk Drugs"
            onFinished={(st) => { if (st.successful > 0) onBulkFinished?.(); }} />
          <button className="btn-primary flex items-center gap-2"
            onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Drug
          </button>
        </Can>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
            <button className="ml-3 text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </span>
          <Can module="pharmacy" action="delete">
            <button className="btn-danger flex items-center gap-2 text-sm"
              onClick={() => onDeleteMany(selectedDrugs)}>
              <Trash2 size={15} /> Delete {selected.size}
            </button>
          </Can>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No drugs in the catalog yet. Add stock to start dispensing.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th w-10">
                  <input ref={headerCbRef} type="checkbox" aria-label="Select all"
                    checked={allFilteredSelected} onChange={toggleAll} />
                </th>
                <th className="table-th">Drug</th>
                <th className="table-th">Form</th>
                <th className="table-th">Price</th>
                <th className="table-th">Stock</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((d) => {
                const low = d.reorderLevel > 0 && d.stockQty <= d.reorderLevel;
                const isSel = selected.has(d.id);
                return (
                  <tr key={d.id} className={`hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""}`}>
                    <td className="table-td w-10">
                      <input type="checkbox" aria-label={`Select ${d.name}`}
                        checked={isSel} onChange={() => toggleOne(d.id)} />
                    </td>
                    <td className="table-td">
                      <span className="font-medium">{d.name}</span>
                      {d.strength && <span className="text-xs text-muted-foreground/70 ml-1">{d.strength}</span>}
                      {d.genericName && (
                        <div className="text-xs text-muted-foreground/70">{d.genericName}</div>
                      )}
                    </td>
                    <td className="table-td capitalize">{d.form}</td>
                    <td className="table-td font-mono">{d.unitPrice.toFixed(2)}</td>
                    <td className="table-td">
                      <span className={`font-mono ${low ? "text-red-600 font-semibold" : ""}`}>
                        {d.stockQty} {d.unit}
                      </span>
                      {low && <Badge label="Low" variant="red" className="ml-2" />}
                    </td>
                    <td className="table-td">
                      <Badge label={d.active ? "Active" : "Inactive"} variant={d.active ? "green" : "gray"} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Can module="pharmacy" action="edit">
                          <button className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="Restock" aria-label={`Restock ${d.name}`}
                            onClick={() => setRestocking(d)}>
                            <PackagePlus size={15} />
                          </button>
                          <button className="text-amber-600 hover:text-amber-700 p-1"
                            title="Add batch (with expiry)" aria-label={`Add batch for ${d.name}`}
                            onClick={() => openBatch(d)}>
                            <Layers size={15} />
                          </button>
                          <button className="text-sm text-blue-600 hover:underline"
                            onClick={() => { setEditing(d); setShowModal(true); }}>
                            Edit
                          </button>
                        </Can>
                        <Can module="pharmacy" action="delete">
                          <button className="text-red-500 hover:text-red-700 p-1"
                            aria-label={`Delete ${d.name}`} onClick={() => onDelete(d)}>
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
                  <td colSpan={7} className="table-td text-center text-sm text-muted-foreground/70 py-4">
                    Loading more…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
            Showing {visible.length} of {filtered.length}
          </div>
        </div>
      )}

      {/* Add / edit drug */}
      <Modal title={editing ? "Edit Drug" : "Add Drug"} isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" placeholder="e.g. Crocin" value={form.name} required
                onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Generic Name</label>
              <input className="input-field" placeholder="e.g. Paracetamol" value={form.generic_name}
                onChange={(e) => set({ generic_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Form</label>
              <select className="input-field" value={form.form}
                onChange={(e) => set({ form: e.target.value })}>
                {DRUG_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Strength</label>
              <input className="input-field" placeholder="500mg" value={form.strength}
                onChange={(e) => set({ strength: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Unit</label>
              <input className="input-field" placeholder="tablet / bottle" value={form.unit}
                onChange={(e) => set({ unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Unit Price</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.unit_price} required
                onChange={(e) => set({ unit_price: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Opening Stock</label>
                <input type="number" min="0" step="1" className="input-field" value={form.stock_qty}
                  onChange={(e) => set({ stock_qty: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Reorder Level</label>
              <input type="number" min="0" step="1" className="input-field" value={form.reorder_level}
                onChange={(e) => set({ reorder_level: e.target.value })} />
            </div>
          </div>
          {!editing && (
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <p className="text-xs text-muted-foreground/70">
                Optional: give the opening stock a batch number to track expiry and dispense
                first-expiry-first-out. Leave blank to keep untracked stock.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Batch No</label>
                  <input className="input-field" placeholder="e.g. B2026-001" value={form.batch_no}
                    onChange={(e) => set({ batch_no: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Expiry Date</label>
                  <input type="date" className="input-field" value={form.expiry_date}
                    disabled={!form.batch_no.trim()}
                    onChange={(e) => set({ expiry_date: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          {editing && (
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={form.active}
                onChange={(e) => set({ active: e.target.checked })} />
              Active (dispensable)
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </button>
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowModal(false); setEditing(null); }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Restock */}
      <Modal title={restocking ? `Restock — ${restocking.name}` : "Restock"}
        isOpen={!!restocking} onClose={() => setRestocking(null)}>
        {restocking && (
          <form onSubmit={submitRestock} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current stock: <span className="font-mono">{restocking.stockQty} {restocking.unit}</span>.
              Use a negative quantity for a correction.
            </p>
            <input type="number" step="1" className="input-field" placeholder="Quantity to add"
              value={restockQty} required autoFocus
              onChange={(e) => setRestockQty(e.target.value)} />
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "Apply"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setRestocking(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add batch (received lot with expiry) */}
      <Modal title={batchFor ? `Add Batch — ${batchFor.name}` : "Add Batch"}
        isOpen={!!batchFor} onClose={() => setBatchFor(null)}>
        {batchFor && (
          <form onSubmit={submitBatch} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Logs a received lot and adds its quantity to stock. Current:{" "}
              <span className="font-mono">{batchFor.stockQty} {batchFor.unit}</span>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Batch No</label>
                <input className="input-field" placeholder="e.g. B2026-001" value={batchForm.batch_no}
                  required autoFocus onChange={(e) => setBatch({ batch_no: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Expiry Date</label>
                <input type="date" className="input-field" value={batchForm.expiry_date}
                  onChange={(e) => setBatch({ expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Quantity</label>
                <input type="number" min="0" step="1" className="input-field" value={batchForm.qty}
                  required onChange={(e) => setBatch({ qty: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Unit Cost</label>
                <input type="number" min="0" step="0.01" className="input-field" value={batchForm.unit_cost}
                  onChange={(e) => setBatch({ unit_cost: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "Add Batch"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setBatchFor(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
