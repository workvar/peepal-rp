"use client";

// Discharge an admitted patient: capture the discharge summary. The bed is
// freed and any linked encounter is closed by the backend.

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlAdmission } from "./types";

export default function DischargeModal({
  admission, onClose, onSubmit,
}: {
  admission: GqlAdmission | null;
  onClose: () => void;
  onSubmit: (admissionId: string, fields: {
    dischargeDiagnosis: string; treatmentGiven: string;
    conditionOnDischarge: string; followUpInstructions: string;
  }) => Promise<void>;
}) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [condition, setCondition] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => { setDiagnosis(""); setTreatment(""); setCondition(""); setFollowUp(""); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission) return;
    setSaving(true);
    try {
      await onSubmit(admission.id, {
        dischargeDiagnosis: diagnosis, treatmentGiven: treatment,
        conditionOnDischarge: condition, followUpInstructions: followUp,
      });
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={admission ? `Discharge — ${admission.patientName}` : "Discharge"}
      isOpen={!!admission} onClose={close}>
      {admission && (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Diagnosis</label>
            <textarea className="input-field min-h-16" value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Treatment given</label>
            <textarea className="input-field min-h-16" value={treatment}
              onChange={(e) => setTreatment(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Condition on discharge</label>
              <input className="input-field" placeholder="Stable" value={condition}
                onChange={(e) => setCondition(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Follow-up instructions</label>
            <textarea className="input-field min-h-16" value={followUp}
              onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Discharging…" : "Discharge"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
