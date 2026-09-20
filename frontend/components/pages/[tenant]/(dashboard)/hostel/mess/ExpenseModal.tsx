"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { ExpenseForm, GqlMessExpense, PickerPO, PickerVendor } from "./types";
import { EXPENSE_CATEGORIES, emptyExpenseForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ExpenseModal({
  isOpen,
  editing,
  vendors,
  purchaseOrders,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  editing: GqlMessExpense | null;
  vendors: PickerVendor[];
  purchaseOrders: PickerPO[];
  onClose: () => void;
  onSave: (editing: GqlMessExpense | null, form: ExpenseForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            date: editing.date,
            category: editing.category,
            description: editing.description ?? "",
            amount: String(editing.amount),
            vendor_id: editing.vendorId ?? "",
            purchase_order_id: editing.purchaseOrderId ?? "",
          }
        : emptyExpenseForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<ExpenseForm>) => setForm((f) => ({ ...f, ...patch }));

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
    <Modal title={editing ? "Edit Expense" : "Add Expense"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" required value={form.date}
              onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Category</label>
            <select className="input-field" value={form.category}
              onChange={(e) => set({ category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Amount</label>
          <input type="number" min={0} step="0.01" className="input-field" required value={form.amount}
            onChange={(e) => set({ amount: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
          <input className="input-field" placeholder="Weekly vegetables" value={form.description}
            onChange={(e) => set({ description: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Vendor (optional)</label>
            <SearchableSelect
              value={form.vendor_id}
              onChange={(val) => set({ vendor_id: val })}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              placeholder="None"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Purchase Order (optional)</label>
            <SearchableSelect
              value={form.purchase_order_id}
              onChange={(val) => set({ purchase_order_id: val })}
              options={purchaseOrders.map((p) => ({ value: p.id, label: p.poNumber }))}
              placeholder="None"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Add Expense"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
