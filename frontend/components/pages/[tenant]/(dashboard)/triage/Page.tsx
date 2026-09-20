"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope } from "lucide-react";
import toast from "react-hot-toast";
import { useTriage } from "./useTriage";
import type { GqlTriageCase, TriageForm } from "./types";
import { emptyTriageForm, TRIAGE_LEVELS, DISPOSITIONS, levelVariant, statusVariant } from "./types";
import type { PickerPatient } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) =>
  `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function TriagePage() {
  const { cases, patients, clinicians, loading, showDisposed, setShowDisposed, createMut, updateMut } = useTriage();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<TriageForm>(emptyTriageForm);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<TriageForm>) => setForm((f) => ({ ...f, ...patch }));

  const createCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createMut({ variables: { input: {
        patientId: form.patient_id, chiefComplaint: form.chief_complaint || null,
        triageLevel: parseInt(form.triage_level, 10), assignedClinicianId: form.assigned_clinician_id || null,
        notes: form.notes || null,
      } } });
      toast.success("Case created");
      setShowNew(false); setForm(emptyTriageForm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally { setSaving(false); }
  };

  const update = async (c: GqlTriageCase, patch: Record<string, unknown>) => {
    try { await updateMut({ variables: { id: c.id, input: patch } }); toast.success("Updated"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div>
      <Header title="Emergency / Triage" subtitle="Acuity-scored ED board, most urgent first" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button onClick={() => setShowDisposed(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${!showDisposed ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Active</button>
          <button onClick={() => setShowDisposed(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${showDisposed ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Disposed</button>
        </div>
        <Can module="triage" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
            <Plus size={16} /> New Case
          </button>
        </Can>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : cases.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">{showDisposed ? "No disposed cases." : "No active cases."}</div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Badge label={`L${c.triageLevel}`} variant={levelVariant(c.triageLevel)} />
                <div>
                  <div className="font-medium">{c.patientName} <span className="text-xs text-muted-foreground/70">({c.patientMrn})</span></div>
                  {c.chiefComplaint && <div className="text-sm text-muted-foreground">{c.chiefComplaint}</div>}
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <Stethoscope size={12} /> {new Date(c.arrivalTime).toLocaleString()}
                    {c.assignedClinicianName ? ` · ${c.assignedClinicianName}` : ""}
                    {c.disposition ? ` · ${c.disposition}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={c.status.replace("_", " ")} variant={statusVariant(c.status)} className="capitalize" />
                {c.status !== "disposed" && (
                  <Can module="triage" action="edit">
                    {c.status === "waiting" && (
                      <button className="btn-secondary text-xs" onClick={() => update(c, { status: "in_treatment" })}>Start treatment</button>
                    )}
                    <select className="input-field text-xs py-1 w-32" value="" onChange={(e) => e.target.value && update(c, { disposition: e.target.value })}>
                      <option value="">Dispose…</option>
                      {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Can>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="New Triage Case" isOpen={showNew} onClose={() => setShowNew(false)}>
        <form onSubmit={createCase} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(v) => set({ patient_id: v })}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Acuity</label>
              <select className="input-field" value={form.triage_level} onChange={(e) => set({ triage_level: e.target.value })}>
                {TRIAGE_LEVELS.map((l) => <option key={l.level} value={l.level}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Clinician</label>
              <SearchableSelect
                value={form.assigned_clinician_id}
                onChange={(v) => set({ assigned_clinician_id: v })}
                options={clinicians.map((cl) => ({ value: cl.id, label: cl.user?.name ?? "Unnamed" }))}
                placeholder="— none —"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Chief complaint</label>
            <input className="input-field" value={form.chief_complaint} onChange={(e) => set({ chief_complaint: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Create"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
