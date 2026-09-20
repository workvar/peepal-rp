"use client";

// Transfer an admitted patient to another available bed (the T in ADT).

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlWard, GqlAdmission } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function TransferModal({
  admission, wards, onClose, onSubmit,
}: {
  admission: GqlAdmission | null;
  wards: GqlWard[];
  onClose: () => void;
  onSubmit: (admissionId: string, toBedId: string, reason: string) => Promise<void>;
}) {
  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const availableBeds = useMemo(() => {
    const w = wards.find((x) => x.id === wardId);
    return (w?.beds ?? []).filter((b) => b.status === "available" && b.id !== admission?.bedId);
  }, [wards, wardId, admission]);

  const close = () => { setWardId(""); setBedId(""); setReason(""); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission || !bedId) return;
    setSaving(true);
    try {
      await onSubmit(admission.id, bedId, reason);
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={admission ? `Transfer — ${admission.patientName}` : "Transfer"}
      isOpen={!!admission} onClose={close}>
      {admission && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Currently on <span className="font-medium text-foreground/80">{admission.wardName} · Bed {admission.bedNumber}</span>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">To ward</label>
              <SearchableSelect
                value={wardId}
                onChange={(v) => { setWardId(v); setBedId(""); }}
                options={wards.map((w) => ({ value: w.id, label: w.name }))}
                placeholder="Select ward…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">To bed</label>
              <SearchableSelect
                value={bedId}
                onChange={setBedId}
                disabled={!wardId}
                options={availableBeds.map((b) => ({ value: b.id, label: `${b.bedNumber}${b.bay ? ` · ${b.bay}` : ""}` }))}
                placeholder={wardId ? "Select bed…" : "Pick a ward first"}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Reason</label>
            <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving || !bedId}>
              {saving ? "Transferring…" : "Transfer"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
