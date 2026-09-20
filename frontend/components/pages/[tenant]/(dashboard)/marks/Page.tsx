"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_MARKS, MARKS_COUNT } from "@/graphql/queries/marks";
import { CREATE_MARK, UPDATE_MARK, DELETE_MARKS } from "@/graphql/mutations/marks";
import BulkDeleteModal from "./BulkDeleteModal";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { LIST_SUBJECTS, LIST_EXAM_TYPES } from "@/graphql/queries/academic";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Badge } from "@/components/ui/badge";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import Can from "@/components/access/Can";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";

type GqlMark = {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  semester: number;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
  enteredBy?: string | null;
  subjectId?: string | null;
  assessmentType?: string | null;
  status?: string | null;
  isPublished: boolean;
  student?: {
    id: string;
    rollNumber: string;
    user?: { id: string; name: string } | null;
  } | null;
};

type GqlSubject = {
  id: string;
  name: string;
  code: string;
  departmentId?: string | null;
};

type GqlExamType = {
  id: string;
  name: string;
  departmentId?: string | null;
  maxMarks: number;
};

const gradeVariant: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
  O: "green", "A+": "green", A: "blue", "B+": "blue", B: "yellow", C: "yellow", F: "red", "N/A": "gray",
};

// Fallback used only when an org hasn't configured exams for the subject's
// department yet, so the form never ships an empty dropdown.
const DEFAULT_ASSESSMENT_TYPES = ["internal", "mid_sem", "end_sem", "assignment"];

const emptyForm = {
  student_id: "", subject_id: "", subject: "",
  assessment_type: "internal", semester: "1",
  marks_obtained: "", max_marks: "100",
};

export default function MarksPage() {
  const user = useAppSelector((s) => s.auth.user);

  const [showModal, setShowModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMark, setEditingMark] = useState<GqlMark | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterExamType, setFilterExamType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filters = useMemo(() => ({
    studentId: filterStudentId || undefined,
    subjectId: filterSubjectId || undefined,
    examType: filterExamType || undefined,
    status: filterStatus || undefined,
  }), [filterStudentId, filterSubjectId, filterExamType, filterStatus]);

  const PAGE_SIZE = 50;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  // Tracks whether we've set offset/hasMore from the initial page load.
  // onCompleted fires again after every fetchMore (with the merged count), so
  // we use a ref instead and initialize only once per query lifecycle.
  const hasInitialized = useRef(false);

  const canCreate = user?.role === "admin" || user?.role === "teacher";

  const { data: marksData, loading, refetch: refetchMarks, fetchMore } = useQuery(LIST_MARKS, {
    variables: { ...filters, limit: PAGE_SIZE, offset: 0 },
    notifyOnNetworkStatusChange: true,
  });

  const { data: countData } = useQuery(MARKS_COUNT, {
    variables: {
      studentId: filters.studentId,
      subjectId: filters.subjectId,
      examType: filters.examType,
      status: filters.status,
    },
  });
  const totalCount: number = countData?.marksCount ?? 0;

  // Initialize pagination state after the first page loads.
  useEffect(() => {
    if (loading || hasInitialized.current) return;
    const count = marksData?.marks?.length ?? 0;
    hasInitialized.current = true;
    setHasMore(count === PAGE_SIZE);
    setOffset(count);
  }, [loading, marksData]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { ...filters, limit: PAGE_SIZE, offset },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return { marks: [...(prev.marks ?? []), ...(fetchMoreResult.marks ?? [])] };
        },
      });
      // result.data contains only the new page (not the merged list).
      const newCount = result.data?.marks?.length ?? 0;
      setHasMore(newCount === PAGE_SIZE);
      setOffset((o) => o + newCount);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchMore, filters, offset]);

  // IntersectionObserver watches the sentinel row at the bottom of the table.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const { data: studentsData } = useQuery(LIST_STUDENTS);
  const { data: subjectsData } = useQuery(LIST_SUBJECTS);
  const { data: examTypesData } = useQuery(LIST_EXAM_TYPES, {
    variables: { includeInactive: false },
    skip: !canCreate,
  });

  const resetAndRefetch = useCallback(() => {
    hasInitialized.current = false;
    setOffset(0);
    setHasMore(true);
    refetchMarks({ ...filters, limit: PAGE_SIZE, offset: 0 });
  }, [refetchMarks, filters]);

  // Re-fetch when filters change.
  useEffect(() => {
    resetAndRefetch();
    setSelectedIds(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStudentId, filterSubjectId, filterExamType, filterStatus]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [createMarkMut] = useMutation(CREATE_MARK);
  const [updateMarkMut] = useMutation(UPDATE_MARK);
  const [deleteMarksMut] = useMutation(DELETE_MARKS);

  const marks: GqlMark[] = marksData?.marks ?? [];
  const students = studentsData?.students ?? [];
  const subjects: GqlSubject[] = subjectsData?.subjects ?? [];
  const examTypes: GqlExamType[] = examTypesData?.examTypes ?? [];

  const filteredMarks = useMemo(() => {
    if (!search) return marks;
    const q = search.toLowerCase();
    return marks.filter((m) =>
      [m.student?.user?.name, m.subject, m.examType, m.grade, m.status].some(
        (v) => String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [marks, search]);

  const allSelected = filteredMarks.length > 0 && filteredMarks.every((m) => selectedIds.has(m.id));
  const someSelected = filteredMarks.some((m) => selectedIds.has(m.id)) && !allSelected;

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredMarks.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredMarks.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} mark record${ids.length === 1 ? "" : "s"}?`)) return;
    try {
      await deleteMarksMut({ variables: { ids } });
      toast.success(`Deleted ${ids.length} record${ids.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
      resetAndRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // The assessment-type options follow the selected subject's department: that
  // department's exams plus any org-wide ones (set up on the Exams page). When
  // none are configured we fall back to the built-in defaults.
  const selectedDeptId = subjects.find((s) => s.id === form.subject_id)?.departmentId ?? "";
  const { examOptions, usingDefaultTypes } = useMemo(() => {
    const applicable = selectedDeptId
      ? examTypes.filter((t) => !t.departmentId || t.departmentId === selectedDeptId)
      : examTypes;
    if (applicable.length > 0) {
      return {
        examOptions: applicable.map((t) => ({
          value: t.name,
          label: t.name,
          maxMarks: t.maxMarks as number | null,
        })),
        usingDefaultTypes: false,
      };
    }
    return {
      examOptions: DEFAULT_ASSESSMENT_TYPES.map((t) => ({
        value: t,
        label: t.replace(/_/g, " "),
        maxMarks: null as number | null,
      })),
      usingDefaultTypes: true,
    };
  }, [examTypes, selectedDeptId]);

  // Keep the chosen type valid as options change (e.g. switching subject), and
  // pre-fill Max Marks from the exam's default when one is selected.
  useEffect(() => {
    if (!showModal || editingMark) return;
    if (examOptions.length === 0) return;
    if (examOptions.some((o) => o.value === form.assessment_type)) return;
    const first = examOptions[0];
    setForm((f) => ({
      ...f,
      assessment_type: first.value,
      max_marks: first.maxMarks != null ? String(first.maxMarks) : f.max_marks,
    }));
  }, [showModal, editingMark, examOptions, form.assessment_type]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMarkMut({
        variables: {
          input: {
            studentId: form.student_id,
            subject: form.subject,
            examType: form.assessment_type,
            semester: parseInt(form.semester),
            marksObtained: parseFloat(form.marks_obtained),
            maxMarks: parseFloat(form.max_marks),
            enteredBy: null,
            subjectId: form.subject_id || null,
            assessmentType: form.assessment_type || null,
            academicYearId: null,
          },
        },
        refetchQueries: [{ query: LIST_MARKS, variables: filters }],
      });
      toast.success("Mark saved");
      setShowModal(false);
      setForm(emptyForm);
      resetAndRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save mark");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMark) return;
    try {
      await updateMarkMut({
        variables: {
          id: editingMark.id,
          input: {
            marksObtained: parseFloat(form.marks_obtained),
            maxMarks: parseFloat(form.max_marks),
          },
        },
      });
      toast.success("Mark updated");
      setShowModal(false);
      setForm(emptyForm);
      setEditingMark(null);
      resetAndRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update mark");
    }
  };

  const openEditMark = (mark: GqlMark) => {
    setEditingMark(mark);
    setForm({
      ...form,
      marks_obtained: mark.marksObtained.toString(),
      max_marks: mark.maxMarks.toString(),
    });
    setShowModal(true);
  };

  // Auto-fill subject name from selected subject
  const handleSubjectChange = (subjectId: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    setForm({ ...form, subject_id: subjectId, subject: sub ? sub.name : form.subject });
  };

  return (
    <div>
      <Header
        title="Marks & Grades"
        subtitle="Academic performance records"
        action={
          canCreate ? (
            <div className="flex gap-2">
              <BulkUploadButton
                resource="marks"
                onFinished={(s) => {
                  if (s.successful > 0) resetAndRefetch();
                }}
                dynamicOptions={{
                  student_id: {
                    searchable: true,
                    options: students.map((s: { id: string; rollNumber: string; user?: { name: string } | null }) => ({
                      value: s.id,
                      label: `${s.user?.name ?? s.rollNumber} (${s.rollNumber})`,
                    })),
                  },
                  subject: {
                    searchable: true,
                    options: subjects.map((s) => ({
                      value: s.name,
                      label: `${s.name} (${s.code})`,
                    })),
                  },
                  subject_id: {
                    searchable: true,
                    options: subjects.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.code})`,
                    })),
                  },
                }}
              />
              <button
                className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700"
                onClick={() => setShowBulkDeleteModal(true)}
                title="Bulk delete by filter"
              >
                <Trash2 size={16} /> Bulk Delete
              </button>
              <Can module="marks" action="create">
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
                  <Plus size={16} /> Add Marks
                </button>
              </Can>
            </div>
          ) : undefined
        }
      />

      {/* Filter bar */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SearchableSelect
          placeholder="All students"
          searchPlaceholder="Search student…"
          value={filterStudentId}
          onChange={setFilterStudentId}
          options={students.map((s: { id: string; user?: { name: string } | null; rollNumber: string }) => ({
            value: s.id,
            label: s.user?.name ?? s.rollNumber,
            sublabel: s.rollNumber,
          }))}
        />
        <SearchableSelect
          placeholder="All subjects"
          searchPlaceholder="Search subject…"
          value={filterSubjectId}
          onChange={setFilterSubjectId}
          options={subjects.map((s) => ({
            value: s.id,
            label: s.name,
            sublabel: s.code,
          }))}
        />
        <SearchableSelect
          placeholder="All types"
          searchPlaceholder="Search type…"
          value={filterExamType}
          onChange={setFilterExamType}
          options={[
            ...examTypes.map((t) => ({ value: t.name, label: t.name })),
            ...DEFAULT_ASSESSMENT_TYPES
              .filter((d) => !examTypes.some((t) => t.name === d))
              .map((d) => ({ value: d, label: d.replace(/_/g, " ") })),
          ]}
        />
        <select
          className="input-field"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Search + bulk delete */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="input-field flex-1"
          placeholder="Search student, subject, grade…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            <Trash2 size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Total count */}
      {totalCount > 0 && (
        <p className="mb-2 text-sm text-muted-foreground">
          {totalCount} record{totalCount === 1 ? "" : "s"} found
        </p>
      )}

      {loading && marks.length === 0 ? (
        <TableSkeleton
          columns={
            canCreate
              ? ["Student", "Subject", "Type", "Sem", "Marks", "Grade", "Status", "Actions"]
              : ["Student", "Subject", "Type", "Sem", "Marks", "Grade", "Status"]
          }
          rows={6}
          colWidths={
            canCreate
              ? ["w-32", "w-28", "w-20", "w-8", "w-16", "w-12", "w-20", "w-12"]
              : ["w-32", "w-28", "w-20", "w-8", "w-16", "w-12", "w-20"]
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {canCreate && (
                  <th className="table-th w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="cursor-pointer accent-primary"
                      title="Select all"
                    />
                  </th>
                )}
                <th className="table-th">Student</th>
                <th className="table-th">Subject</th>
                <th className="table-th">Type</th>
                <th className="table-th">Sem</th>
                <th className="table-th">Marks</th>
                <th className="table-th">Grade</th>
                <th className="table-th">Status</th>
                {canCreate && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMarks.map((m) => (
                <tr
                  key={m.id}
                  className={`hover:bg-muted/40 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}
                >
                  {canCreate && (
                    <td className="table-td w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleRow(m.id)}
                        className="cursor-pointer accent-primary"
                      />
                    </td>
                  )}
                  <td className="table-td font-medium">{m.student?.user?.name ?? "—"}</td>
                  <td className="table-td">{m.subject || "—"}</td>
                  <td className="table-td capitalize text-sm text-muted-foreground">
                    {(m.assessmentType || m.examType || "").replace(/_/g, " ")}
                  </td>
                  <td className="table-td">{m.semester}</td>
                  <td className="table-td">
                    <span className="font-mono">{m.marksObtained}</span>
                    <span className="text-muted-foreground/70 text-xs">/{m.maxMarks}</span>
                  </td>
                  <td className="table-td">
                    <Badge label={m.grade || "N/A"} variant={gradeVariant[m.grade ?? "N/A"] ?? "gray"} />
                  </td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === "approved" ? "bg-green-100 text-green-700" :
                      m.status === "submitted" ? "bg-blue-100 text-blue-700" :
                      "bg-muted/60 text-muted-foreground"
                    }`}>
                      {m.status ?? "draft"}
                    </span>
                  </td>
                  {canCreate && (
                    <td className="table-td">
                      <Can module="marks" action="edit">
                        <button onClick={() => openEditMark(m)} className="text-sm text-blue-600 hover:underline">
                          Edit
                        </button>
                      </Can>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMarks.length === 0 && (
                <tr>
                  <td colSpan={canCreate ? 9 : 7} className="table-td text-center text-muted-foreground/70 py-8">
                    {marks.length === 0 ? "No marks recorded yet." : "No results match your search."}
                  </td>
                </tr>
              )}
              {/* Sentinel row — IntersectionObserver triggers loadMore when this enters the viewport */}
              <tr ref={sentinelRef}>
                <td colSpan={canCreate ? 9 : 7} className="py-2">
                  {loadingMore && (
                    <div className="flex justify-center py-2">
                      <span className="text-xs text-muted-foreground animate-pulse">Loading more…</span>
                    </div>
                  )}
                  {!hasMore && marks.length > 0 && (
                    <div className="text-center text-xs text-muted-foreground/50 py-2">
                      All {marks.length} records loaded
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {canCreate && (
        <Modal title={editingMark ? "Edit Marks" : "Add Marks"} isOpen={showModal} onClose={() => { setShowModal(false); setEditingMark(null) }}>
          <form onSubmit={editingMark ? handleUpdate : handleCreate} className="space-y-4">
            {!editingMark && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Student</label>
                  <SearchableSelect
                    required
                    placeholder="Select student..."
                    searchPlaceholder="Search by name or roll number..."
                    value={form.student_id}
                    onChange={(v) => setForm({ ...form, student_id: v })}
                    options={students.map((s: { id: string; user?: { name: string } | null; rollNumber: string }) => ({
                      value: s.id,
                      label: s.user?.name ?? s.rollNumber,
                      sublabel: s.rollNumber,
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Subject</label>
                  {subjects.length > 0 ? (
                    <SearchableSelect
                      placeholder="— Select subject —"
                      searchPlaceholder="Search subjects..."
                      value={form.subject_id}
                      onChange={(v) => handleSubjectChange(v)}
                      options={subjects.map((s) => ({
                        value: s.id,
                        label: s.name,
                        sublabel: s.code,
                      }))}
                    />
                  ) : (
                    <input className="input-field" placeholder="Subject name" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Assessment Type</label>
                    <SearchableSelect
                      placeholder="Select type..."
                      searchPlaceholder="Search types..."
                      value={form.assessment_type}
                      onChange={(v) => {
                        const opt = examOptions.find((o) => o.value === v);
                        setForm({
                          ...form,
                          assessment_type: v,
                          max_marks: opt && opt.maxMarks != null ? String(opt.maxMarks) : form.max_marks,
                        });
                      }}
                      options={examOptions.map((o) => ({ value: o.value, label: o.label }))}
                    />
                    {usingDefaultTypes && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Default types — set up exams on the Exams page to customise these.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Semester</label>
                    <SearchableSelect
                      placeholder="Semester..."
                      searchPlaceholder="Search..."
                      value={form.semester}
                      onChange={(v) => setForm({ ...form, semester: v })}
                      options={[1,2,3,4,5,6,7,8].map((n) => ({ value: String(n), label: `Semester ${n}` }))}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Marks Obtained</label>
                <input type="number" step="0.5" min="0" className="input-field" value={form.marks_obtained} onChange={(e) => setForm({ ...form, marks_obtained: e.target.value })} required disabled={editingMark ? false : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Max Marks</label>
                <input type="number" min="1" className="input-field" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} required disabled={editingMark ? false : undefined} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{editingMark ? "Update" : "Save"}</button>
              <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditingMark(null) }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        filters={filters}
        labels={{
          studentName: filters.studentId
            ? (() => {
                const s = students.find((st: { id: string; rollNumber: string; user?: { name: string } | null }) => st.id === filters.studentId);
                return s ? `${s.user?.name ?? s.rollNumber} (${s.rollNumber})` : undefined;
              })()
            : undefined,
          subjectName: filters.subjectId
            ? subjects.find((s) => s.id === filters.subjectId)?.name
            : undefined,
        }}
        totalCount={totalCount}
        onDeleted={resetAndRefetch}
      />
    </div>
  );
}
