"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlDutyShift, PickerEmployee, RosterForm } from "./types";
import { emptyRosterForm, employeeLabel, SHIFT_PRESETS } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function RosterModal({
  isOpen,
  editing,
  employees,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  editing: GqlDutyShift | null;
  employees: PickerEmployee[];
  onClose: () => void;
  onSave: (editing: GqlDutyShift | null, form: RosterForm) => Promise<void>;
}) {
  const [form, setForm] = useState<RosterForm>(emptyRosterForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            employee_id: editing.employeeId,
            date: editing.date,
            shift_name: editing.shiftName ?? "",
            start_time: editing.startTime,
            end_time: editing.endTime,
            location: editing.location ?? "",
            notes: editing.notes ?? "",
          }
        : emptyRosterForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<RosterForm>) => setForm((f) => ({ ...f, ...patch }));

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
    <Modal title={editing ? "Edit Shift" : "Add Shift"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {!editing && (
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Employee</label>
            <SearchableSelect
              value={form.employee_id}
              onChange={(v) => set({ employee_id: v })}
              options={employees.map((e) => ({ value: e.id, label: employeeLabel(e) }))}
              placeholder="Select employee…"
              required
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" value={form.date} required
              onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Shift Label</label>
            <input className="input-field" list="shift-presets" placeholder="Morning" value={form.shift_name}
              onChange={(e) => set({ shift_name: e.target.value })} />
            <datalist id="shift-presets">
              {SHIFT_PRESETS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Start</label>
            <input type="time" className="input-field" value={form.start_time} required
              onChange={(e) => set({ start_time: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">End</label>
            <input type="time" className="input-field" value={form.end_time} required
              onChange={(e) => set({ end_time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Location (optional)</label>
          <input className="input-field" placeholder="Ward 3 / Front Desk" value={form.location}
            onChange={(e) => set({ location: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Notes (optional)</label>
          <input className="input-field" value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Add Shift"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
