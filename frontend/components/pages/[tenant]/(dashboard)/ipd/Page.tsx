"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRightLeft, LogOut, FileDown, BedDouble } from "lucide-react";
import toast from "react-hot-toast";
import { clinicalAPI } from "@/api/services/clinical";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import { getErrorMessage } from "@/lib/errors";
import { useIpd } from "./useIpd";
import AdmitModal from "./AdmitModal";
import TransferModal from "./TransferModal";
import DischargeModal from "./DischargeModal";
import type { GqlAdmission } from "./types";

export default function IpdPage() {
  const {
    wards, admissions, patients, clinicians, loading,
    showDischarged, setShowDischarged, admitMut, transferMut, dischargeMut,
  } = useIpd();

  const [admitOpen, setAdmitOpen] = useState(false);
  const [transferring, setTransferring] = useState<GqlAdmission | null>(null);
  const [discharging, setDischarging] = useState<GqlAdmission | null>(null);

  const admit = async (input: {
    patientId: string; clinicianId: string; wardId: string; bedId: string;
    reason: string; openEncounter: boolean;
  }) => {
    try {
      await admitMut({
        variables: {
          input: {
            patientId: input.patientId,
            clinicianId: input.clinicianId || null,
            wardId: input.wardId,
            bedId: input.bedId,
            reason: input.reason || null,
            openEncounter: input.openEncounter,
          },
        },
      });
      toast.success("Patient admitted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to admit"));
      throw err;
    }
  };

  const transfer = async (admissionId: string, toBedId: string, reason: string) => {
    try {
      await transferMut({ variables: { input: { admissionId, toBedId, reason: reason || null } } });
      toast.success("Patient transferred");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to transfer"));
      throw err;
    }
  };

  const discharge = async (admissionId: string, fields: {
    dischargeDiagnosis: string; treatmentGiven: string;
    conditionOnDischarge: string; followUpInstructions: string;
  }) => {
    try {
      await dischargeMut({ variables: { input: { admissionId, ...fields } } });
      toast.success("Patient discharged");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to discharge"));
      throw err;
    }
  };

  const downloadSummary = async (a: GqlAdmission) => {
    try {
      const res = await clinicalAPI.downloadDischargeSummaryPDF(a.id);
      downloadBlobResponse(res.data, `discharge-${a.patientMrn}.pdf`);
    } catch {
      toast.error("Could not generate the discharge summary");
    }
  };

  return (
    <div>
      <Header title="Admissions (IPD)" subtitle="Admit, transfer, and discharge inpatients" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button onClick={() => setShowDischarged(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${!showDischarged ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Current
          </button>
          <button onClick={() => setShowDischarged(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${showDischarged ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Discharged
          </button>
        </div>
        <Can module="admissions" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setAdmitOpen(true)}>
            <Plus size={16} /> Admit Patient
          </button>
        </Can>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : admissions.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          {showDischarged ? "No discharged patients." : "No patients currently admitted."}
        </div>
      ) : (
        <div className="space-y-3">
          {admissions.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{a.patientName} <span className="text-xs text-muted-foreground/70">({a.patientMrn})</span></div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <BedDouble size={14} />
                    {a.wardName ?? "—"}{a.bedNumber ? ` · Bed ${a.bedNumber}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    Admitted {a.admissionDate}{a.clinicianName ? ` · ${a.clinicianName}` : ""}
                    {a.dischargeDate ? ` · Discharged ${a.dischargeDate}` : ""}
                  </div>
                  {a.reason && <div className="text-xs text-muted-foreground mt-1">{a.reason}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={a.status} variant={a.status === "admitted" ? "blue" : "gray"} className="capitalize" />
                  {a.status === "admitted" ? (
                    <Can module="admissions" action="edit">
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setTransferring(a)}>
                        <ArrowRightLeft size={14} /> Transfer
                      </button>
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setDischarging(a)}>
                        <LogOut size={14} /> Discharge
                      </button>
                    </Can>
                  ) : (
                    <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => downloadSummary(a)}>
                      <FileDown size={14} /> Summary
                    </button>
                  )}
                </div>
              </div>
              {a.transfers.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground/80">
                  {a.transfers.map((t) => (
                    <div key={t.id}>{t.transferDate}: {t.fromBedNumber} → {t.toBedNumber}{t.reason ? ` (${t.reason})` : ""}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AdmitModal isOpen={admitOpen} onClose={() => setAdmitOpen(false)}
        wards={wards} patients={patients} clinicians={clinicians} onSubmit={admit} />
      <TransferModal admission={transferring} wards={wards}
        onClose={() => setTransferring(null)} onSubmit={transfer} />
      <DischargeModal admission={discharging}
        onClose={() => setDischarging(null)} onSubmit={discharge} />
    </div>
  );
}
