"use client";

import { useState } from "react";
import { useApolloClient } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { GRADE_ASSIGNMENT_SUBMISSION } from "@/graphql/mutations/campus";
import { LIST_ASSIGNMENT_SUBMISSIONS, LIST_STUDENT_ASSIGNMENTS } from "@/graphql/queries/campus";
import { useAssignments } from "./useAssignments";
import AssignmentsTable from "./AssignmentsTable";
import AssignmentModal from "./AssignmentModal";
import GradeModal from "./GradeModal";
import type { AssignmentForm, GqlAssignment, GqlSubmission } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function AssignmentsPage() {
  const client = useApolloClient();
  const [filters, setFilters] = useState({ courseId: "", status: "" });
  const { assignments, courses, loading, createMut, updateMut, publishMut, closeMut, deleteMut } =
    useAssignments(filters);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlAssignment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grading, setGrading] = useState<GqlSubmission | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const save = async (current: GqlAssignment | null, form: AssignmentForm) => {
    const input = {
      title: form.title,
      description: form.description || null,
      courseId: form.course_id || null,
      semester: form.semester ? Number(form.semester) : null,
      section: form.section || null,
      subjectId: form.subject_id || null,
      maxMarks: form.max_marks ? Number(form.max_marks) : null,
      dueDate: form.due_date || null,
      attachmentUrl: form.attachment_url || null,
    };
    try {
      if (current) {
        await updateMut({ variables: { id: current.id, input } });
        toast.success("Assignment updated");
      } else {
        await createMut({ variables: { input } });
        toast.success("Draft created");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save assignment");
      throw err;
    }
  };

  const publish = async (a: GqlAssignment) => {
    try {
      await publishMut({ variables: { id: a.id } });
      toast.success("Published to students");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    }
  };

  const close = (a: GqlAssignment) =>
    setConfirmState({
      title: "Close Assignment",
      message: `Students will no longer be able to submit "${a.title}". Existing submissions stay and can still be graded.`,
      confirmLabel: "Close",
      onConfirm: async () => {
        await closeMut({ variables: { id: a.id } });
        toast.success("Assignment closed");
      },
    });

  const remove = (a: GqlAssignment) =>
    setConfirmState({
      title: "Delete Assignment",
      message: `"${a.title}" and all ${a.submissionCount} submission(s) will be permanently removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: a.id } });
        toast.success("Deleted");
      },
    });

  const grade = async (submission: GqlSubmission, marks: number, feedback: string) => {
    try {
      await client.mutate({
        mutation: GRADE_ASSIGNMENT_SUBMISSION,
        variables: { id: submission.id, marksAwarded: marks, feedback: feedback || null },
        refetchQueries: [
          { query: LIST_ASSIGNMENT_SUBMISSIONS, variables: { assignmentId: submission.assignmentId } },
          {
            query: LIST_STUDENT_ASSIGNMENTS,
            variables: { courseId: filters.courseId || null, status: filters.status || null },
          },
        ],
      });
      toast.success("Grade saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save grade");
      throw err;
    }
  };

  return (
    <div>
      <Header
        title="Assignments"
        subtitle="Set coursework, track submissions and grade"
        action={
          <Can module="assignments" action="create">
            <button className="btn-primary flex items-center gap-2"
              onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus size={16} /> New Assignment
            </button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <SearchableSelect
            value={filters.courseId}
            onChange={(v) => setFilters((f) => ({ ...f, courseId: v }))}
            options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            placeholder="All courses"
          />
        </div>
        <select className="input-field w-40" value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <AssignmentsTable
          assignments={assignments}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
          onEdit={(a) => { setEditing(a); setShowModal(true); }}
          onPublish={publish}
          onClose={close}
          onDelete={remove}
          onGrade={setGrading}
        />
      )}

      <AssignmentModal
        isOpen={showModal}
        editing={editing}
        courses={courses}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={save}
      />

      <GradeModal submission={grading} onClose={() => setGrading(null)} onGrade={grade} />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
