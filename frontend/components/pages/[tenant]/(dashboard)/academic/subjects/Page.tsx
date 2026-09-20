"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_SUBJECTS } from "@/graphql/queries/academic";
import { CREATE_SUBJECT, UPDATE_SUBJECT, DELETE_SUBJECT } from "@/graphql/mutations/academic";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchableSelect from "@/components/ui/SearchableSelect";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, BookOpen, Upload } from "lucide-react";
import Can from "@/components/access/Can";
import { Button } from "@/components/ui/button";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkDeleteBar, HeaderCheckbox, RowCheckbox, runBulkDelete, useBulkSelect } from "@/components/ui/bulkSelect";
import BulkSubjectModal from "./BulkSubjectModal";
import SubjectPlanFields, { type UnitForm } from "./SubjectPlanFields";

type GqlUnit = {
  title: string;
  content: string;
  labActivities?: string | null;
  fieldVisits?: string | null;
  others?: string | null;
};
type GqlSubject = {
  id: string;
  name: string;
  code: string;
  credits?: number | null;
  teachingHours?: number | null;
  labHours?: number | null;
  semesterNumber?: number | null;
  description?: string | null;
  syllabusUrl?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  courseOutcomes?: string[] | null;
  units?: GqlUnit[] | null;
};
type GqlDepartment = { id: string; name: string };

const emptyForm = {
  name: "", code: "", department_id: "", credits: "3",
  teaching_hours: "3", lab_hours: "0", semester_number: "1",
  description: "", syllabus_url: "",
};

export default function SubjectsPage() {
  const user = useAppSelector((s) => s.auth.user);

  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [units, setUnits] = useState<UnitForm[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const sel = useBulkSelect();
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data: subjectsData, loading, refetch } = useQuery(LIST_SUBJECTS, {
    variables: {
      departmentId: filterDept || undefined,
      search: search || undefined,
    },
  });
  const { data: deptsData } = useQuery(LIST_DEPARTMENTS);

  const [createSubjectMut] = useMutation(CREATE_SUBJECT, {
    refetchQueries: [{ query: LIST_SUBJECTS }],
  });
  const [updateSubjectMut] = useMutation(UPDATE_SUBJECT, {
    refetchQueries: [{ query: LIST_SUBJECTS }],
  });
  const [deleteSubjectMut] = useMutation(DELETE_SUBJECT, {
    refetchQueries: [{ query: LIST_SUBJECTS }],
  });

  const subjects: GqlSubject[] = subjectsData?.subjects ?? [];
  const departments: GqlDepartment[] = deptsData?.departments ?? [];

  const isAdmin = user?.role === "admin";

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setUnits([]);
    setOutcomes([]);
    setShowModal(true);
  };
  const openEdit = (s: GqlSubject) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      code: s.code,
      department_id: s.departmentId ?? "",
      credits: String(s.credits ?? ""),
      teaching_hours: String(s.teachingHours ?? ""),
      lab_hours: String(s.labHours ?? ""),
      semester_number: String(s.semesterNumber ?? ""),
      description: s.description ?? "",
      syllabus_url: s.syllabusUrl ?? "",
    });
    setUnits(
      (s.units ?? []).map((u) => ({
        title: u.title ?? "",
        content: u.content ?? "",
        labActivities: u.labActivities ?? "",
        fieldVisits: u.fieldVisits ?? "",
        others: u.others ?? "",
      })),
    );
    setOutcomes(s.courseOutcomes ?? []);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name: form.name,
      code: form.code,
      departmentId: form.department_id || undefined,
      credits: parseInt(form.credits),
      teachingHours: parseInt(form.teaching_hours),
      labHours: parseInt(form.lab_hours),
      semesterNumber: parseInt(form.semester_number),
      description: form.description || undefined,
      syllabusUrl: form.syllabus_url || undefined,
      courseOutcomes: outcomes.map((o) => o.trim()).filter(Boolean),
      units: units
        .filter((u) => u.title.trim() || u.content.trim())
        .map((u) => ({
          title: u.title.trim(),
          content: u.content,
          labActivities: u.labActivities || undefined,
          fieldVisits: u.fieldVisits || undefined,
          others: u.others || undefined,
        })),
    };
    try {
      if (editId) {
        await updateSubjectMut({ variables: { id: editId, input } });
        toast.success("Subject updated");
      } else {
        await createSubjectMut({ variables: { input } });
        toast.success("Subject created");
      }
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete Subject",
      message: "This subject will be permanently removed from the curriculum. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteSubjectMut({ variables: { id } });
        toast.success("Subject deleted");
      },
    });
  };

  const handleBulkDelete = () => {
    const ids = [...sel.selected];
    if (ids.length === 0) return;
    setConfirmState({
      title: `Delete ${ids.length} subject${ids.length > 1 ? "s" : ""}`,
      message: "The selected subjects will be permanently removed from the curriculum. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setBulkDeleting(true);
        try {
          await runBulkDelete(ids, (id) => deleteSubjectMut({ variables: { id } }), "subject");
          sel.clear();
          await refetch();
        } finally {
          setBulkDeleting(false);
        }
      },
    });
  };

  // Filtering is handled server-side via query variables, but keep client-side as fallback
  const filtered = subjects;
  const ids = filtered.map((s) => s.id);

  return (
    <div>
      <Header
        title="Subjects"
        subtitle="Manage curriculum subjects and courses"
        action={
          isAdmin ? (
            <Can module="subjects" action="create">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowBulk(true)}>
                  <Upload size={16} /> Bulk Upload
                </Button>
                <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                  <Plus size={16} /> Add Subject
                </button>
              </div>
            </Can>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="mb-4 flex gap-3">
        <div className="w-64">
          <SearchableSelect
            value={filterDept}
            onChange={setFilterDept}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="All Departments"
          />
        </div>
        <input
          className="input-field flex-1"
          placeholder="Search subject name, code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isAdmin && (
        <Can module="subjects" action="delete">
          <BulkDeleteBar sel={sel} noun="subject" onDelete={handleBulkDelete} deleting={bulkDeleting} />
        </Can>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {isAdmin && (
                  <th className="table-th w-10">
                    <HeaderCheckbox checked={sel.isAllSelected(ids)} onChange={() => sel.toggleAll(ids)} />
                  </th>
                )}
                <th className="table-th">Subject</th>
                <th className="table-th">Code</th>
                <th className="table-th">Department</th>
                <th className="table-th">Sem</th>
                <th className="table-th">Credits</th>
                <th className="table-th">Hours (T+L)</th>
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  {isAdmin && (
                    <td className="table-td">
                      <RowCheckbox checked={sel.selected.has(s.id)} onChange={() => sel.toggle(s.id)} />
                    </td>
                  )}
                  <td className="table-td font-medium">
                    <div className="flex items-center gap-2">
                      <BookOpen size={15} className="text-indigo-500" />
                      {s.name}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate max-w-xs">{s.description}</p>}
                  </td>
                  <td className="table-td font-mono text-sm">{s.code}</td>
                  <td className="table-td">{s.department?.name ?? "—"}</td>
                  <td className="table-td">{s.semesterNumber}</td>
                  <td className="table-td">{s.credits}</td>
                  <td className="table-td">{s.teachingHours}+{s.labHours}</td>
                  {isAdmin && (
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Can module="subjects" action="edit">
                          <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700">
                            <Pencil size={15} />
                          </button>
                        </Can>
                        <Can module="subjects" action="delete">
                          <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="table-td text-center text-muted-foreground/70 py-8">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editId ? "Edit Subject" : "Add Subject"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" placeholder="e.g. CS301" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Department</label>
            <SearchableSelect
              value={form.department_id}
              onChange={(v) => setForm({ ...form, department_id: v })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="— Select —"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Semester</label>
              <select className="input-field" value={form.semester_number} onChange={(e) => setForm({ ...form, semester_number: e.target.value })}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Credits</label>
              <input type="number" min="0" max="10" className="input-field" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Teaching Hours/wk</label>
              <input type="number" min="0" className="input-field" value={form.teaching_hours} onChange={(e) => setForm({ ...form, teaching_hours: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Lab Hours/wk</label>
              <input type="number" min="0" className="input-field" value={form.lab_hours} onChange={(e) => setForm({ ...form, lab_hours: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <SubjectPlanFields
            outcomes={outcomes}
            units={units}
            onOutcomesChange={setOutcomes}
            onUnitsChange={setUnits}
          />
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editId ? "Update" : "Create"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <BulkSubjectModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        departments={departments}
        onFinished={() => refetch()}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
