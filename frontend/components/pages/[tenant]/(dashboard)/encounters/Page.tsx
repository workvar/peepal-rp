"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useEncounters } from "./useEncounters";
import EncounterTable from "./EncounterTable";
import EncounterModal from "./EncounterModal";
import type { GqlEncounter, EncounterForm } from "./types";
import { serializeVitals } from "./types";

export default function EncountersPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "teacher" || user?.role === "staff";

  const { encounters, patients, clinicians, loading, createMut, updateMut, deleteMut } =
    useEncounters();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlEncounter | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (e: GqlEncounter) => { setEditing(e); setShowModal(true); };

  const handleSave = async (form: EncounterForm) => {
    const shared = {
      clinicianId: form.clinician_id,
      visitDate: form.visit_date,
      chiefComplaint: form.chief_complaint || null,
      diagnosis: form.diagnosis || null,
      vitals: serializeVitals(form.vitals),
      prescription: form.prescription || null,
      notes: form.notes || null,
      followUpDate: form.follow_up_date || null,
    };
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input: { ...shared, status: form.status } } });
        toast.success("Visit updated");
      } else {
        await createMut({ variables: { input: { ...shared, patientId: form.patient_id } } });
        toast.success("Visit recorded");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save visit");
    }
  };

  const handleDelete = (e: GqlEncounter) => {
    setConfirmState({
      title: "Delete Visit",
      message: `The ${e.visitDate} visit for ${e.patientName} will be permanently removed from their medical history. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: e.id } });
        toast.success("Deleted");
      },
    });
  };

  const q = search.toLowerCase();
  const filtered = encounters.filter(
    (e) =>
      (!statusFilter || e.status === statusFilter) &&
      (!q ||
        [e.patientName, e.patientMrn, e.clinicianName, e.chiefComplaint, e.diagnosis].some((v) =>
          String(v ?? "").toLowerCase().includes(q),
        )),
  );

  return (
    <div>
      <Header
        title="OPD Visits"
        subtitle="Clinical visit records — complaints, vitals, diagnoses, and prescriptions"
        action={
          canWrite ? (
            <Can module="encounters" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                <Plus size={16} /> Record Visit
              </button>
            </Can>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input-field flex-1 min-w-48"
          placeholder="Search patient, MRN, clinician, diagnosis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <EncounterTable
          encounters={filtered}
          canWrite={canWrite}
          isAdmin={isAdmin}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <EncounterModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        editing={editing}
        patients={patients}
        clinicians={clinicians}
        onSave={handleSave}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
