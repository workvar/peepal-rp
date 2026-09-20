"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Plus, Trash2 } from "lucide-react";
import type {
  GqlPurchaseOrder,
  GqlVendorRef,
  GqlInventoryItemRef,
  POForm,
  POLineForm,
} from "./types";
import { emptyPOForm, emptyPOLine } from "./types";

export default function POModal({
  isOpen,
  onClose,
  editing,
  vendors,
  items,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlPurchaseOrder | null;
  vendors: GqlVendorRef[];
  items: GqlInventoryItemRef[];
  onSave: (form: POForm) => Promise<void>;
}) {
  const [form, setForm] = useState<POForm>(emptyPOForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            vendor_id: editing.vendorId,
            order_date: editing.orderDate ?? "",
            expected_date: editing.expectedDate ?? "",
            notes: editing.notes ?? "",
            lines: editing.items.map((it) => ({
              item_id: it.itemId ?? "",
              item_name: it.itemName,
              qty: String(it.qty),
              unit_cost: String(it.unitCost),
              tax_pct: String(it.taxPct),
            })),
          }
        : { ...emptyPOForm, lines: [{ ...emptyPOLine }] },
    );
  }, [isOpen, editing]);

  const setLine = (i: number, patch: Partial<POLineForm>) =>
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ...emptyPOLine }] }));
  const removeLine = (i: number) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  // Picking a stock item fills the name from the catalog.
  const onPickItem = (i: number, itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    setLine(i, { item_id: itemId, item_name: it ? it.name : form.lines[i].item_name });
  };

  const total = form.lines.reduce((sum, l) => {
    const net = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0);
    return sum + net + (net * (parseFloat(l.tax_pct) || 0)) / 100;
  }, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${editing.poNumber}` : "New Purchase Order"} isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Vendor</label>
            <SearchableSelect
              value={form.vendor_id}
              onChange={(v) => setForm((f) => ({ ...f, vendor_id: v }))}
              placeholder="Select vendor…"
              searchPlaceholder="Search vendor…"
              required
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Order Date</label>
              <input type="date" className="input-field" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Expected</label>
              <input type="date" className="input-field" value={form.expected_date} onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground/80">Lines</label>
            <button type="button" className="text-sm text-blue-600 flex items-center gap-1" onClick={addLine}>
              <Plus size={14} /> Add line
            </button>
          </div>
          <div className="space-y-2">
            {form.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <SearchableSelect
                    value={l.item_id}
                    onChange={(v) => onPickItem(i, v)}
                    placeholder="Non-stock…"
                    searchPlaceholder="Search item…"
                    options={items.map((it) => ({ value: it.id, label: it.name, sublabel: it.code }))}
                  />
                </div>
                <input
                  className="input-field col-span-3"
                  placeholder="Item name"
                  value={l.item_name}
                  onChange={(e) => setLine(i, { item_name: e.target.value })}
                  required
                />
                <input type="number" min="0" step="any" className="input-field col-span-2" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} required />
                <input type="number" min="0" step="any" className="input-field col-span-2" placeholder="Unit cost" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
                <input type="number" min="0" step="any" className="input-field col-span-1" placeholder="Tax%" value={l.tax_pct} onChange={(e) => setLine(i, { tax_pct: e.target.value })} />
                <button type="button" className="col-span-1 text-red-500 hover:text-red-700" onClick={() => removeLine(i)} aria-label="Remove line" disabled={form.lines.length === 1}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-right text-sm font-medium mt-2">Total: {total.toFixed(2)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
          <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Create"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
