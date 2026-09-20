"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { GqlEncounter, EncounterForm, Vitals } from "./types";
import { emptyEncounterForm, parseVitals } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

export default function EncounterModal({
  isOpen,
  onClose,
  editing,
  patients,
  clinicians,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlEncounter | null;
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  onSave: (form: EncounterForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EncounterForm>(emptyEncounterForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            patient_id: editing.patientId,
            clinician_id: editing.clinicianId,
            visit_date: editing.visitDate,
            chief_complaint: editing.chiefComplaint ?? "",
            diagnosis: editing.diagnosis ?? "",
            vitals: parseVitals(editing.vitals),
            prescription: editing.prescription ?? "",
            notes: editing.notes ?? "",
            follow_up_date: editing.followUpDate ?? "",
            status: editing.status,
          }
        : { ...emptyEncounterForm, visit_date: new Date().toISOString().slice(0, 10) },
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<EncounterForm>) => setForm((f) => ({ ...f, ...patch }));
  const setVital = (patch: Partial<Vitals>) =>
    setForm((f) => ({ ...f, vitals: { ...f.vitals, ...patch } }));

  const selectedPatient = patients.find((p) => p.id === form.patient_id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Visit" : "Record Visit"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
            <SearchableSelect
              required
              disabled={!!editing}
              value={form.patient_id}
              onChange={(v) => set({ patient_id: v })}
              placeholder="Select patient…"
              searchPlaceholder="Search patients…"
              options={patients.map((p) => ({
                value: p.id,
                label: [p.firstName, p.lastName].filter(Boolean).join(" "),
                sublabel: p.mrn,
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Clinician</label>
            <SearchableSelect
              required
              value={form.clinician_id}
              onChange={(v) => set({ clinician_id: v })}
              placeholder="Select clinician…"
              searchPlaceholder="Search clinicians…"
              options={clinicians.map((c) => ({
                value: c.id,
                label: c.user?.name ?? "Unknown",
                sublabel: c.designation ?? undefined,
              }))}
            />
          </div>
        </div>

        {!editing && selectedPatient && (
          <PatientAllergyHint patientId={selectedPatient.id} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Visit Date</label>
            <input type="date" className="input-field" value={form.visit_date} required
              onChange={(e) => set({ visit_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Follow-up <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input type="date" className="input-field" value={form.follow_up_date}
              onChange={(e) => set({ follow_up_date: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Chief Complaint</label>
          <input className="input-field" placeholder="e.g. Fever and headache for 3 days"
            value={form.chief_complaint} onChange={(e) => set({ chief_complaint: e.target.value })} />
        </div>

        <fieldset className="border border-border rounded-lg p-3">
          <legend className="text-sm font-medium text-foreground/80 px-1">Vitals</legend>
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                ["bp", "BP", "120/80"],
                ["pulse", "Pulse", "72"],
                ["temp_c", "Temp °C", "36.8"],
                ["spo2", "SpO₂ %", "98"],
                ["weight_kg", "Weight kg", "70"],
              ] as const
            ).map(([key, label, ph]) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input className="input-field" placeholder={ph} value={form.vitals[key]}
                  onChange={(e) => setVital({ [key]: e.target.value } as Partial<Vitals>)} />
              </div>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Diagnosis</label>
          <input className="input-field" value={form.diagnosis}
            onChange={(e) => set({ diagnosis: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Prescription</label>
          <textarea className="input-field resize-y min-h-[120px]" rows={6}
            placeholder={"One item per line, e.g.\nParacetamol 500mg — 1-0-1 × 5 days"}
            value={form.prescription} onChange={(e) => set({ prescription: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
          <textarea className="input-field resize-y min-h-[100px]" rows={4} value={form.notes}
            onChange={(e) => set({ notes: e.target.value })} />
        </div>

        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.status === "closed"}
              onChange={(e) => set({ status: e.target.checked ? "closed" : "open" })}
            />
            Close this visit (no further edits expected)
          </label>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Save Visit"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Small safety banner: shows the selected patient's allergies while recording.
import { useQuery } from "@apollo/client";
import { GET_PATIENT } from "@/graphql/queries/clinical";

function PatientAllergyHint({ patientId }: { patientId: string }) {
  const { data } = useQuery(GET_PATIENT, { variables: { id: patientId } });
  const allergies = data?.patient?.allergies;
  const chronic = data?.patient?.chronicConditions;
  if (!allergies && !chronic) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-400">
      {allergies && <div>⚠ Allergies: {allergies}</div>}
      {chronic && <div>Chronic: {chronic}</div>}
    </div>
  );
}
