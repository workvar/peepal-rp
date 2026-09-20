"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { clinicalAPI } from "@/api/services/clinical";
import { useClaims } from "./useClaims";
import PayersTab from "./PayersTab";
import ClaimsTab from "./ClaimsTab";
import type { GqlPayer, GqlClaim, PayerForm, ClaimForm } from "./types";

type Tab = "claims" | "payers";

export default function ClaimsPage() {
  const {
    payers, claims, patients, loading,
    refetchPayers, refetchClaims,
    createPayerMut, updatePayerMut, deletePayerMut,
    createClaimMut, updateClaimMut, deleteClaimMut, settleClaimMut,
  } = useClaims();

  const deletePayerOne = (id: string) => deletePayerMut({ variables: { id } });
  const deleteClaimOne = (id: string) => deleteClaimMut({ variables: { id } });

  const [tab, setTab] = useState<Tab>("claims");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const savePayer = async (editing: GqlPayer | null, form: PayerForm) => {
    const base = {
      code: form.code.trim(), name: form.name.trim(), payerType: form.payer_type,
      contactName: form.contact_name || null, phone: form.phone || null, email: form.email || null,
    };
    try {
      if (editing) {
        await updatePayerMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Payer updated");
      } else {
        await createPayerMut({ variables: { input: base } });
        toast.success("Payer added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save payer");
      throw err;
    }
  };

  const deletePayer = (p: GqlPayer) => setConfirmState({
    title: "Delete Payer", message: `Remove “${p.name}”?`, variant: "danger", confirmLabel: "Delete",
    onConfirm: async () => {
      try { await deletePayerMut({ variables: { id: p.id } }); toast.success("Deleted"); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    },
  });

  const saveClaim = async (editing: GqlClaim | null, form: ClaimForm) => {
    try {
      if (editing) {
        await updateClaimMut({ variables: { id: editing.id, input: {
          payerId: form.payer_id, policyNumber: form.policy_number || null,
          diagnosis: form.diagnosis || null, claimAmount: parseFloat(form.claim_amount) || 0, notes: form.notes || null,
        } } });
        toast.success("Claim updated");
      } else {
        await createClaimMut({ variables: { input: {
          patientId: form.patient_id, payerId: form.payer_id, policyNumber: form.policy_number || null,
          diagnosis: form.diagnosis || null, claimAmount: parseFloat(form.claim_amount) || 0, notes: form.notes || null,
        } } });
        toast.success("Claim created");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save claim");
      throw err;
    }
  };

  const submitClaim = (c: GqlClaim) => setConfirmState({
    title: "Submit Claim", message: `Submit ${c.claimNumber} for approval?`, confirmLabel: "Submit",
    onConfirm: async () => {
      try {
        const res = await clinicalAPI.submitClaim(c.id);
        toast.success(res.data?.message ?? "Submitted");
        setRefreshKey((k) => k + 1); // triggers a refetch via key on the hook consumer
        window.location.reload();
      } catch {
        toast.error("Failed to submit claim");
      }
    },
  });

  const settleClaim = (c: GqlClaim) => setConfirmState({
    title: "Settle Claim", message: `Mark ${c.claimNumber} settled?`, confirmLabel: "Settle",
    onConfirm: async () => {
      try { await settleClaimMut({ variables: { id: c.id, approvedAmount: c.approvedAmount || c.claimAmount } }); toast.success("Settled"); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    },
  });

  const deleteClaim = (c: GqlClaim) => setConfirmState({
    title: "Delete Claim", message: `Delete ${c.claimNumber}?`, variant: "danger", confirmLabel: "Delete",
    onConfirm: async () => {
      try { await deleteClaimMut({ variables: { id: c.id } }); toast.success("Deleted"); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    },
  });

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}>{label}</button>
  );

  return (
    <div key={refreshKey}>
      <Header title="Insurance Claims" subtitle="TPA / insurer claims routed through the approval engine" />
      <div className="flex gap-2 mb-4">
        {tabBtn("claims", "Claims")}
        {tabBtn("payers", "Payers")}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "claims" ? (
        <ClaimsTab claims={claims} payers={payers} patients={patients}
          onSave={saveClaim} onSubmitClaim={submitClaim} onSettle={settleClaim} onDelete={deleteClaim}
          deleteOne={deleteClaimOne} onBulkFinished={() => refetchClaims()} />
      ) : (
        <PayersTab payers={payers} onSave={savePayer} onDelete={deletePayer}
          deleteOne={deletePayerOne} onBulkFinished={() => refetchPayers()} />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
