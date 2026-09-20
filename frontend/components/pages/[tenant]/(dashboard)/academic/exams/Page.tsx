"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_EXAM_SCHEDULES, LIST_ACADEMIC_YEARS, LIST_EXAM_TYPES } from "@/graphql/queries/academic";
import {
  CREATE_EXAM_SCHEDULE,
  UPDATE_EXAM_SCHEDULE,
  PUBLISH_EXAM_SCHEDULE,
  DELETE_EXAM_SCHEDULE,
} from "@/graphql/mutations/academic";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Plus, Upload, Eye, EyeOff, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import BulkExamScheduleModal from "./BulkExamScheduleModal";

type GqlExamType = {
  id: string;
  name: string;
};

type GqlExamSchedule = {
  id: string;
  name: string;
  examType: string;
  semesterNumber?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  published: boolean;
  instructions?: string | null;
  academicYearId?: string | null;
};
type GqlAcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

const makeEmptyForm = (defaultType = "") => ({
  name: "", exam_type: defaultType, academic_year_id: "",
  semester_number: "1", start_date: "", end_date: "", instructions: "",
});

const BADGE_VARIANTS: ("blue" | "green" | "yellow" | "gray")[] = ["blue", "green", "yellow", "gray"];
function examTypeBadgeVariant(index: number): "blue" | "green" | "yellow" | "gray" {
  return BADGE_VARIANTS[index % BADGE_VARIANTS.length];
}

export default function ExamSchedulesPage() {
  const user = useAppSelector((s) => s.auth.user);

  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const { data: examsData, loading, refetch } = useQuery(LIST_EXAM_SCHEDULES);
  const { data: academicYearsData } = useQuery(LIST_ACADEMIC_YEARS);
  const { data: examTypesData } = useQuery(LIST_EXAM_TYPES, {
    variables: { includeInactive: false },
  });

  const [createExamMut] = useMutation(CREATE_EXAM_SCHEDULE, {
    refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
  });
  const [updateExamMut] = useMutation(UPDATE_EXAM_SCHEDULE, {
    refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
  });
  const [publishExamMut] = useMutation(PUBLISH_EXAM_SCHEDULE, {
    refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
  });
  const [deleteExamMut] = useMutation(DELETE_EXAM_SCHEDULE, {
    refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
  });

  const examSchedules: GqlExamSchedule[] = examsData?.examSchedules ?? [];
  const academicYears: GqlAcademicYear[] = academicYearsData?.academicYears ?? [];
  const examTypes: GqlExamType[] = examTypesData?.examTypes ?? [];

  const isAdmin = user?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentYear = academicYears.find((y) => y.isCurrent);
    const input = {
      name: form.name,
      examType: form.exam_type,
      academicYearId: form.academic_year_id || currentYear?.id || undefined,
      semesterNumber: parseInt(form.semester_number),
      startDate: form.start_date || undefined,
      endDate: form.end_date || undefined,
      instructions: form.instructions || undefined,
    };
    try {
      await createExamMut({ variables: { input } });
      toast.success("Exam schedule created");
      setShowModal(false);
      setForm(makeEmptyForm(examTypes[0]?.name ?? ""));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handlePublish = async (id: string, published: boolean) => {
    await publishExamMut({ variables: { id, published: !published } });
    toast.success(published ? "Unpublished" : "Published to students");
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete Exam Schedule",
      message: "This exam schedule will be permanently removed. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteExamMut({ variables: { id } });
        toast.success("Deleted");
      },
    });
  };

  const filtered = search
    ? examSchedules.filter(e => [e.name, e.examType].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : examSchedules;

  // updateExamMut is available for future edit functionality
  void updateExamMut;

  return (
    <div>
      <Header
        title="Exam Schedules"
        subtitle="Manage internal and semester examinations"
        action={
          isAdmin ? (
            <div className="flex gap-2">
              <Can module="exams" action="create">
                <Button variant="outline" onClick={() => setShowBulk(true)}>
                  <Upload size={16} /> Bulk Upload
                </Button>
              </Can>
              <Can module="exams" action="create">
                <Button onClick={() => { setForm(makeEmptyForm(examTypes[0]?.name ?? "")); setShowModal(true); }}>
                  <Plus size={16} /> Add Exam
                </Button>
              </Can>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search exam name, type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-12 text-muted-foreground/70">No exam schedules found.</div>
          )}
          {filtered.map((exam) => (
            <div key={exam.id} className="card flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ClipboardList size={20} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{exam.name}</p>
                    <Badge label={exam.examType} variant={examTypeBadgeVariant(examTypes.findIndex(t => t.name === exam.examType))} />
                    {exam.published && <Badge label="Published" variant="green" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Semester {exam.semesterNumber} &nbsp;·&nbsp;
                    {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : "—"}
                    {exam.endDate ? ` – ${new Date(exam.endDate).toLocaleDateString()}` : ""}
                  </p>
                  {exam.instructions && <p className="text-xs text-muted-foreground/70 mt-1">{exam.instructions}</p>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <Can module="exams" action="edit">
                    <button
                      onClick={() => handlePublish(exam.id, exam.published)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        exam.published
                          ? "bg-muted/60 text-muted-foreground hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {exam.published ? <EyeOff size={13} /> : <Eye size={13} />}
                      {exam.published ? "Unpublish" : "Publish"}
                    </button>
                  </Can>
                  <Can module="exams" action="delete">
                    <button onClick={() => handleDelete(exam.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal title="Create Exam Schedule" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input className="input-field" placeholder="e.g. Mid-Semester Exam 2024" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Exam Type</label>
              {examTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No exam types defined. Add them in <strong>Exam Types</strong> first.
                </p>
              ) : (
                <SearchableSelect
                  value={form.exam_type}
                  onChange={(v) => setForm({ ...form, exam_type: v })}
                  options={examTypes.map((t) => ({ value: t.name, label: t.name }))}
                  placeholder="— Select —"
                  required
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Semester</label>
              <select className="input-field" value={form.semester_number} onChange={(e) => setForm({ ...form, semester_number: e.target.value })}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Academic Year</label>
            <SearchableSelect
              value={form.academic_year_id}
              onChange={(v) => setForm({ ...form, academic_year_id: v })}
              options={academicYears.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? " (current)" : ""}` }))}
              placeholder="— Select —"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Start Date</label>
              <input type="date" className="input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">End Date</label>
              <input type="date" className="input-field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Instructions</label>
            <textarea className="input-field" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Create</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <BulkExamScheduleModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        academicYears={academicYears}
        examTypes={examTypes}
        onFinished={() => refetch()}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
