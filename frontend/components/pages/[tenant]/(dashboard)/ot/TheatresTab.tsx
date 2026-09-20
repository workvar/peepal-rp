"use client";

// Operation theatre catalog.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { GqlTheatre, TheatreForm } from "./types";
import { emptyTheatreForm } from "./types";

export default function TheatresTab({
  theatres, onSave, onDelete, onBulkFinished,
}: {
  theatres: GqlTheatre[];
  onSave: (editing: GqlTheatre | null, form: TheatreForm) => Promise<void>;
  onDelete: (t: GqlTheatre) => void;
  onBulkFinished?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlTheatre | null>(null);
  const [form, setForm] = useState<TheatreForm>(emptyTheatreForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    setForm(editing
      ? { code: editing.code, name: editing.name, location: editing.location ?? "", active: editing.active }
      : emptyTheatreForm);
  }, [showModal, editing]);

  const set = (patch: Partial<TheatreForm>) => setForm((f) => ({ ...f, ...patch }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(editing, form); setShowModal(false); setEditing(null); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end items-center gap-2">
        <Can module="ot" action="create">
          <BulkUploadButton resource="ot_theatres" label="Bulk Upload"
            onFinished={(st) => { if (st.successful > 0) onBulkFinished?.(); }} />
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Theatre
          </button>
        </Can>
      </div>

      {theatres.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No theatres yet.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Name</th>
                <th className="table-th">Location</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {theatres.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="table-td font-mono text-xs">{t.code}</td>
                  <td className="table-td font-medium">{t.name}</td>
                  <td className="table-td">{t.location || "—"}</td>
                  <td className="table-td"><Badge label={t.active ? "Active" : "Inactive"} variant={t.active ? "green" : "gray"} /></td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <Can module="ot" action="edit">
                        <button className="text-sm text-blue-600 hover:underline" onClick={() => { setEditing(t); setShowModal(true); }}>Edit</button>
                      </Can>
                      <Can module="ot" action="delete">
                        <button className="text-red-500 hover:text-red-700 p-1" aria-label={`Delete ${t.name}`} onClick={() => onDelete(t)}>
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

      <Modal title={editing ? "Edit Theatre" : "Add Theatre"} isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }}>
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
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => set({ location: e.target.value })} />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Save"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
