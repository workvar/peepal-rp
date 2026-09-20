"use client";

// Add / edit a ward.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlWard } from "../ipd/types";
import { WARD_TYPES, WARD_GENDERS } from "../ipd/types";

export type WardForm = {
  code: string; name: string; ward_type: string; gender: string; floor: string; active: boolean;
};

const empty: WardForm = { code: "", name: "", ward_type: "general", gender: "any", floor: "", active: true };

export default function WardModal({
  isOpen, editing, onClose, onSave,
}: {
  isOpen: boolean;
  editing: GqlWard | null;
  onClose: () => void;
  onSave: (editing: GqlWard | null, form: WardForm) => Promise<void>;
}) {
  const [form, setForm] = useState<WardForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            code: editing.code, name: editing.name, ward_type: editing.wardType,
            gender: editing.gender, floor: editing.floor ?? "", active: editing.active,
          }
        : empty,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<WardForm>) => setForm((f) => ({ ...f, ...patch }));

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
    <Modal title={editing ? "Edit Ward" : "Add Ward"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
            <input className="input-field" placeholder="GW1" value={form.code} required
              onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input className="input-field" placeholder="General Ward 1" value={form.name} required
              onChange={(e) => set({ name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
            <select className="input-field" value={form.ward_type} onChange={(e) => set({ ward_type: e.target.value })}>
              {WARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Gender</label>
            <select className="input-field" value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
              {WARD_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Floor</label>
            <input className="input-field" placeholder="2" value={form.floor}
              onChange={(e) => set({ floor: e.target.value })} />
          </div>
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
            Active
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
