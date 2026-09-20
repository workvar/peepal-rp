"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { GqlVendorRef, GqlPurchaseOrder } from "./types";

export type InvoiceForm = {
  invoice_number: string;
  vendor_id: string;
  purchase_order_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_total: string;
  total: string;
};

const empty: InvoiceForm = {
  invoice_number: "",
  vendor_id: "",
  purchase_order_id: "",
  invoice_date: "",
  due_date: "",
  subtotal: "0",
  tax_total: "0",
  total: "0",
};

export default function InvoiceModal({
  isOpen,
  onClose,
  vendors,
  orders,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  vendors: GqlVendorRef[];
  orders: GqlPurchaseOrder[];
  onSave: (form: InvoiceForm) => Promise<void>;
}) {
  const [form, setForm] = useState<InvoiceForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(empty);
  }, [isOpen]);

  const set = (patch: Partial<InvoiceForm>) => setForm((f) => ({ ...f, ...patch }));

  // Selecting a PO prefills vendor + totals.
  const onPickPO = (poId: string) => {
    const po = orders.find((p) => p.id === poId);
    if (po) {
      set({
        purchase_order_id: poId,
        vendor_id: po.vendorId,
        subtotal: String(po.subtotal),
        tax_total: String(po.taxTotal),
        total: String(po.total),
      });
    } else {
      set({ purchase_order_id: "" });
    }
  };

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
    <Modal title="Record Supplier Invoice" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Invoice Number</label>
            <input className="input-field" value={form.invoice_number} onChange={(e) => set({ invoice_number: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Against PO (optional)</label>
            <SearchableSelect
              value={form.purchase_order_id}
              onChange={onPickPO}
              placeholder="None"
              searchPlaceholder="Search PO…"
              options={orders.map((p) => ({ value: p.id, label: p.poNumber, sublabel: p.vendor?.name ?? undefined }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Vendor</label>
          <SearchableSelect
            value={form.vendor_id}
            onChange={(v) => set({ vendor_id: v })}
            placeholder="Select vendor…"
            searchPlaceholder="Search vendor…"
            required
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Invoice Date</label>
            <input type="date" className="input-field" value={form.invoice_date} onChange={(e) => set({ invoice_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Due Date</label>
            <input type="date" className="input-field" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Subtotal</label>
            <input type="number" min="0" step="any" className="input-field" value={form.subtotal} onChange={(e) => set({ subtotal: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Tax</label>
            <input type="number" min="0" step="any" className="input-field" value={form.tax_total} onChange={(e) => set({ tax_total: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Total</label>
            <input type="number" min="0" step="any" className="input-field" value={form.total} onChange={(e) => set({ total: e.target.value })} required />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
