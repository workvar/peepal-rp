"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Video } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_TELE_CONSULTS } from "@/graphql/queries/extended";
import { SCHEDULE_TELE_CONSULT, UPDATE_TELE_CONSULT, CANCEL_TELE_CONSULT } from "@/graphql/mutations/extended";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import type { PickerPatient, PickerClinician } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const patientLabel = (p: PickerPatient) => `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();
const statusVariant = (s: string): "blue" | "yellow" | "green" | "gray" => s === "completed" ? "green" : s === "in_progress" ? "yellow" : s === "cancelled" ? "gray" : "blue";

export default function TelemedicinePage() {
  const refetchQueries = [{ query: LIST_TELE_CONSULTS, variables: {} }];
  const { data, loading } = useQuery(LIST_TELE_CONSULTS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [scheduleMut] = useMutation(SCHEDULE_TELE_CONSULT, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_TELE_CONSULT, { refetchQueries });
  const [cancelMut] = useMutation(CANCEL_TELE_CONSULT, { refetchQueries });

  const consults = data?.teleConsults ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: "", clinician_id: "", scheduled_at: "", meeting_link: "", reason: "" });

  const schedule = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await scheduleMut({ variables: { input: {
        patientId: form.patient_id, clinicianId: form.clinician_id || null,
        scheduledAt: new Date(form.scheduled_at).toISOString(), meetingLink: form.meeting_link || null, reason: form.reason || null,
      } } });
      toast.success("Consult scheduled"); setShow(false);
      setForm({ patient_id: "", clinician_id: "", scheduled_at: "", meeting_link: "", reason: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  return (
    <div>
      <Header title="Telemedicine" subtitle="Remote video consultations" />
      <div className="mb-4 flex justify-end">
        <Can module="telemedicine" action="create"><button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}><Plus size={16} /> Schedule</button></Can>
      </div>

      {loading ? <LoadingSpinner /> : consults.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No consultations scheduled.</div>
      ) : (
        <div className="space-y-3">
          {consults.map((c: { id: string; patientName: string; patientMrn: string; clinicianName?: string | null; scheduledAt: string; meetingLink?: string | null; status: string; reason?: string | null }) => (
            <div key={c.id} className="card flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Video size={16} className="mt-1 text-muted-foreground" />
                <div>
                  <div className="font-medium">{c.patientName} <span className="text-xs text-muted-foreground/70">({c.patientMrn})</span></div>
                  <div className="text-xs text-muted-foreground/70">{new Date(c.scheduledAt).toLocaleString()}{c.clinicianName ? ` · ${c.clinicianName}` : ""}</div>
                  {c.reason && <div className="text-xs text-muted-foreground mt-1">{c.reason}</div>}
                  {c.meetingLink && <a href={c.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Join link</a>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={c.status.replace("_", " ")} variant={statusVariant(c.status)} className="capitalize" />
                {c.status !== "completed" && c.status !== "cancelled" && (
                  <Can module="telemedicine" action="edit">
                    <select className="input-field text-xs py-1 w-28" value="" onChange={(e) => e.target.value && updateMut({ variables: { id: c.id, input: { status: e.target.value } } })}>
                      <option value="">Status…</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                    </select>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => cancelMut({ variables: { id: c.id } })}>Cancel</button>
                  </Can>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal title="Schedule Tele-consult" isOpen={show} onClose={() => setShow(false)}>
        <form onSubmit={schedule} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Patient</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(v) => setForm({ ...form, patient_id: v })}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Clinician</label>
              <SearchableSelect
                value={form.clinician_id}
                onChange={(v) => setForm({ ...form, clinician_id: v })}
                options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
                placeholder="— none —"
              /></div>
            <div><label className="block text-sm font-medium mb-1">When</label><input type="datetime-local" className="input-field" value={form.scheduled_at} required onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Meeting Link</label><input className="input-field" placeholder="https://…" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Reason</label><input className="input-field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Schedule"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShow(false)}>Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
}
