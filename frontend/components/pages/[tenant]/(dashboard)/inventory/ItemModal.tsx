"use client";

// Add / edit an inventory item, optionally linked to a pharmacy drug.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { GqlInventoryItem, ItemForm } from "./types";
import { emptyItemForm, INVENTORY_CATEGORIES } from "./types";
import type { GqlDrug } from "../pharmacy/types";

export default function ItemModal({
  isOpen, editing, drugs, onClose, onSave,
}: {
  isOpen: boolean;
  editing: GqlInventoryItem | null;
  drugs: GqlDrug[];
  onClose: () => void;
  onSave: (editing: GqlInventoryItem | null, form: ItemForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ItemForm>(emptyItemForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(editing
      ? {
          code: editing.code, name: editing.name, category: editing.category, unit: editing.unit,
          reorder_level: String(editing.reorderLevel), unit_cost: String(editing.unitCost),
          opening_stock: "", linked_drug_id: editing.linkedDrugId ?? "",
        }
      : emptyItemForm);
  }, [isOpen, editing]);

  const set = (patch: Partial<ItemForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Item" : "Add Item"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
            <input className="input-field" value={form.code} required onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input className="input-field" value={form.name} required onChange={(e) => set({ name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Unit</label>
            <input className="input-field" value={form.unit} onChange={(e) => set({ unit: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Unit Cost</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.unit_cost}
              onChange={(e) => set({ unit_cost: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Reorder Level</label>
            <input type="number" min="0" step="any" className="input-field" value={form.reorder_level}
              onChange={(e) => set({ reorder_level: e.target.value })} />
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Opening Stock</label>
              <input type="number" min="0" step="any" className="input-field" value={form.opening_stock}
                onChange={(e) => set({ opening_stock: e.target.value })} />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Linked Pharmacy Drug (optional)</label>
          <SearchableSelect
            value={form.linked_drug_id}
            onChange={(v) => set({ linked_drug_id: v })}
            placeholder="— not linked —"
            searchPlaceholder="Search drug…"
            options={drugs.map((d) => ({ value: d.id, label: d.name, sublabel: d.strength ?? undefined }))}
          />
          <p className="text-xs text-muted-foreground/70 mt-1">Linking lets you issue stock straight into the pharmacy.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
