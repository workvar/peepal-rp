"use client";

// New-invoice dialog: patient + date + editable line items with live totals.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";
import type { GqlBillableService, InvoiceForm, InvoiceLineForm } from "./types";
import { emptyInvoiceForm, emptyInvoiceLine, invoiceFormSubtotal } from "./types";
import type { PickerPatient } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function InvoiceModal({
  isOpen,
  onClose,
  patients,
  services,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  patients: PickerPatient[];
  services: GqlBillableService[];
  onSave: (form: InvoiceForm) => Promise<void>;
}) {
  const [form, setForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...emptyInvoiceForm,
      date: new Date().toISOString().slice(0, 10),
      lines: [{ ...emptyInvoiceLine }],
    });
  }, [isOpen]);

  const set = (patch: Partial<InvoiceForm>) => setForm((f) => ({ ...f, ...patch }));

  const setLine = (i: number, patch: Partial<InvoiceLineForm>) =>
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));

  // Picking a catalog service pre-fills description and price.
  const pickService = (i: number, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    setLine(i, {
      service_id: serviceId,
      description: svc ? svc.name : "",
      unit_price: svc ? String(svc.unitPrice) : "",
    });
  };

  const addLine = () => set({ lines: [...form.lines, { ...emptyInvoiceLine }] });
  const removeLine = (i: number) =>
    set({ lines: form.lines.filter((_, idx) => idx !== i) });

  const subtotal = invoiceFormSubtotal(form);
  const total = subtotal - (parseFloat(form.discount) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const activeServices = services.filter((s) => s.active);

  return (
    <Modal title="New Invoice" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(v) => set({ patient_id: v })}
              options={patients.map((p) => ({
                value: p.id,
                label: `${[p.firstName, p.lastName].filter(Boolean).join(" ")} (${p.mrn})`,
              }))}
              placeholder="Select patient…"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" value={form.date} required
              onChange={(e) => set({ date: e.target.value })} />
          </div>
        </div>

        <fieldset className="border border-border rounded-lg p-3 space-y-2">
          <legend className="text-sm font-medium text-foreground/80 px-1">Line Items</legend>
          {form.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4">
                <SearchableSelect
                  value={l.service_id}
                  onChange={(v) => pickService(i, v)}
                  options={activeServices.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Free text…"
                />
              </div>
              <input className="input-field col-span-4" placeholder="Description"
                value={l.description} required
                onChange={(e) => setLine(i, { description: e.target.value })} />
              <input type="number" min="0.01" step="0.01" className="input-field col-span-1"
                placeholder="Qty" value={l.qty} required
                onChange={(e) => setLine(i, { qty: e.target.value })} />
              <input type="number" min="0" step="0.01" className="input-field col-span-2"
                placeholder="Price" value={l.unit_price} required
                onChange={(e) => setLine(i, { unit_price: e.target.value })} />
              <button type="button" className="col-span-1 text-red-500 hover:text-red-700 p-2"
                onClick={() => removeLine(i)} disabled={form.lines.length === 1}
                aria-label="Remove line">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary flex items-center gap-1 text-sm"
            onClick={addLine}>
            <Plus size={14} /> Add Line
          </button>
        </fieldset>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Discount <span className="text-muted-foreground/60">(flat)</span>
            </label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.discount}
              onChange={(e) => set({ discount: e.target.value })} />
          </div>
          <div className="text-right text-sm space-y-1">
            <div className="text-muted-foreground">Subtotal: <span className="font-mono">{subtotal.toFixed(2)}</span></div>
            <div className="font-semibold">Total: <span className="font-mono">{total.toFixed(2)}</span></div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
          <input className="input-field" value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving || total < 0}>
            {saving ? "Saving…" : "Create Invoice"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
