"use client";

// Radiology study catalog: searchable table + add/edit modal.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { GqlRadStudy, RadStudyForm } from "./types";
import { emptyRadStudyForm, MODALITIES } from "./types";

export default function StudiesTab({
  studies, onSave, onDelete,
}: {
  studies: GqlRadStudy[];
  onSave: (editing: GqlRadStudy | null, form: RadStudyForm) => Promise<void>;
  onDelete: (s: GqlRadStudy) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlRadStudy | null>(null);
  const [form, setForm] = useState<RadStudyForm>(emptyRadStudyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!showModal) return;
    setForm(
      editing
        ? {
            code: editing.code, name: editing.name, modality: editing.modality,
            body_part: editing.bodyPart ?? "", price: String(editing.price), active: editing.active,
          }
        : emptyRadStudyForm,
    );
  }, [showModal, editing]);

  const set = (patch: Partial<RadStudyForm>) => setForm((f) => ({ ...f, ...patch }));

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

  const q = search.toLowerCase();
  const filtered = q
    ? studies.filter((s) => [s.name, s.code, s.bodyPart].some((v) => String(v ?? "").toLowerCase().includes(q)))
    : studies;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search study or code…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Can module="radiology" action="create">
          <button className="btn-primary flex items-center gap-2"
            onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Study
          </button>
        </Can>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No imaging studies yet.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Study</th>
                <th className="table-th">Modality</th>
                <th className="table-th">Body Part</th>
                <th className="table-th">Price</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="table-td font-mono text-xs">{s.code}</td>
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td uppercase text-xs">{s.modality}</td>
                  <td className="table-td">{s.bodyPart || "—"}</td>
                  <td className="table-td font-mono">{s.price.toFixed(2)}</td>
                  <td className="table-td">
                    <Badge label={s.active ? "Active" : "Inactive"} variant={s.active ? "green" : "gray"} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <Can module="radiology" action="edit">
                        <button className="text-sm text-blue-600 hover:underline"
                          onClick={() => { setEditing(s); setShowModal(true); }}>Edit</button>
                      </Can>
                      <Can module="radiology" action="delete">
                        <button className="text-red-500 hover:text-red-700 p-1"
                          aria-label={`Delete ${s.name}`} onClick={() => onDelete(s)}>
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

      <Modal title={editing ? "Edit Study" : "Add Study"} isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" placeholder="CXR" value={form.code} required
                onChange={(e) => set({ code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" placeholder="Chest X-Ray" value={form.name} required
                onChange={(e) => set({ name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Modality</label>
              <select className="input-field" value={form.modality}
                onChange={(e) => set({ modality: e.target.value })}>
                {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Body Part</label>
              <input className="input-field" placeholder="Chest" value={form.body_part}
                onChange={(e) => set({ body_part: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Price</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.price} required
                onChange={(e) => set({ price: e.target.value })} />
            </div>
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
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
