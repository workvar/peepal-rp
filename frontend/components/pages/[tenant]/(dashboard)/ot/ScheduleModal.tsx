"use client";

// Schedule a surgery into a theatre.

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlTheatre, SurgeryForm } from "./types";
import { emptySurgeryForm } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) =>
  `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function ScheduleModal({
  isOpen, theatres, patients, clinicians, onClose, onSubmit,
}: {
  isOpen: boolean;
  theatres: GqlTheatre[];
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  onClose: () => void;
  onSubmit: (form: SurgeryForm) => Promise<void>;
}) {
  const [form, setForm] = useState<SurgeryForm>(emptySurgeryForm);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<SurgeryForm>) => setForm((f) => ({ ...f, ...patch }));

  const close = () => { setForm(emptySurgeryForm); onClose(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); close(); } finally { setSaving(false); }
  };

  return (
    <Modal title="Schedule Surgery" isOpen={isOpen} onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
          <SearchableSelect
            value={form.patient_id}
            onChange={(v) => set({ patient_id: v })}
            options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
            placeholder="Select patient…"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Theatre</label>
            <SearchableSelect
              value={form.theatre_id}
              onChange={(v) => set({ theatre_id: v })}
              options={theatres.filter((t) => t.active).map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select theatre…"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Surgeon</label>
            <SearchableSelect
              value={form.surgeon_id}
              onChange={(v) => set({ surgeon_id: v })}
              options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
              placeholder="— none —"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Procedure</label>
            <input className="input-field" value={form.procedure_name} required onChange={(e) => set({ procedure_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Anesthesia</label>
            <input className="input-field" placeholder="general / local" value={form.anesthesia_type} onChange={(e) => set({ anesthesia_type: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" value={form.scheduled_date} required onChange={(e) => set({ scheduled_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Start</label>
            <input type="time" className="input-field" value={form.start_time} required onChange={(e) => set({ start_time: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">End</label>
            <input type="time" className="input-field" value={form.end_time} required onChange={(e) => set({ end_time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
          <input className="input-field" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Scheduling…" : "Schedule"}</button>
          <button type="button" className="btn-secondary flex-1" onClick={close}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
