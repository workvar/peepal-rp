"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlPatient, PatientForm } from "./types";
import { emptyPatientForm } from "./types";

const GENDERS = ["male", "female", "other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientModal({
  isOpen,
  onClose,
  editing,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlPatient | null;
  onSave: (form: PatientForm) => Promise<void>;
}) {
  const [form, setForm] = useState<PatientForm>(emptyPatientForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            mrn: editing.mrn,
            first_name: editing.firstName,
            last_name: editing.lastName ?? "",
            gender: editing.gender ?? "",
            date_of_birth: editing.dateOfBirth ?? "",
            blood_group: editing.bloodGroup ?? "",
            phone: editing.phone ?? "",
            email: editing.email ?? "",
            address: editing.address ?? "",
            city: editing.city ?? "",
            emergency_name: editing.emergencyName ?? "",
            emergency_phone: editing.emergencyPhone ?? "",
            allergies: editing.allergies ?? "",
            chronic_conditions: editing.chronicConditions ?? "",
            status: editing.status,
          }
        : emptyPatientForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<PatientForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
      {node}
    </div>
  );

  return (
    <Modal title={editing ? "Edit Patient" : "Register Patient"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {field("First Name", (
            <input className="input-field" value={form.first_name} required
              onChange={(e) => set({ first_name: e.target.value })} />
          ))}
          {field("Last Name", (
            <input className="input-field" value={form.last_name}
              onChange={(e) => set({ last_name: e.target.value })} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {field("Gender", (
            <select className="input-field" value={form.gender}
              onChange={(e) => set({ gender: e.target.value })}>
              <option value="">—</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          ))}
          {field("Date of Birth", (
            <input type="date" className="input-field" value={form.date_of_birth}
              onChange={(e) => set({ date_of_birth: e.target.value })} />
          ))}
          {field("Blood Group", (
            <select className="input-field" value={form.blood_group}
              onChange={(e) => set({ blood_group: e.target.value })}>
              <option value="">—</option>
              {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field("Phone", (
            <input className="input-field" value={form.phone}
              onChange={(e) => set({ phone: e.target.value })} />
          ))}
          {field("Email", (
            <input type="email" className="input-field" value={form.email}
              onChange={(e) => set({ email: e.target.value })} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field("Address", (
            <input className="input-field" value={form.address}
              onChange={(e) => set({ address: e.target.value })} />
          ))}
          {field("City", (
            <input className="input-field" value={form.city}
              onChange={(e) => set({ city: e.target.value })} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field("Emergency Contact Name", (
            <input className="input-field" value={form.emergency_name}
              onChange={(e) => set({ emergency_name: e.target.value })} />
          ))}
          {field("Emergency Contact Phone", (
            <input className="input-field" value={form.emergency_phone}
              onChange={(e) => set({ emergency_phone: e.target.value })} />
          ))}
        </div>

        {field("Allergies", (
          <input className="input-field" placeholder="e.g. Penicillin, peanuts" value={form.allergies}
            onChange={(e) => set({ allergies: e.target.value })} />
        ))}
        {field("Chronic Conditions", (
          <input className="input-field" placeholder="e.g. Diabetes, hypertension" value={form.chronic_conditions}
            onChange={(e) => set({ chronic_conditions: e.target.value })} />
        ))}

        <div className="grid grid-cols-2 gap-3">
          {field("MRN", (
            <input className="input-field" placeholder={editing ? "" : "Auto-generated when blank"}
              value={form.mrn} onChange={(e) => set({ mrn: e.target.value })} />
          ))}
          {editing &&
            field("Status", (
              <select className="input-field" value={form.status}
                onChange={(e) => set({ status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
              </select>
            ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Register"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
