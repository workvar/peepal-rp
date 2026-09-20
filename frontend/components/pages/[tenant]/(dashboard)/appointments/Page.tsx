"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAppointments } from "./useAppointments";
import AppointmentTable from "./AppointmentTable";
import AppointmentModal from "./AppointmentModal";
import AppointmentCalendar from "./AppointmentCalendar";
import ViewToggle, { type AppointmentView } from "./ViewToggle";
import { appointmentPerms } from "./permissions";
import type { GqlAppointment, AppointmentForm } from "./types";

const STATUS_FILTERS = ["", "scheduled", "completed", "cancelled", "no_show"];

export default function AppointmentsPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const user = useAppSelector((s) => s.auth.user);
  const perms = appointmentPerms(user?.role);

  const {
    appointments, patients, clinicians, departments,
    loading, createMut, updateMut, deleteMut,
  } = useAppointments();

  const [view, setView] = useState<AppointmentView>("list");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlAppointment | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (a: GqlAppointment) => { setEditing(a); setShowModal(true); };

  const handleSave = async (form: AppointmentForm) => {
    const input = {
      patientId: form.patient_id,
      clinicianId: form.clinician_id,
      departmentId: form.department_id || null,
      date: form.date,
      startTime: form.start_time,
      endTime: form.end_time || null,
      reason: form.reason || null,
      referredBy: form.referred_by || null,
    };
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        toast.success("Appointment updated");
      } else {
        await createMut({ variables: { input } });
        toast.success("Appointment booked");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save appointment");
    }
  };

  const handleStatus = async (a: GqlAppointment, status: string) => {
    try {
      await updateMut({ variables: { id: a.id, input: { status } } });
      toast.success(`Marked ${status.replace("_", " ")}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // The slip opens in its own tab with ?auto=1 so the browser print dialog
  // comes up straight away — one click from booking to a printed slip.
  const handlePrint = (a: GqlAppointment) => {
    window.open(`/${tenant}/appointments/${a.id}/print?auto=1`, "_blank", "noopener");
  };

  const handleDelete = (a: GqlAppointment) => {
    setConfirmState({
      title: "Delete Appointment",
      message: `The ${a.date} ${a.startTime} appointment for ${a.patientName} will be removed. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: a.id } });
        toast.success("Deleted");
      },
    });
  };

  const filtered = appointments.filter(
    (a) => (!dateFilter || a.date === dateFilter) && (!statusFilter || a.status === statusFilter),
  );

  return (
    <div>
      <Header
        title="Appointments"
        subtitle="Consultation bookings per clinician — book, reschedule, and track outcomes"
        action={
          <div className="flex gap-2">
            {user?.role === "admin" && (
              <Link
                href={`/${tenant}/appointments/slip-settings`}
                className="btn-secondary flex items-center gap-2"
              >
                <Settings2 size={16} /> OPD Slip Designer
              </Link>
            )}
            {perms.canModify && (
              <Can module="appointments" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                  <Plus size={16} /> Book Appointment
                </button>
              </Can>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ViewToggle view={view} onChange={setView} />
        {view === "list" && (
          <>
            <input
              type="date"
              className="input-field w-auto"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <select
              className="input-field w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : view === "calendar" ? (
        <AppointmentCalendar
          appointments={appointments}
          showClinician={perms.seesAllClinicians}
        />
      ) : (
        <AppointmentTable
          appointments={filtered}
          perms={perms}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatus={handleStatus}
          onPrint={handlePrint}
        />
      )}

      <AppointmentModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        editing={editing}
        patients={patients}
        clinicians={clinicians}
        departments={departments}
        onSave={handleSave}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
