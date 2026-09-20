"use client";

// Claims list with create/edit, submit-for-approval, and settle actions, plus
// bulk upload, multi-select delete, and scroll-based lazy loading.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { useBulkSelect, runBulkDelete, BulkDeleteBar, RowCheckbox } from "@/components/ui/bulkSelect";
import { useLazyList } from "@/components/ui/useLazyList";
import { Plus, Send, CheckCircle2, Trash2 } from "lucide-react";
import type { GqlClaim, GqlPayer, ClaimForm } from "./types";
import { emptyClaimForm, claimStatusVariant } from "./types";
import type { PickerPatient } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) =>
  `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

// Only draft / rejected claims can be deleted (matches the backend guard).
const deletable = (c: GqlClaim) => c.status === "draft" || c.status === "rejected";

export default function ClaimsTab({
  claims, payers, patients, onSave, onSubmitClaim, onSettle, onDelete, deleteOne, onBulkFinished,
}: {
  claims: GqlClaim[];
  payers: GqlPayer[];
  patients: PickerPatient[];
  onSave: (editing: GqlClaim | null, form: ClaimForm) => Promise<void>;
  onSubmitClaim: (c: GqlClaim) => void;
  onSettle: (c: GqlClaim) => void;
  onDelete: (c: GqlClaim) => void;
  deleteOne: (id: string) => Promise<unknown>;
  onBulkFinished: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlClaim | null>(null);
  const [form, setForm] = useState<ClaimForm>(emptyClaimForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sel = useBulkSelect();
  const { visible, sentinelRef, hasMore, shown, total } = useLazyList<GqlClaim, HTMLDivElement>(claims);

  useEffect(() => {
    if (!showModal) return;
    setForm(editing
      ? {
          patient_id: editing.patientId, payer_id: editing.payerId ?? "",
          policy_number: editing.policyNumber ?? "", diagnosis: editing.diagnosis ?? "",
          claim_amount: String(editing.claimAmount), notes: editing.notes ?? "",
        }
      : emptyClaimForm);
  }, [showModal, editing]);

  const set = (patch: Partial<ClaimForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      setShowModal(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    setDeleting(true);
    await runBulkDelete([...sel.selected], deleteOne, "claim");
    sel.clear();
    setDeleting(false);
  };

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <Can module="claims" action="create">
          <BulkUploadButton resource="insurance_claims" label="Bulk Claims"
            onFinished={(s) => { if (s.successful > 0) onBulkFinished(); }} />
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> New Claim
          </button>
        </Can>
      </div>

      <Can module="claims" action="delete">
        <BulkDeleteBar sel={sel} onDelete={deleteSelected} deleting={deleting} />
      </Can>

      {claims.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No claims yet.</div>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((c) => (
              <div key={c.id} className={`card ${sel.selected.has(c.id) ? "ring-1 ring-primary/40" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {deletable(c) && (
                      <Can module="claims" action="delete">
                        <span className="pt-1">
                          <RowCheckbox checked={sel.selected.has(c.id)} onChange={() => sel.toggle(c.id)} />
                        </span>
                      </Can>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{c.claimNumber}</span>
                        <Badge label={c.status.replace("_", " ")} variant={claimStatusVariant(c.status)} className="capitalize" />
                      </div>
                      <div className="text-sm mt-0.5">{c.patientName} <span className="text-xs text-muted-foreground/70">({c.patientMrn})</span></div>
                      <div className="text-xs text-muted-foreground/70">
                        {c.payerName ?? "—"}{c.policyNumber ? ` · Policy ${c.policyNumber}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">{c.claimAmount.toFixed(2)}</div>
                    {c.approvedAmount > 0 && (
                      <div className="text-xs text-emerald-600">approved {c.approvedAmount.toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                  {deletable(c) && (
                    <Can module="claims" action="edit">
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => { setEditing(c); setShowModal(true); }}>Edit</button>
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => onSubmitClaim(c)}>
                        <Send size={13} /> Submit
                      </button>
                    </Can>
                  )}
                  {c.status === "approved" && (
                    <Can module="claims" action="edit">
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => onSettle(c)}>
                        <CheckCircle2 size={13} /> Settle
                      </button>
                    </Can>
                  )}
                  {deletable(c) && (
                    <Can module="claims" action="delete">
                      <button className="text-red-500 hover:text-red-700 p-1 ml-auto" aria-label="Delete claim" onClick={() => onDelete(c)}>
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="text-center text-sm text-muted-foreground/70 py-4">Loading more…</div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground/60">Showing {shown} of {total}</div>
        </>
      )}

      <Modal title={editing ? `Edit ${editing.claimNumber}` : "New Claim"} isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(v) => set({ patient_id: v })}
              disabled={!!editing}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Payer</label>
              <SearchableSelect
                value={form.payer_id}
                onChange={(v) => set({ payer_id: v })}
                options={payers.filter((p) => p.active || p.id === form.payer_id).map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select payer…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Policy Number</label>
              <input className="input-field" value={form.policy_number} onChange={(e) => set({ policy_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Claim Amount</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.claim_amount} required
                onChange={(e) => set({ claim_amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Diagnosis</label>
              <input className="input-field" value={form.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
