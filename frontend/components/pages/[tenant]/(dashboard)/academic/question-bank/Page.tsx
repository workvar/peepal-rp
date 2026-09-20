"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useQuestionBank } from "./useQuestionBank";
import ScopePicker from "./ScopePicker";
import QuestionTable from "./QuestionTable";
import QuestionModal from "./QuestionModal";
import type { GqlQuestion, QuestionForm } from "./types";

export default function QuestionBankPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canWrite =
    user?.role === "admin" || user?.role === "super_admin" || user?.role === "teacher";

  const {
    courses,
    curriculumSubjects,
    questions,
    units,
    loading,
    refetch,
    scope,
    setScope,
    createMut,
    updateMut,
    deleteMut,
  } = useQuestionBank();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlQuestion | null>(null);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (q: GqlQuestion) => {
    setEditing(q);
    setShowModal(true);
  };

  const handleSave = async (form: QuestionForm) => {
    // The textarea holds one option per line; the API wants an array.
    const options = form.options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    const input = {
      unit: form.unit.trim() || null,
      questionText: form.question_text.trim(),
      questionType: form.question_type,
      difficulty: form.difficulty,
      marks: parseFloat(form.marks) || 1,
      options: form.question_type === "mcq" ? options : [],
      answer: form.answer.trim() || null,
      courseOutcome: form.course_outcome.trim() || null,
      active: form.active,
    };

    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        toast.success("Question updated");
      } else {
        await createMut({
          variables: { input: { ...input, curriculumSubjectId: scope.curriculumSubjectId } },
        });
        toast.success("Question added");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save the question");
    }
  };

  const handleDelete = (q: GqlQuestion) => {
    setConfirmState({
      title: "Delete Question",
      message:
        "This removes the question from the bank. Papers already generated keep their copy, so printed papers are unaffected. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: q.id } });
        toast.success("Deleted");
      },
    });
  };

  const filtered = search
    ? questions.filter((q) =>
        [q.questionText, q.unit, q.courseOutcome].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : questions;

  return (
    <div>
      <Header
        title="Question Bank"
        subtitle="Author reusable questions per subject — the paper generator draws from this pool"
        action={
          canWrite && scope.curriculumSubjectId ? (
            <div className="flex gap-2">
              <Can module="question-bank" action="create">
                <BulkUploadButton resource="question_bank" onFinished={() => refetch()} />
              </Can>
              <Can module="question-bank" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
                  <Plus size={16} /> Add Question
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <ScopePicker
        courses={courses}
        curriculumSubjects={curriculumSubjects}
        units={units}
        scope={scope}
        setScope={setScope}
      />

      {!scope.curriculumSubjectId ? (
        <div className="card py-12 text-center text-muted-foreground/70">
          Pick a course and subject to see its question bank.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <input
              className="input-field w-full"
              placeholder="Search question text, unit, course outcome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <QuestionTable
              questions={filtered}
              canWrite={canWrite}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <QuestionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        editing={editing}
        units={units}
        onSave={handleSave}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
