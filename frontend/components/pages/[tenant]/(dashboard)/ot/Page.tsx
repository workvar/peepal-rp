"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { useOt } from "./useOt";
import ScheduleModal from "./ScheduleModal";
import TheatresTab from "./TheatresTab";
import type { GqlTheatre, GqlSurgery, TheatreForm, SurgeryForm } from "./types";
import { surgeryStatusVariant } from "./types";

type Tab = "surgeries" | "theatres";

export default function OtPage() {
  const {
    theatres, surgeries, patients, clinicians, loading, refetchTheatres,
    createTheatreMut, updateTheatreMut, deleteTheatreMut, scheduleMut, setStatusMut, cancelMut,
  } = useOt();

  const [tab, setTab] = useState<Tab>("surgeries");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveTheatre = async (editing: GqlTheatre | null, form: TheatreForm) => {
    const base = { code: form.code.trim(), name: form.name.trim(), location: form.location || null };
    try {
      if (editing) { await updateTheatreMut({ variables: { id: editing.id, input: { ...base, active: form.active } } }); toast.success("Theatre updated"); }
      else { await createTheatreMut({ variables: { input: base } }); toast.success("Theatre added"); }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save theatre"); throw err; }
  };

  const deleteTheatre = (t: GqlTheatre) => setConfirmState({
    title: "Delete Theatre", message: `Remove “${t.name}”?`, variant: "danger", confirmLabel: "Delete",
    onConfirm: async () => {
      try { await deleteTheatreMut({ variables: { id: t.id } }); toast.success("Deleted"); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    },
  });

  const schedule = async (form: SurgeryForm) => {
    try {
      await scheduleMut({ variables: { input: {
        patientId: form.patient_id, theatreId: form.theatre_id, surgeonId: form.surgeon_id || null,
        procedureName: form.procedure_name, anesthesiaType: form.anesthesia_type || null,
        scheduledDate: form.scheduled_date, startTime: form.start_time, endTime: form.end_time, notes: form.notes || null,
      } } });
      toast.success("Surgery scheduled");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to schedule"); throw err; }
  };

  const setStatus = async (s: GqlSurgery, status: string) => {
    try { await setStatusMut({ variables: { id: s.id, status } }); toast.success("Status updated"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const cancel = (s: GqlSurgery) => setConfirmState({
    title: "Cancel Surgery", message: `Cancel ${s.procedureName} for ${s.patientName}?`, variant: "danger", confirmLabel: "Cancel Surgery",
    onConfirm: async () => {
      try { await cancelMut({ variables: { id: s.id } }); toast.success("Cancelled"); }
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
    <div>
      <Header title="OT Scheduling" subtitle="Book theatres for surgeries; no double-booking" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">{tabBtn("surgeries", "Surgeries")}{tabBtn("theatres", "Theatres")}</div>
        {tab === "surgeries" && (
          <Can module="ot" action="create">
            <button className="btn-primary flex items-center gap-2" onClick={() => setScheduleOpen(true)}>
              <Plus size={16} /> Schedule
            </button>
          </Can>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "theatres" ? (
        <TheatresTab theatres={theatres} onSave={saveTheatre} onDelete={deleteTheatre}
          onBulkFinished={() => { void refetchTheatres(); }} />
      ) : surgeries.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No surgeries scheduled.</div>
      ) : (
        <div className="space-y-3">
          {surgeries.map((s) => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{s.procedureName}</div>
                  <div className="text-sm">{s.patientName} <span className="text-xs text-muted-foreground/70">({s.patientMrn})</span></div>
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <CalendarClock size={13} /> {s.scheduledDate} · {s.startTime}–{s.endTime} · {s.theatreName}
                    {s.surgeonName ? ` · ${s.surgeonName}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={s.status.replace("_", " ")} variant={surgeryStatusVariant(s.status)} className="capitalize" />
                  {s.status !== "completed" && s.status !== "cancelled" && (
                    <Can module="ot" action="edit">
                      <select className="input-field text-xs py-1 w-32" value="" onChange={(e) => e.target.value && setStatus(s, e.target.value)}>
                        <option value="">Set status…</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => cancel(s)}>Cancel</button>
                    </Can>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleModal isOpen={scheduleOpen} theatres={theatres} patients={patients} clinicians={clinicians}
        onClose={() => setScheduleOpen(false)} onSubmit={schedule} />
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
