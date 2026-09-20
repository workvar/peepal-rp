"use client";

// Admit a patient: pick patient, clinician, ward → available bed, reason, and
// optionally open a linked IPD encounter.

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { GqlWard } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const patientLabel = (p: PickerPatient) =>
  `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function AdmitModal({
  isOpen, onClose, wards, patients, clinicians, onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  wards: GqlWard[];
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  onSubmit: (input: {
    patientId: string; clinicianId: string; wardId: string; bedId: string;
    reason: string; openEncounter: boolean;
  }) => Promise<void>;
}) {
  const [patientId, setPatientId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
  const [openEncounter, setOpenEncounter] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableBeds = useMemo(() => {
    const w = wards.find((x) => x.id === wardId);
    return (w?.beds ?? []).filter((b) => b.status === "available");
  }, [wards, wardId]);

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: p.id, label: patientLabel(p) })),
    [patients]
  );
  const wardOptions = useMemo(
    () => wards.map((w) => ({ value: w.id, label: w.name, sublabel: `${w.bedCount - w.occupiedCount} free` })),
    [wards]
  );
  const bedOptions = useMemo(
    () => availableBeds.map((b) => ({ value: b.id, label: b.bedNumber, sublabel: b.bay || undefined })),
    [availableBeds]
  );
  const clinicianOptions = useMemo(
    () => clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" })),
    [clinicians]
  );

  const reset = () => {
    setPatientId(""); setClinicianId(""); setWardId(""); setBedId("");
    setReason(""); setOpenEncounter(false);
  };
  const close = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !wardId || !bedId) return;
    setSaving(true);
    try {
      await onSubmit({ patientId, clinicianId, wardId, bedId, reason, openEncounter });
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Admit Patient" isOpen={isOpen} onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
          <SearchableSelect
            options={patientOptions}
            value={patientId}
            onChange={setPatientId}
            required
            placeholder="Select patient…"
            searchPlaceholder="Search patients…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Ward</label>
            <SearchableSelect
              options={wardOptions}
              value={wardId}
              onChange={(v) => { setWardId(v); setBedId(""); }}
              required
              placeholder="Select ward…"
              searchPlaceholder="Search wards…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Bed</label>
            <SearchableSelect
              options={bedOptions}
              value={bedId}
              onChange={setBedId}
              required
              disabled={!wardId}
              placeholder={wardId ? "Select bed…" : "Pick a ward first"}
              searchPlaceholder="Search beds…"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Admitting clinician</label>
          <SearchableSelect
            options={clinicianOptions}
            value={clinicianId}
            onChange={setClinicianId}
            placeholder="— none —"
            searchPlaceholder="Search clinicians…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Reason for admission</label>
          <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input type="checkbox" checked={openEncounter}
            onChange={(e) => setOpenEncounter(e.target.checked)} disabled={!clinicianId} />
          Open a linked IPD encounter (requires a clinician)
        </label>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving || !patientId || !bedId}>
            {saving ? "Admitting…" : "Admit"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={close}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
