"use client";

// Modal for setting a referral's commission / income-sharing terms.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { PickerClinician } from "../appointments/types";
import type { CommissionForm, GqlReferral } from "./types";
import { COMMISSION_TYPES, PAYEE_TYPES, emptyCommissionForm, commissionFormFromReferral } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ReferralCommissionModal({
  referral,
  clinicians,
  onClose,
  onSave,
}: {
  referral: GqlReferral | null;
  clinicians: PickerClinician[];
  onClose: () => void;
  onSave: (form: CommissionForm) => Promise<void>;
}) {
  const [form, setForm] = useState<CommissionForm>(emptyCommissionForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(referral ? commissionFormFromReferral(referral) : emptyCommissionForm);
  }, [referral]);

  const set = (patch: Partial<CommissionForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const computed =
    form.commission_type === "flat"
      ? parseFloat(form.commission_value) || 0
      : form.commission_type === "percent"
        ? ((parseFloat(form.commission_base) || 0) * (parseFloat(form.commission_value) || 0)) / 100
        : 0;

  return (
    <Modal title={referral ? `Commission — ${referral.patientName}` : "Commission"} isOpen={!!referral} onClose={onClose}>
      {referral && (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
              <select className="input-field" value={form.commission_type}
                onChange={(e) => set({ commission_type: e.target.value })}>
                {COMMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.commission_type !== "none" && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  {form.commission_type === "percent" ? "Percent (0-100)" : "Flat Amount"}
                </label>
                <input type="number" min="0" step="0.01" className="input-field" value={form.commission_value}
                  onChange={(e) => set({ commission_value: e.target.value })} />
              </div>
            )}
          </div>

          {form.commission_type === "percent" && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Billable Base</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.commission_base}
                onChange={(e) => set({ commission_base: e.target.value })} />
            </div>
          )}

          {form.commission_type !== "none" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Payee Type</label>
                  <select className="input-field" value={form.payee_type}
                    onChange={(e) => set({ payee_type: e.target.value, payee_employee_id: "", payee_name: "" })}>
                    <option value="">— select —</option>
                    {PAYEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.payee_type === "doctor" ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Internal Doctor (optional)</label>
                    <SearchableSelect
                      value={form.payee_employee_id}
                      onChange={(v) => set({ payee_employee_id: v })}
                      options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
                      placeholder="— external —"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Payee Name</label>
                    <input className="input-field" value={form.payee_name}
                      onChange={(e) => set({ payee_name: e.target.value })} />
                  </div>
                )}
              </div>
              {form.payee_type === "doctor" && !form.payee_employee_id && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">External Doctor Name</label>
                  <input className="input-field" value={form.payee_name}
                    onChange={(e) => set({ payee_name: e.target.value })} />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Computed commission: <span className="font-mono font-medium">{computed.toFixed(2)}</span>
              </p>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
