"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useDutyRoster } from "./useDutyRoster";
import RosterTable from "./RosterTable";
import RosterModal from "./RosterModal";
import type { GqlDutyShift, RosterForm } from "./types";

// Default window: the current week (Mon–Sun), the common roster-planning unit.
function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

export default function DutyRosterPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "staff";

  const [{ from, to }, setRange] = useState(weekRange());
  const { shifts, employees, loading, createMut, updateMut, deleteMut } = useDutyRoster(from, to);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlDutyShift | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (s: GqlDutyShift) => { setEditing(s); setShowModal(true); };

  const save = async (current: GqlDutyShift | null, form: RosterForm) => {
    const shared = {
      date: form.date,
      shiftName: form.shift_name || null,
      startTime: form.start_time,
      endTime: form.end_time,
      location: form.location || null,
      notes: form.notes || null,
    };
    try {
      if (current) {
        await updateMut({ variables: { id: current.id, input: shared } });
        toast.success("Shift updated");
      } else {
        await createMut({ variables: { input: { ...shared, employeeId: form.employee_id } } });
        toast.success("Shift added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save shift");
      throw err;
    }
  };

  const handleDelete = (s: GqlDutyShift) => {
    setConfirmState({
      title: "Delete Shift",
      message: `${s.employeeName}'s ${s.date} ${s.startTime}–${s.endTime} shift will be removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: s.id } });
        toast.success("Deleted");
      },
    });
  };

  return (
    <div>
      <Header
        title="Duty Roster"
        subtitle={isAdmin ? "Shift schedule for every employee" : "Your shift schedule"}
        action={
          <Can module="duty-roster" action="create">
            <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
              <Plus size={16} /> Add Shift
            </button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-muted-foreground/70 block mb-1">From</label>
          <input type="date" className="input-field" value={from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground/70 block mb-1">To</label>
          <input type="date" className="input-field" value={to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
        <button type="button" className="btn-secondary self-end" onClick={() => setRange(weekRange())}>
          This Week
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <RosterTable shifts={shifts} canWrite={canWrite} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <RosterModal
        isOpen={showModal}
        editing={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={save}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
