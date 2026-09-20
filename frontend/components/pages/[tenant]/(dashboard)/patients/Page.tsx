"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { CREATE_PATIENT_LOGIN } from "@/graphql/mutations/extended";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { usePatients } from "./usePatients";
import PatientTable from "./PatientTable";
import PatientModal from "./PatientModal";
import type { GqlPatient, PatientForm } from "./types";
import { patientName } from "./types";

export default function PatientsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "teacher" || user?.role === "staff";

  const { patients, loading, refetch, createMut, updateMut, deleteMut } = usePatients();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlPatient | null>(null);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [loginFor, setLoginFor] = useState<GqlPatient | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [createLoginMut] = useMutation(CREATE_PATIENT_LOGIN);

  const openLogin = (p: GqlPatient) => { setLoginEmail(p.email ?? ""); setLoginPassword(""); setLoginFor(p); };
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFor) return;
    setCreatingLogin(true);
    try {
      await createLoginMut({ variables: { patientId: loginFor.id, email: loginEmail.trim(), password: loginPassword || null } });
      toast.success("Portal login created");
      setLoginFor(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create login");
    } finally {
      setCreatingLogin(false);
    }
  };

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (p: GqlPatient) => { setEditing(p); setShowModal(true); };

  const handleSave = async (form: PatientForm) => {
    const base = {
      firstName: form.first_name.trim(),
      lastName: form.last_name.trim() || null,
      gender: form.gender || null,
      dateOfBirth: form.date_of_birth || null,
      bloodGroup: form.blood_group || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      emergencyName: form.emergency_name || null,
      emergencyPhone: form.emergency_phone || null,
      allergies: form.allergies || null,
      chronicConditions: form.chronic_conditions || null,
    };
    try {
      if (editing) {
        await updateMut({
          variables: { id: editing.id, input: { ...base, mrn: form.mrn.trim() || null, status: form.status } },
        });
        toast.success("Patient updated");
      } else {
        await createMut({ variables: { input: { ...base, mrn: form.mrn.trim() || null } } });
        toast.success("Patient registered");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save patient");
    }
  };

  const handleDelete = (p: GqlPatient) => {
    setConfirmState({
      title: "Delete Patient",
      message: `${patientName(p)} (${p.mrn}) and all their appointments and visit records will be removed. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: p.id } });
        toast.success("Deleted");
      },
    });
  };

  const q = search.toLowerCase();
  const filtered = q
    ? patients.filter((p) =>
        [patientName(p), p.mrn, p.phone].some((v) => String(v ?? "").toLowerCase().includes(q)),
      )
    : patients;

  return (
    <div>
      <Header
        title="Patients"
        subtitle="Patient registry — demographics, contacts, and clinical flags"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Can module="patients" action="create">
                <BulkUploadButton
                  resource="patients"
                  onFinished={(st) => { if (st.successful > 0) refetch(); }}
                />
              </Can>
              <Can module="patients" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                  <Plus size={16} /> Register Patient
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search name, MRN, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <PatientTable patients={filtered} canWrite={canWrite} onEdit={openEdit} onDelete={handleDelete}
          onCreateLogin={isAdmin ? openLogin : undefined} />
      )}

      <Modal title={loginFor ? `Portal Login — ${patientName(loginFor)}` : "Portal Login"} isOpen={!!loginFor} onClose={() => setLoginFor(null)}>
        {loginFor && (
          <form onSubmit={submitLogin} className="space-y-4">
            <p className="text-sm text-muted-foreground">Creates a patient account so they can sign in and view their own care.</p>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
              <input type="email" className="input-field" value={loginEmail} required onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Password (optional — leave blank to email an invite)</label>
              <input type="text" className="input-field" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={creatingLogin}>{creatingLogin ? "Creating…" : "Create Login"}</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setLoginFor(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      <PatientModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
