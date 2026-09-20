"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlVendor, VendorForm } from "./types";
import { emptyVendorForm } from "./types";

export default function VendorModal({
  isOpen,
  onClose,
  editing,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlVendor | null;
  onSave: (form: VendorForm) => Promise<void>;
}) {
  const [form, setForm] = useState<VendorForm>(emptyVendorForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            name: editing.name,
            code: editing.code ?? "",
            gstin: editing.gstin ?? "",
            contact_name: editing.contactName ?? "",
            phone: editing.phone ?? "",
            email: editing.email ?? "",
            address: editing.address ?? "",
            payment_terms: editing.paymentTerms ?? "",
            active: editing.active,
          }
        : emptyVendorForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<VendorForm>) => setForm((f) => ({ ...f, ...patch }));

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
    <Modal title={editing ? "Edit Vendor" : "Add Vendor"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Vendor Name</label>
          <input
            className="input-field"
            placeholder="e.g. MediSupply Co."
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Supplier Code</label>
            <input className="input-field" value={form.code} onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">GSTIN</label>
            <input className="input-field" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Contact Person</label>
            <input className="input-field" value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Phone</label>
            <input className="input-field" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Payment Terms</label>
            <input className="input-field" placeholder="e.g. Net 30" value={form.payment_terms} onChange={(e) => set({ payment_terms: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Address</label>
          <textarea className="input-field" rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
          Active
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
