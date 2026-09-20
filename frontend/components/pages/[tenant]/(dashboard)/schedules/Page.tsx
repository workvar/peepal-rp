"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchableSelect from "@/components/ui/SearchableSelect";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useSchedules } from "./useSchedules";
import ScheduleTable from "./ScheduleTable";
import ScheduleModal from "./ScheduleModal";
import { clinicianOptions, clinicianBulkOptions, DAY_BULK_OPTIONS } from "./clinicianOptions";
import type { GqlClinicianSchedule, ScheduleForm } from "./types";
import { emptyScheduleForm, DAY_NAMES } from "./types";

export default function SchedulesPage() {
  const { schedules, clinicians, loading, refetch, createMut, updateMut, deleteMut } = useSchedules();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlClinicianSchedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [saving, setSaving] = useState(false);
  const [clinicianFilter, setClinicianFilter] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const clinicianOpts = useMemo(() => clinicianOptions(clinicians), [clinicians]);

  useEffect(() => {
    if (!showModal) return;
    setForm(
      editing
        ? {
            clinician_id: editing.clinicianId,
            day_of_week: String(editing.dayOfWeek),
            start_time: editing.startTime,
            end_time: editing.endTime,
            slot_minutes: String(editing.slotMinutes),
            active: editing.active,
          }
        : emptyScheduleForm,
    );
  }, [showModal, editing]);

  const set = (patch: Partial<ScheduleForm>) => setForm((f) => ({ ...f, ...patch }));
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const shared = {
      dayOfWeek: parseInt(form.day_of_week, 10),
      startTime: form.start_time,
      endTime: form.end_time,
      slotMinutes: parseInt(form.slot_minutes, 10) || 15,
    };
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input: { ...shared, active: form.active } } });
        toast.success("Schedule updated");
      } else {
        await createMut({ variables: { input: { ...shared, clinicianId: form.clinician_id } } });
        toast.success("Schedule added");
      }
      closeModal();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s: GqlClinicianSchedule) => {
    setConfirmState({
      title: "Delete Schedule",
      message: `${s.clinicianName}'s ${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime} window will be removed. Existing appointments are unaffected.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: s.id } });
        toast.success("Deleted");
      },
    });
  };

  const filtered = clinicianFilter
    ? schedules.filter((s) => s.clinicianId === clinicianFilter)
    : schedules;

  return (
    <div>
      <Header
        title="Clinician Schedules"
        subtitle="Weekly consulting hours — bookings are validated against these windows"
        action={
          <Can module="schedules" action="create">
            <div className="flex items-center gap-2">
              <BulkUploadButton
                resource="clinician_schedules"
                label="Bulk Upload"
                dynamicOptions={{
                  clinician: { options: clinicianBulkOptions(clinicians), searchable: true, strict: true },
                  day_of_week: DAY_BULK_OPTIONS,
                }}
                onFinished={(st) => { if (st.successful > 0) refetch(); }}
              />
              <button className="btn-primary flex items-center gap-2"
                onClick={() => { setEditing(null); setShowModal(true); }}>
                <Plus size={16} /> Add Window
              </button>
            </div>
          </Can>
        }
      />

      <div className="mb-4 w-64">
        <SearchableSelect
          options={clinicianOpts}
          value={clinicianFilter}
          onChange={setClinicianFilter}
          placeholder="All clinicians"
          searchPlaceholder="Search clinicians…"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No consulting windows yet. Clinicians without a schedule can be booked at any time.
        </div>
      ) : (
        <ScheduleTable
          rows={filtered}
          onEdit={(s) => { setEditing(s); setShowModal(true); }}
          onDelete={handleDelete}
        />
      )}

      <ScheduleModal
        open={showModal}
        editing={!!editing}
        form={form}
        saving={saving}
        clinicianOpts={clinicianOpts}
        onChange={set}
        onSubmit={submit}
        onClose={closeModal}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
