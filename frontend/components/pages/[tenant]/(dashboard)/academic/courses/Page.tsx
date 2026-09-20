"use client";

import { useState, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_COURSES } from "@/graphql/queries/academic";
import { CREATE_COURSE, UPDATE_COURSE, DELETE_COURSE, CREATE_COURSE_BATCH } from "@/graphql/mutations/academic";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, GraduationCap, BarChart2, Search, X, Layers } from "lucide-react";
import CourseBatchesModal from "./CourseBatchesModal";
import BatchesInput, { makeBatchRow } from "./BatchesInput";

type BatchRow = { key: number; startYear: string };

type GqlCourse = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  durationYears?: number | null;
  totalSemesters?: number | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
};

type GqlDepartment = { id: string; name: string };

const emptyForm = {
  name: "",
  code: "",
  description: "",
  duration_years: "4",
  total_semesters: "8",
  department_id: "",
};

export default function CoursesPage() {
  const user = useAppSelector((s) => s.auth.user);

  // ── modal / form state ────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingBatches, setPendingBatches] = useState<BatchRow[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [batchesCourse, setBatchesCourse] = useState<GqlCourse | null>(null);

  // ── search / selection ────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);

  // ── data ──────────────────────────────────────────────────────────
  const { data: coursesData, loading, refetch } = useQuery(LIST_COURSES);
  const { data: deptsData } = useQuery(LIST_DEPARTMENTS);

  const [createCourseMut] = useMutation(CREATE_COURSE);
  const [createBatchMut] = useMutation(CREATE_COURSE_BATCH, { refetchQueries: [{ query: LIST_COURSES }] });
  const [updateCourseMut] = useMutation(UPDATE_COURSE, { refetchQueries: [{ query: LIST_COURSES }] });
  const [deleteCourseMut] = useMutation(DELETE_COURSE, { refetchQueries: [{ query: LIST_COURSES }] });

  const allCourses: GqlCourse[] = coursesData?.courses ?? [];
  const departments: GqlDepartment[] = deptsData?.departments ?? [];
  const isAdmin = user?.role === "admin";

  // ── filtered list ─────────────────────────────────────────────────
  const courses = useMemo(() => {
    if (!search.trim()) return allCourses;
    const q = search.toLowerCase();
    return allCourses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.department?.name ?? "").toLowerCase().includes(q)
    );
  }, [allCourses, search]);

  // ── stats: courses per department ─────────────────────────────────
  const deptStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const c of allCourses) {
      const key = c.departmentId ?? "__none__";
      const label = c.department?.name ?? "No Department";
      const entry = map.get(key) ?? { name: label, count: 0 };
      entry.count++;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [allCourses]);

  // ── dynamic options for bulk upload ──────────────────────────────
  const departmentDynamicOptions = departments.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  // ── selection helpers ─────────────────────────────────────────────
  const allSelected = courses.length > 0 && courses.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        courses.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        courses.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── CRUD handlers ─────────────────────────────────────────────────
  const openCreate = () => { setEditId(null); setForm(emptyForm); setPendingBatches([]); setShowModal(true); };

  const openEdit = (c: GqlCourse) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      description: c.description ?? "",
      duration_years: String(c.durationYears ?? "4"),
      total_semesters: String(c.totalSemesters ?? "8"),
      department_id: c.departmentId ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name: form.name,
      code: form.code,
      description: form.description || undefined,
      durationYears: form.duration_years ? parseInt(form.duration_years) : undefined,
      totalSemesters: form.total_semesters ? parseInt(form.total_semesters) : undefined,
      departmentId: form.department_id || undefined,
    };
    try {
      if (editId) {
        await updateCourseMut({ variables: { id: editId, input } });
        toast.success("Course updated");
      } else {
        const res = await createCourseMut({ variables: { input } });
        const courseId = res.data?.createCourse?.id;
        if (courseId && pendingBatches.length > 0) {
          await Promise.all(
            pendingBatches.map((b) =>
              createBatchMut({ variables: { courseId, startYear: parseInt(b.startYear) } })
            )
          );
        }
        toast.success("Course created");
        setPendingBatches([]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      title: "Delete Course",
      message: `"${name}" will be permanently deleted. Students enrolled may be affected.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteCourseMut({ variables: { id } });
        toast.success("Course deleted");
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selected.size;
    setConfirmState({
      title: `Delete ${count} Course${count > 1 ? "s" : ""}`,
      message: `${count} course${count > 1 ? "s" : ""} will be permanently deleted. This cannot be undone.`,
      variant: "danger",
      confirmLabel: `Delete ${count}`,
      onConfirm: async () => {
        await Promise.all([...selected].map((id) => deleteCourseMut({ variables: { id } })));
        setSelected(new Set());
        toast.success(`${count} course${count > 1 ? "s" : ""} deleted`);
      },
    });
  };

  return (
    <div>
      <Header
        title="Courses"
        subtitle="Manage programmes and courses offered by the institution"
        action={
          isAdmin ? (
            <div className="flex gap-2">
              <BulkUploadButton
                resource="courses"
                onFinished={(s) => { if (s.successful > 0) refetch(); }}
                dynamicOptions={{ department_id: departmentDynamicOptions }}
              />
              <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                <Plus size={16} /> Add Course
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            className="input-field pl-8 pr-8"
            placeholder="Search name, code, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {courses.length} of {allCourses.length} course{allCourses.length !== 1 ? "s" : ""}
        </span>

        {/* Stats popover */}
        <div className="relative">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowStats((v) => !v)}
            title="Courses by department"
          >
            <BarChart2 size={15} />
          </button>
          {showStats && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStats(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 bg-background border border-border rounded-lg shadow-lg w-72 p-4">
                <p className="text-sm font-semibold mb-3">Courses by Department</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {deptStats.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="flex-1 text-sm truncate text-foreground/80">{d.name}</div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 rounded-full bg-emerald-500/70"
                          style={{ width: Math.max(8, (d.count / allCourses.length) * 120) }}
                        />
                        <span className="text-xs font-mono text-muted-foreground w-4 text-right">{d.count}</span>
                      </div>
                    </div>
                  ))}
                  {deptStats.length === 0 && (
                    <p className="text-xs text-muted-foreground">No courses yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bulk delete */}
        {someSelected && isAdmin && (
          <button
            className="btn-secondary flex items-center gap-2 text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleBulkDelete}
          >
            <Trash2 size={14} />
            Delete {selected.size}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {isAdmin && (
                  <th className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="cursor-pointer"
                    />
                  </th>
                )}
                <th className="table-th">Course</th>
                <th className="table-th">Code</th>
                <th className="table-th">Department</th>
                <th className="table-th">Duration</th>
                <th className="table-th">Semesters</th>
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {courses.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-muted/40 ${selected.has(c.id) ? "bg-emerald-50/60 dark:bg-emerald-900/10" : ""}`}
                >
                  {isAdmin && (
                    <td className="table-td w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        className="cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="table-td font-medium">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={15} className="text-emerald-500 shrink-0" />
                      <div>
                        <div>{c.name}</div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground/70 truncate max-w-xs">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-sm">{c.code}</td>
                  <td className="table-td">{c.department?.name ?? "—"}</td>
                  <td className="table-td">{c.durationYears ? `${c.durationYears} yr` : "—"}</td>
                  <td className="table-td">{c.totalSemesters ?? "—"}</td>
                  {isAdmin && (
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBatchesCourse(c)}
                          className="text-emerald-600 hover:text-emerald-800"
                          title="Manage batches"
                        >
                          <Layers size={15} />
                        </button>
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.name)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 5}
                    className="table-td text-center text-muted-foreground/70 py-8"
                  >
                    {search ? `No courses match "${search}".` : "No courses yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        title={editId ? "Edit Course" : "Add Course"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Course Name</label>
              <input
                className="input-field"
                placeholder="e.g. B.Tech Computer Science"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input
                className="input-field"
                placeholder="e.g. BTCSE"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Department</label>
            <SearchableSelect
              value={form.department_id}
              onChange={(v) => setForm({ ...form, department_id: v })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="— Select Department —"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Duration (years)</label>
              <input
                type="number" min="1" max="10" className="input-field"
                value={form.duration_years}
                onChange={(e) => setForm({ ...form, duration_years: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Total Semesters</label>
              <input
                type="number" min="1" max="20" className="input-field"
                value={form.total_semesters}
                onChange={(e) => setForm({ ...form, total_semesters: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
            <textarea
              className="input-field" rows={2}
              placeholder="Brief description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {!editId && (
            <BatchesInput batches={pendingBatches} onChange={setPendingBatches} />
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editId ? "Update" : "Create"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      {batchesCourse && (
        <CourseBatchesModal
          courseId={batchesCourse.id}
          courseName={batchesCourse.name}
          isOpen={true}
          onClose={() => setBatchesCourse(null)}
        />
      )}
    </div>
  );
}
