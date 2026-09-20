"use client";

// Shared add/edit form for a lab test. Reused by the Test Catalog tab and the
// inline "add/edit test" flow inside the New Lab Order modal.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlLabTest, LabTestForm } from "./types";
import { emptyLabTestForm, SAMPLE_TYPES } from "./types";

export default function TestFormModal({
  isOpen,
  editing,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  editing: GqlLabTest | null;
  onClose: () => void;
  onSave: (editing: GqlLabTest | null, form: LabTestForm) => Promise<void>;
}) {
  const [form, setForm] = useState<LabTestForm>(emptyLabTestForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            category: editing.category ?? "",
            panel: editing.panel ?? "",
            method: editing.method ?? "",
            sample_type: editing.sampleType,
            unit: editing.unit ?? "",
            ref_low: String(editing.refLow || ""),
            ref_high: String(editing.refHigh || ""),
            ref_text: editing.refText ?? "",
            price: String(editing.price),
            active: editing.active,
          }
        : emptyLabTestForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<LabTestForm>) => setForm((f) => ({ ...f, ...patch }));

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
    <Modal title={editing ? "Edit Test" : "Add Test"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
            <input className="input-field" placeholder="CBC" value={form.code} required
              onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input className="input-field" placeholder="Complete Blood Count" value={form.name} required
              onChange={(e) => set({ name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Category (body part)</label>
            <input className="input-field" placeholder="Liver" value={form.category}
              onChange={(e) => set({ category: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Panel</label>
            <input className="input-field" placeholder="LFT" value={form.panel}
              onChange={(e) => set({ panel: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Sample</label>
            <select className="input-field" value={form.sample_type}
              onChange={(e) => set({ sample_type: e.target.value })}>
              {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Unit</label>
            <input className="input-field" placeholder="g/dL" value={form.unit}
              onChange={(e) => set({ unit: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Method (optional)</label>
            <input className="input-field" placeholder="ELISA" value={form.method}
              onChange={(e) => set({ method: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Ref Low</label>
            <input type="number" step="any" className="input-field" value={form.ref_low}
              onChange={(e) => set({ ref_low: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Ref High</label>
            <input type="number" step="any" className="input-field" value={form.ref_high}
              onChange={(e) => set({ ref_high: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Price</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.price} required
              onChange={(e) => set({ price: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Reference text (optional)</label>
          <input className="input-field" placeholder="13–17 g/dL (overrides low/high display)"
            value={form.ref_text} onChange={(e) => set({ ref_text: e.target.value })} />
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={form.active}
              onChange={(e) => set({ active: e.target.checked })} />
            Active (orderable)
          </label>
        )}
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
