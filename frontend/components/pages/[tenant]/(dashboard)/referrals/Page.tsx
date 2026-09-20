"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_REFERRALS } from "@/graphql/queries/extended";
import {
  CREATE_REFERRAL, SET_REFERRAL_STATUS, DELETE_REFERRAL,
  SET_REFERRAL_COMMISSION, SETTLE_REFERRAL,
} from "@/graphql/mutations/extended";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import type { PickerPatient, PickerClinician } from "../appointments/types";
import ReferralCommissionModal from "./ReferralCommissionModal";
import type { CommissionForm, GqlReferral } from "./types";
import { URGENCIES, urgencyVariant, statusVariant, settlementVariant } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) => `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function ReferralsPage() {
  const [settlementFilter, setSettlementFilter] = useState("");
  const variables = { settlementStatus: settlementFilter || null };
  const refetchQueries = [{ query: LIST_REFERRALS, variables }];
  const { data, loading } = useQuery(LIST_REFERRALS, { variables });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createMut] = useMutation(CREATE_REFERRAL, { refetchQueries });
  const [statusMut] = useMutation(SET_REFERRAL_STATUS, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_REFERRAL, { refetchQueries });
  const [commissionMut] = useMutation(SET_REFERRAL_COMMISSION, { refetchQueries });
  const [settleMut] = useMutation(SETTLE_REFERRAL, { refetchQueries });

  const referrals: GqlReferral[] = data?.referrals ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: "", from_clinician_id: "", referred_to: "", specialty: "", reason: "", urgency: "routine", notes: "" });
  const [commissionFor, setCommissionFor] = useState<GqlReferral | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createMut({ variables: { input: {
        patientId: form.patient_id, fromClinicianId: form.from_clinician_id || null,
        referredTo: form.referred_to.trim(), specialty: form.specialty || null, reason: form.reason || null,
        urgency: form.urgency, notes: form.notes || null,
      } } });
      toast.success("Referral created"); setShow(false);
      setForm({ patient_id: "", from_clinician_id: "", referred_to: "", specialty: "", reason: "", urgency: "routine", notes: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const saveCommission = async (cf: CommissionForm) => {
    if (!commissionFor) return;
    try {
      await commissionMut({ variables: { id: commissionFor.id, input: {
        commissionType: cf.commission_type,
        commissionValue: cf.commission_value ? parseFloat(cf.commission_value) : null,
        commissionBase: cf.commission_base ? parseFloat(cf.commission_base) : null,
        payeeType: cf.payee_type || null,
        payeeName: cf.payee_name || null,
        payeeEmployeeId: cf.payee_employee_id || null,
      } } });
      toast.success("Commission saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save commission");
      throw err;
    }
  };

  const settle = async (r: GqlReferral) => {
    try {
      await settleMut({ variables: { id: r.id } });
      toast.success("Referral settled");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to settle");
    }
  };

  return (
    <div>
      <Header title="Referrals" subtitle="Outbound referrals to facilities and specialists" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select className="input-field w-auto" value={settlementFilter}
          onChange={(e) => setSettlementFilter(e.target.value)}>
          <option value="">All settlements</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
        <Can module="referrals" action="create"><button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}><Plus size={16} /> New Referral</button></Can>
      </div>

      {loading ? <LoadingSpinner /> : referrals.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No referrals yet.</div>
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Share2 size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{r.patientName} <span className="text-xs text-muted-foreground/70">({r.patientMrn})</span></div>
                    <div className="text-sm">→ {r.referredTo}{r.specialty ? ` · ${r.specialty}` : ""}</div>
                    <div className="text-xs text-muted-foreground/70">{r.referralDate}{r.fromClinicianName ? ` · ${r.fromClinicianName}` : ""}</div>
                    {r.reason && <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>}
                    {r.commissionType !== "none" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Commission: <span className="font-mono">{r.commissionAmount.toFixed(2)}</span>
                        {(r.payeeEmployeeName || r.payeeName) && ` → ${r.payeeEmployeeName || r.payeeName}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={r.urgency} variant={urgencyVariant(r.urgency)} className="capitalize" />
                  <Badge label={r.status} variant={statusVariant(r.status)} className="capitalize" />
                  {r.commissionType !== "none" && (
                    <Badge label={r.settlementStatus} variant={settlementVariant(r.settlementStatus)} className="capitalize" />
                  )}
                  {r.status !== "completed" && r.status !== "declined" && (
                    <Can module="referrals" action="edit">
                      <select className="input-field text-xs py-1 w-28" value="" onChange={(e) => e.target.value && statusMut({ variables: { id: r.id, status: e.target.value } })}>
                        <option value="">Status…</option><option value="accepted">Accepted</option><option value="completed">Completed</option><option value="declined">Declined</option>
                      </select>
                    </Can>
                  )}
                  <Can module="referrals" action="edit">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => setCommissionFor(r)}>
                      Commission
                    </button>
                  </Can>
                  {r.commissionType !== "none" && r.settlementStatus === "pending" && (
                    <Can module="referrals" action="edit">
                      <button className="text-xs text-emerald-600 hover:underline" onClick={() => settle(r)}>
                        Settle
                      </button>
                    </Can>
                  )}
                  <Can module="referrals" action="delete"><button className="text-xs text-red-500 hover:underline" onClick={() => deleteMut({ variables: { id: r.id } })}>Delete</button></Can>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="New Referral" isOpen={show} onClose={() => setShow(false)}>
        <form onSubmit={create} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Patient</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(v) => setForm({ ...form, patient_id: v })}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Referred To</label><input className="input-field" placeholder="Facility / specialist" value={form.referred_to} required onChange={(e) => setForm({ ...form, referred_to: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">Specialty</label><input className="input-field" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">From Clinician</label>
              <SearchableSelect
                value={form.from_clinician_id}
                onChange={(v) => setForm({ ...form, from_clinician_id: v })}
                options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
                placeholder="— none —"
              /></div>
            <div><label className="block text-sm font-medium mb-1">Urgency</label><select className="input-field" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>{URGENCIES.map((u) => <option key={u}>{u}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Reason</label><input className="input-field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Create"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShow(false)}>Cancel</button></div>
        </form>
      </Modal>

      <ReferralCommissionModal
        referral={commissionFor}
        clinicians={clinicians}
        onClose={() => setCommissionFor(null)}
        onSave={saveCommission}
      />
    </div>
  );
}
