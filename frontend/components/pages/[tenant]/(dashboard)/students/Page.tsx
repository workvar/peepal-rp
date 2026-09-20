"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { CREATE_STUDENT, DELETE_STUDENT, LIST_COURSES, LIST_STUDENTS } from "@/queries/pages/students/students";
import { UPDATE_STUDENT, DELETE_ALL_STUDENTS } from "@/graphql/mutations/students";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import PhotoUpload from "@/components/ui/PhotoUpload";
import { TableSkeleton } from "@/components/ui/skeletons";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkUploadButton, type DynamicFieldEntry } from "@/components/ui/BulkUpload";
import SearchableSelect from "@/components/ui/SearchableSelect";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { Plus, Trash2, Edit2, Info } from "lucide-react";
import { buildStudentInput, buildStudentUpdateInput, emptyStudentForm, filterStudents } from "@/functions/students/studentForms";
import type { GqlCourse, GqlStudent, StudentFormState } from "@/types/pages/students/page";
import { useTerminology } from "@/store/hooks/useTerminology";
import { useAppSelector } from "@/store/hooks";
import QueryError from "@/components/ui/QueryError";
import Can from "@/components/access/Can";
import InvitePasswordField, { invitePasswordPayload } from "@/components/ui/InvitePasswordField";
import WorkspaceRolesPanel from "@/components/access/WorkspaceRolesPanel";
import { useEmailSendStatus } from "@/lib/useEmailSendStatus";

export default function StudentsPage() {
  const t = useTerminology();
  // Email is optional for students only when the org signs them in by Roll Number.
  const studentEmailRequired = useAppSelector((s) => s.auth.user?.student_email_required ?? true);
  const { data: studentsData, loading, error, refetch } = useQuery(LIST_STUDENTS);
  const { data: coursesData } = useQuery(LIST_COURSES, { fetchPolicy: "network-only" });

  const [createStudentMut] = useMutation(CREATE_STUDENT, {
    refetchQueries: [{ query: LIST_STUDENTS }],
  });
  const [updateStudentMut] = useMutation(UPDATE_STUDENT, {
    refetchQueries: [{ query: LIST_STUDENTS }],
  });
  const [deleteStudentMut] = useMutation(DELETE_STUDENT, {
    refetchQueries: [{ query: LIST_STUDENTS }],
  });
  const [deleteAllStudentsMut] = useMutation(DELETE_ALL_STUDENTS, {
    refetchQueries: [{ query: LIST_STUDENTS }],
  });

  const students: GqlStudent[] = studentsData?.students ?? [];
  const courses: GqlCourse[] = coursesData?.courses ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlStudent | null>(null);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [tempOpen, setTempOpen] = useState(false);
  const { status: emailStatus } = useEmailSendStatus();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batches for currently selected course (modal)
  const selectedCourse = courses.find((c) => c.id === form.course_id) ?? null;
  const batchOptions = (selectedCourse?.batches ?? []).map((b) => ({
    value: b.name,
    label: b.name,
  }));

  // Dynamic options for the bulk upload table
  const bulkDynamicOptions: Record<string, DynamicFieldEntry> = {
    course_id: {
      searchable: true,
      options: courses.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.code})`,
      })),
    },
    batch: {
      options: (row) => {
        const course = courses.find((c) => c.id === row.course_id);
        return (course?.batches ?? []).map((b) => ({ value: b.name, label: b.name }));
      },
    },
  };

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyStudentForm);
    setTempOpen(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyStudentForm);
    setTempOpen(false);
    setShowModal(true);
  }

  function openEdit(student: GqlStudent) {
    setEditing(student);
    setForm({
      name: student.user?.name ?? "",
      email: student.user?.email ?? "",
      password: "",
      course_id: student.course?.id ?? "",
      roll_number: student.rollNumber ?? "",
      section: student.section ?? "",
      semester: String(student.semester ?? 1),
      phone: student.phone ?? "",
      enroll_date: student.enrollDate?.slice(0, 10) ?? "",
      date_of_birth: student.dateOfBirth?.slice(0, 10) ?? "",
      gender: student.gender ?? "",
      photo_url: student.photoUrl ?? "",
      batch: student.batch ?? "",
      father_name: student.fatherName ?? "",
      mother_name: student.motherName ?? "",
    });
    setShowModal(true);
  }

  function handleCourseChange(courseId: string) {
    setForm((f) => ({ ...f, course_id: courseId, batch: "" }));
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const pay = invitePasswordPayload({
        canSendEmail: emailStatus.canSend,
        tempOpen,
        password: form.password,
      });
      await createStudentMut({ variables: { input: buildStudentInput(form, pay) } });
      toast.success(pay.sendInvite ? "Student enrolled — invite email sent" : "Student enrolled");
      closeModal();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to enroll student"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateStudentMut({ variables: { id: editing.id, input: buildStudentUpdateInput(form) } });
      toast.success("Student updated");
      closeModal();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update student"));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = filterStudents(students, search);

  // Department distribution: map dept name → student count
  const deptDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      const dept = courses.find((c) => c.id === s.course?.id)?.department?.name ?? "No Department";
      map.set(dept, (map.get(dept) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [students, courses]);

  const allFilteredIds = filteredStudents.map((s) => s.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allFilteredIds]));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = [...selectedIds];
    setConfirmState({
      title: "Remove Students",
      message: `Delete ${ids.length} selected student${ids.length > 1 ? "s" : ""}? This permanently removes their profiles and login accounts.`,
      variant: "danger",
      confirmLabel: "Remove All",
      onConfirm: async () => {
        await Promise.all(ids.map((id) => deleteStudentMut({ variables: { id } })));
        setSelectedIds(new Set());
        toast.success(`${ids.length} student${ids.length > 1 ? "s" : ""} removed`);
      },
    });
  }

  // Wipes every student in the org (one atomic backend mutation), regardless of
  // the current search filter or selection.
  function handleDeleteAll() {
    const total = students.length;
    setConfirmState({
      title: `Delete all ${t.member_plural.toLowerCase()}`,
      message: `Permanently delete all ${total} ${(total === 1 ? t.member : t.member_plural).toLowerCase()}? This removes every profile and login account along with their marks, fees, hostel beds and attendance. This cannot be undone.`,
      variant: "danger",
      confirmLabel: `Delete all ${total}`,
      onConfirm: async () => {
        const res = await deleteAllStudentsMut();
        const n = res.data?.deleteAllStudents ?? 0;
        setSelectedIds(new Set());
        toast.success(`${n} ${(n === 1 ? t.member : t.member_plural).toLowerCase()} removed`);
      },
    });
  }

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.code,
  }));

  return (
    <div>
      <Header
        title={t.member_plural}
        subtitle={`Manage enrolled ${t.member_plural.toLowerCase()}`}
        action={
          <div className="flex gap-2">
            {students.length > 0 && (
              <Can module="students" action="delete">
                <button
                  className="btn-outline flex items-center gap-2 text-red-600 border-red-500/40 hover:bg-red-500/10"
                  onClick={handleDeleteAll}
                >
                  <Trash2 size={16} /> Delete all
                </button>
              </Can>
            )}
            <BulkUploadButton
              resource="students"
              onFinished={(s) => { if (s.successful > 0) refetch(); }}
              dynamicOptions={bulkDynamicOptions}
            />
            <Can module="students" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                <Plus size={16} /> Enroll {t.member}
              </button>
            </Can>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder="Search name, roll number, course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Total count + department distribution tooltip */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap shrink-0">
          <span className="font-medium text-foreground">{students.length}</span>
          <span>{students.length === 1 ? t.member : t.member_plural}</span>
          <div className="relative group">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Info size={15} />
            </button>
            {/* Hover tooltip */}
            <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
              <p className="font-semibold text-foreground mb-2">By Department</p>
              {deptDistribution.length === 0 ? (
                <p className="text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-1.5">
                  {deptDistribution.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="truncate text-foreground">{dept}</span>
                          <span className="font-medium ml-2 shrink-0">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round((count / students.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <Can module="students" action="delete">
            <button
              className="btn-danger flex items-center gap-2 whitespace-nowrap"
              onClick={handleBulkDelete}
            >
              <Trash2 size={15} />
              Delete {selectedIds.size} selected
            </button>
          </Can>
        )}
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {loading && students.length === 0 ? (
        <TableSkeleton
          columns={["Name", "Roll No.", t.course, "Section", "Semester", "Phone", "Actions"]}
          rows={6}
          colWidths={["w-32", "w-24", "w-28", "w-12", "w-12", "w-24", "w-16"]}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="rounded border-border cursor-pointer"
                  />
                </th>
                <th className="table-th whitespace-nowrap">Name</th>
                <th className="table-th whitespace-nowrap">Roll No.</th>
                <th className="table-th whitespace-nowrap">{t.course}</th>
                <th className="table-th whitespace-nowrap">Batch</th>
                <th className="table-th whitespace-nowrap">Section</th>
                <th className="table-th whitespace-nowrap">Semester</th>
                <th className="table-th whitespace-nowrap">Phone</th>
                <th className="table-th whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-muted/40 transition-colors ${selectedIds.has(s.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="table-td w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleOne(s.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
                  <td className="table-td font-medium whitespace-nowrap">{s.user?.name ?? "—"}</td>
                  <td className="table-td font-mono text-sm whitespace-nowrap">{s.rollNumber}</td>
                  <td className="table-td whitespace-nowrap">{s.course?.name ?? "—"}</td>
                  <td className="table-td whitespace-nowrap">{s.batch || "—"}</td>
                  <td className="table-td whitespace-nowrap">{s.section || "—"}</td>
                  <td className="table-td whitespace-nowrap">{s.semester}</td>
                  <td className="table-td whitespace-nowrap">{s.phone || "—"}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Can module="students" action="edit">
                        <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 transition-colors">
                          <Edit2 size={16} />
                        </button>
                      </Can>
                      <Can module="students" action="delete">
                        <button
                          onClick={() => setConfirmState({
                            title: "Remove Student",
                            message: `Delete ${s.user?.name ?? "this student"}? This permanently removes their student profile and login account.`,
                            variant: "danger",
                            confirmLabel: "Remove",
                            onConfirm: async () => {
                              await deleteStudentMut({ variables: { id: s.id } });
                              toast.success("Student removed");
                            },
                          })}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-td text-center text-muted-foreground/70 py-8">
                    No students enrolled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      <Modal title={editing ? "Edit Student" : "Enroll Student"} isOpen={showModal} onClose={closeModal}>
        <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Photo</label>
            {editing ? (
              <PhotoUpload
                entity="student"
                id={editing.id}
                value={form.photo_url}
                fallbackName={editing.user?.name ?? ""}
                onChange={(url) => setForm({ ...form, photo_url: url })}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Enroll the student first, then reopen to upload a photo.
              </p>
            )}
          </div>

          {/* Login account — created together with the student in one step */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name</label>
              <input
                className="input-field"
                placeholder="e.g. Arjun Patel"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Email{!studentEmailRequired && <span className="text-xs text-muted-foreground"> (optional)</span>}
              </label>
              <input
                type="email"
                className="input-field"
                placeholder={studentEmailRequired ? "arjun@college.edu" : "Leave blank for Roll Number login"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required={studentEmailRequired}
              />
            </div>
          </div>
          <InvitePasswordField
            canSendEmail={emailStatus.canSend}
            email={form.email}
            password={form.password}
            onPasswordChange={(v) => setForm({ ...form, password: v })}
            tempOpen={tempOpen}
            onTempOpenChange={setTempOpen}
            editing={!!editing}
          />

          {/* Extra roles this student can switch into (e.g. a student who is
              also employed as staff). Edit-only; saves on toggle. */}
          <WorkspaceRolesPanel userId={editing?.user?.id ?? null} />

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Course</label>
            <SearchableSelect
              options={courseOptions}
              value={form.course_id}
              onChange={handleCourseChange}
              placeholder="Select course..."
              searchPlaceholder="Search by name or code..."
            />
          </div>

          {/* Roll Number + Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Roll Number</label>
              <input
                className="input-field"
                placeholder="e.g. CS2024001"
                value={form.roll_number}
                onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Section</label>
              <input
                className="input-field"
                placeholder="e.g. A"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              />
            </div>
          </div>

          {/* Semester + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Semester</label>
              <select
                className="input-field"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Enroll Date */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Enroll Date</label>
            <input
              type="date"
              className="input-field"
              value={form.enroll_date}
              onChange={(e) => setForm({ ...form, enroll_date: e.target.value })}
            />
          </div>

          {/* Date of Birth + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Date of Birth</label>
              <input
                type="date"
                className="input-field"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Gender</label>
              <select
                className="input-field"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Batch — driven by selected course's batches */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Batch</label>
            {batchOptions.length > 0 ? (
              <SearchableSelect
                options={batchOptions}
                value={form.batch}
                onChange={(v) => setForm({ ...form, batch: v })}
                placeholder="Select batch..."
                searchPlaceholder="Search batch..."
              />
            ) : (
              <input
                className="input-field"
                placeholder={
                  form.course_id
                    ? "No batches for this course — add them on the Courses page"
                    : "Select a course first"
                }
                disabled
                readOnly
                value=""
              />
            )}
          </div>

          {/* Father + Mother */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Father Name</label>
              <input
                className="input-field"
                value={form.father_name}
                onChange={(e) => setForm({ ...form, father_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Mother Name</label>
              <input
                className="input-field"
                value={form.mother_name}
                onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? (editing ? "Updating..." : "Enrolling...") : editing ? "Update Student" : "Enroll"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
