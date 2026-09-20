"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type {
  GqlAppointment,
  AppointmentForm,
  PickerPatient,
  PickerClinician,
  PickerDepartment,
} from "./types";
import { emptyAppointmentForm } from "./types";

export default function AppointmentModal({
  isOpen,
  onClose,
  editing,
  patients,
  clinicians,
  departments,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlAppointment | null;
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  departments: PickerDepartment[];
  onSave: (form: AppointmentForm) => Promise<void>;
}) {
  const [form, setForm] = useState<AppointmentForm>(emptyAppointmentForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            patient_id: editing.patientId,
            clinician_id: editing.clinicianId,
            department_id: editing.departmentId ?? "",
            date: editing.date,
            start_time: editing.startTime,
            end_time: editing.endTime ?? "",
            reason: editing.reason ?? "",
            referred_by: editing.referredBy ?? "",
          }
        : emptyAppointmentForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<AppointmentForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Appointment" : "Book Appointment"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
          <SearchableSelect
            required
            value={form.patient_id}
            onChange={(v) => set({ patient_id: v })}
            placeholder="Select patient…"
            searchPlaceholder="Search patients…"
            options={patients.map((p) => ({
              value: p.id,
              label: [p.firstName, p.lastName].filter(Boolean).join(" "),
              sublabel: p.mrn,
            }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Clinician</label>
          <SearchableSelect
            required
            value={form.clinician_id}
            onChange={(v) => set({ clinician_id: v })}
            placeholder="Select clinician…"
            searchPlaceholder="Search clinicians…"
            options={clinicians.map((c) => ({
              value: c.id,
              label: c.user?.name ?? "Unknown",
              sublabel: c.designation ?? undefined,
            }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Department <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <SearchableSelect
            value={form.department_id}
            onChange={(v) => set({ department_id: v })}
            placeholder="—"
            searchPlaceholder="Search departments…"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>

        <AvailabilityHint clinicianId={form.clinician_id} date={form.date} />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" value={form.date} required
              onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Start</label>
            <input type="time" className="input-field" value={form.start_time} required
              onChange={(e) => set({ start_time: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">End</label>
            <input type="time" className="input-field" value={form.end_time}
              onChange={(e) => set({ end_time: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Reason</label>
          <input className="input-field" placeholder="e.g. Fever, follow-up, consultation"
            value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Referred by <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input className="input-field" placeholder="e.g. Dr. R. Sharma, health camp, SELF"
            value={form.referred_by} onChange={(e) => set({ referred_by: e.target.value })} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Book"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Shows the selected clinician's consulting windows for the chosen date's
// weekday, so the booking clerk picks a valid time first try. Clinicians
// without any schedule are freely bookable — no hint shown.
import { useQuery } from "@apollo/client";
import { LIST_CLINICIAN_SCHEDULES } from "@/graphql/queries/clinical";

type HintSchedule = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };

function AvailabilityHint({ clinicianId, date }: { clinicianId: string; date: string }) {
  const { data } = useQuery(LIST_CLINICIAN_SCHEDULES, {
    variables: { clinicianId },
    skip: !clinicianId,
  });
  if (!clinicianId || !data) return null;

  const all: HintSchedule[] = (data.clinicianSchedules ?? []).filter((s: HintSchedule) => s.active);
  if (all.length === 0) return null;

  const weekday = date ? new Date(date + "T00:00:00").getDay() : null;
  const todays = weekday === null ? [] : all.filter((s) => s.dayOfWeek === weekday);

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {weekday === null ? (
        "Pick a date to see this clinician's consulting hours."
      ) : todays.length === 0 ? (
        <span className="text-amber-600">No consulting hours on the selected day — booking will be rejected.</span>
      ) : (
        <>Consulting hours: {todays.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}</>
      )}
    </div>
  );
}
