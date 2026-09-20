"use client";

// Add / edit a bed within a ward.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlBed } from "../ipd/types";

export type BedForm = { bed_number: string; bay: string; daily_charge: string; status: string };

const empty: BedForm = { bed_number: "", bay: "", daily_charge: "", status: "available" };

export default function BedModal({
  isOpen, editing, wardName, onClose, onSave,
}: {
  isOpen: boolean;
  editing: GqlBed | null;
  wardName: string;
  onClose: () => void;
  onSave: (editing: GqlBed | null, form: BedForm) => Promise<void>;
}) {
  const [form, setForm] = useState<BedForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            bed_number: editing.bedNumber, bay: editing.bay ?? "",
            daily_charge: String(editing.dailyCharge),
            status: editing.status === "occupied" ? "available" : editing.status,
          }
        : empty,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<BedForm>) => setForm((f) => ({ ...f, ...patch }));
  const occupied = editing?.status === "occupied";

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
    <Modal title={editing ? `Edit Bed — ${wardName}` : `Add Bed — ${wardName}`} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {occupied && (
          <p className="text-xs text-amber-600">
            This bed is occupied; number and status are locked until the patient is discharged or transferred.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Bed Number</label>
            <input className="input-field" placeholder="B-01" value={form.bed_number} required disabled={occupied}
              onChange={(e) => set({ bed_number: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Bay (optional)</label>
            <input className="input-field" placeholder="Bay A" value={form.bay}
              onChange={(e) => set({ bay: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Daily Charge</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.daily_charge}
              onChange={(e) => set({ daily_charge: e.target.value })} />
          </div>
          {editing && !occupied && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                <option value="available">available</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>
          )}
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
