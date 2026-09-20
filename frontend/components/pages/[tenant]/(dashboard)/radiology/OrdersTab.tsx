"use client";

// Radiology orders: list with workflow status, a New Order modal, and a Report
// modal (findings + impression) that flips the order to reported.

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import type { GqlRadStudy, GqlRadOrder } from "./types";
import { radStatusVariant } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) =>
  `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function OrdersTab({
  orders, studies, patients, clinicians, onCreate, onSetStatus, onReport,
}: {
  orders: GqlRadOrder[];
  studies: GqlRadStudy[];
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  onCreate: (input: { patientId: string; orderedById: string; studyId: string; notes: string }) => Promise<void>;
  onSetStatus: (o: GqlRadOrder, status: string) => Promise<void>;
  onReport: (o: GqlRadOrder, findings: string, impression: string) => Promise<void>;
}) {
  const [showNew, setShowNew] = useState(false);
  const [reporting, setReporting] = useState<GqlRadOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [studyId, setStudyId] = useState("");
  const [notes, setNotes] = useState("");
  const resetNew = () => { setPatientId(""); setClinicianId(""); setStudyId(""); setNotes(""); };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !studyId) return;
    setSaving(true);
    try {
      await onCreate({ patientId, orderedById: clinicianId, studyId, notes });
      setShowNew(false);
      resetNew();
    } finally {
      setSaving(false);
    }
  };

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const openReport = (o: GqlRadOrder) => {
    setFindings(o.findings ?? "");
    setImpression(o.impression ?? "");
    setReporting(o);
  };
  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporting || !findings.trim() || !impression.trim()) return;
    setSaving(true);
    try {
      await onReport(reporting, findings, impression);
      setReporting(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Can module="radiology" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
            <Plus size={16} /> New Order
          </button>
        </Can>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No radiology orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {o.studyName} <span className="text-xs uppercase text-muted-foreground/70">({o.modality})</span>
                  </div>
                  <div className="text-sm">{o.patientName} <span className="text-xs text-muted-foreground/70">({o.patientMrn})</span></div>
                  <div className="text-xs text-muted-foreground/70">
                    {o.orderDate}{o.orderedByName ? ` · ${o.orderedByName}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={o.status} variant={radStatusVariant(o.status)} className="capitalize" />
                  {o.status !== "reported" && o.status !== "cancelled" && (
                    <Can module="radiology" action="edit">
                      <select className="input-field text-xs py-1 w-32" value=""
                        onChange={(e) => e.target.value && onSetStatus(o, e.target.value)}>
                        <option value="">Set status…</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => openReport(o)}>
                        <FileText size={14} /> Report
                      </button>
                    </Can>
                  )}
                  {o.status === "reported" && (
                    <Can module="radiology" action="edit">
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => openReport(o)}>View report</button>
                    </Can>
                  )}
                </div>
              </div>
              {o.impression && (
                <div className="mt-2 text-sm text-muted-foreground border-t border-border/50 pt-2">
                  <span className="font-medium text-foreground/80">Impression:</span> {o.impression}
                  {o.reportedByName && <span className="text-xs"> — {o.reportedByName}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New order */}
      <Modal title="New Radiology Order" isOpen={showNew} onClose={() => { setShowNew(false); resetNew(); }}>
        <form onSubmit={submitNew} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
            <SearchableSelect
              value={patientId}
              onChange={setPatientId}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Study</label>
              <SearchableSelect
                value={studyId}
                onChange={setStudyId}
                options={studies.filter((s) => s.active).map((s) => ({ value: s.id, label: `${s.name} (${s.modality})` }))}
                placeholder="Select study…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Ordering clinician</label>
              <SearchableSelect
                value={clinicianId}
                onChange={setClinicianId}
                options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
                placeholder="— none —"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving || !patientId || !studyId}>
              {saving ? "Saving…" : "Create Order"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowNew(false); resetNew(); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Report */}
      <Modal title={reporting ? `Report — ${reporting.studyName}` : "Report"}
        isOpen={!!reporting} onClose={() => setReporting(null)}>
        {reporting && (
          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Findings</label>
              <textarea className="input-field min-h-24" value={findings} required
                onChange={(e) => setFindings(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Impression</label>
              <textarea className="input-field min-h-16" value={impression} required
                onChange={(e) => setImpression(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "File Report"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setReporting(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
