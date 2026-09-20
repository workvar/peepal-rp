"use client";

import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { SelectOption } from "@/components/ui/SearchableSelect";
import type { ScheduleForm } from "./types";
import { DAY_NAMES } from "./types";

interface Props {
  open: boolean;
  editing: boolean;
  form: ScheduleForm;
  saving: boolean;
  clinicianOpts: SelectOption[];
  onChange: (patch: Partial<ScheduleForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function ScheduleModal({
  open, editing, form, saving, clinicianOpts, onChange, onSubmit, onClose,
}: Props) {
  return (
    <Modal title={editing ? "Edit Window" : "Add Window"} isOpen={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Clinician</label>
            <SearchableSelect
              options={clinicianOpts}
              value={form.clinician_id}
              onChange={(v) => onChange({ clinician_id: v })}
              placeholder="Select clinician…"
              searchPlaceholder="Search clinicians…"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Day</label>
            <select className="input-field" value={form.day_of_week}
              onChange={(e) => onChange({ day_of_week: e.target.value })}>
              {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Slot (minutes)</label>
            <input type="number" min="5" step="5" className="input-field" value={form.slot_minutes}
              onChange={(e) => onChange({ slot_minutes: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Start</label>
            <input type="time" className="input-field" value={form.start_time} required
              onChange={(e) => onChange({ start_time: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">End</label>
            <input type="time" className="input-field" value={form.end_time} required
              onChange={(e) => onChange({ end_time: e.target.value })} />
          </div>
        </div>

        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={form.active}
              onChange={(e) => onChange({ active: e.target.checked })} />
            Active (enforced when booking)
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
