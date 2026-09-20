"use client";

// Service catalog tab: table + add/edit modal in one small file.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { GqlBillableService, ServiceForm } from "./types";
import { emptyServiceForm, SERVICE_CATEGORIES } from "./types";

export default function ServicesTab({
  services,
  onSave,
  onDelete,
}: {
  services: GqlBillableService[];
  onSave: (editing: GqlBillableService | null, form: ServiceForm) => Promise<void>;
  onDelete: (s: GqlBillableService) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlBillableService | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyServiceForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            category: editing.category,
            unit_price: String(editing.unitPrice),
            active: editing.active,
          }
        : emptyServiceForm,
    );
  }, [showModal, editing]);

  const set = (patch: Partial<ServiceForm>) => setForm((f) => ({ ...f, ...patch }));

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

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Can module="billing" action="create">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => { setEditing(null); setShowModal(true); }}
          >
            <Plus size={16} /> Add Service
          </button>
        </Can>
      </div>

      {services.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No services yet. Add consultations, procedures, and other charges to bill against.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Service</th>
                <th className="table-th">Category</th>
                <th className="table-th">Price</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="table-td font-mono">{s.code}</td>
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td capitalize">{s.category}</td>
                  <td className="table-td font-mono">{s.unitPrice.toFixed(2)}</td>
                  <td className="table-td">
                    <Badge label={s.active ? "Active" : "Inactive"} variant={s.active ? "green" : "gray"} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <Can module="billing" action="edit">
                        <button
                          onClick={() => { setEditing(s); setShowModal(true); }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can module="billing" action="delete">
                        <button
                          onClick={() => onDelete(s)}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label={`Delete ${s.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? "Edit Service" : "Add Service"}
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" placeholder="e.g. CONS-GEN" value={form.code} required
                onChange={(e) => set({ code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Category</label>
              <select className="input-field" value={form.category}
                onChange={(e) => set({ category: e.target.value })}>
                {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input className="input-field" placeholder="e.g. General Consultation" value={form.name} required
              onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Unit Price</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.unit_price} required
              onChange={(e) => set({ unit_price: e.target.value })} />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={form.active}
                onChange={(e) => set({ active: e.target.checked })} />
              Active (offered when billing)
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
    </div>
  );
}
