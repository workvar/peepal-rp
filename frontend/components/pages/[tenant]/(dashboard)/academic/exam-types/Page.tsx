"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useExamTypes } from "./useExamTypes";
import ExamTypeTable from "./ExamTypeTable";
import ExamTypeModal from "./ExamTypeModal";
import BulkExamTypeModal from "./BulkExamTypeModal";
import type { GqlExamType, ExamTypeForm } from "./types";

export default function ExamTypesPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canWrite = isAdmin || user?.role === "teacher";

  const { examTypes, departments, loading, refetch, createMut, updateMut, deleteMut } = useExamTypes();

  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState<GqlExamType | null>(null);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (e: GqlExamType) => { setEditing(e); setShowModal(true); };

  const handleSave = async (form: ExamTypeForm) => {
    const input = {
      name: form.name.trim(),
      departmentId: form.department_id || null, // null = org-wide
      maxMarks: parseFloat(form.max_marks) || 100,
      weightage: form.weightage ? parseFloat(form.weightage) : null,
      active: form.active,
    };
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        toast.success("Exam updated");
      } else {
        await createMut({ variables: { input } });
        toast.success("Exam created");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save exam");
    }
  };

  const handleDelete = (e: GqlExamType) => {
    setConfirmState({
      title: "Delete Exam",
      message: `“${e.name}” will be removed from the dropdown. Marks already recorded keep their saved assessment type. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: e.id } });
        toast.success("Deleted");
      },
    });
  };

  const filtered = search
    ? examTypes.filter((e) =>
        [e.name, e.department?.name].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : examTypes;

  return (
    <div>
      <Header
        title="Exams"
        subtitle="Set up assessment types per department — these populate the dropdown when entering marks"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Can module="exam-types" action="create">
                <button className="btn-secondary flex items-center gap-2" onClick={() => setShowBulk(true)}>
                  <Upload size={16} /> Bulk Upload
                </button>
              </Can>
              <Can module="exam-types" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                  <Plus size={16} /> Add Exam
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search exam name, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ExamTypeTable examTypes={filtered} canWrite={canWrite} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <ExamTypeModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        editing={editing}
        departments={departments}
        onSave={handleSave}
      />

      <BulkExamTypeModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        departments={departments}
        onFinished={() => refetch()}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
