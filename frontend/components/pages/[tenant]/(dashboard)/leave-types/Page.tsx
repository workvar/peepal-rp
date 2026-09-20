"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_LEAVE_TYPES } from "@/graphql/queries/leaves";
import { CREATE_LEAVE_TYPE, UPDATE_LEAVE_TYPE, DELETE_LEAVE_TYPE } from "@/graphql/mutations/leaves";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import QueryError from "@/components/ui/QueryError";
import { getErrorMessage } from "@/lib/errors";
import type { GqlLeaveType } from "@/types/pages/leaves/page";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkUploadButton, type DynamicFieldEntry } from "@/components/ui/BulkUpload";
import Can from "@/components/access/Can";
import { useTerminology } from "@/store/hooks/useTerminology";
import { roleLabel } from "@/lib/roleLabels";

const emptyForm = {
  name: "", code: "", days_per_year: "12", carry_forward: false,
  max_carry_forward: "0", applicable_to: "all",
};

export default function LeaveTypesPage() {
  const { data, loading, error, refetch } = useQuery(LIST_LEAVE_TYPES);
  const leaveTypes: GqlLeaveType[] = data?.leaveTypes ?? [];

  // Audience options are role-based, labelled from the tenant's terminology so a
  // hospital sees Clinician / Support Staff / Trainee instead of education words.
  const terms = useTerminology();
  const applicableOptions = [
    { value: "all", label: "All" },
    { value: "teacher", label: roleLabel("teacher", terms) },
    { value: "staff", label: roleLabel("staff", terms) },
    { value: "student", label: roleLabel("student", terms) },
  ];
  const applicableLabel = (v: string) =>
    applicableOptions.find((o) => o.value === v)?.label ??
    (v === "employee" ? "Employees" : v);
  const bulkDynamicOptions: Record<string, DynamicFieldEntry> = {
    applicable_to: { options: applicableOptions, strict: true },
  };

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [createLeaveTypeMut] = useMutation(CREATE_LEAVE_TYPE);
  const [updateLeaveTypeMut] = useMutation(UPDATE_LEAVE_TYPE);
  const [deleteLeaveTypeMut] = useMutation(DELETE_LEAVE_TYPE);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (lt: GqlLeaveType) => {
    setEditId(lt.id ?? null);
    setForm({
      name: lt.name, code: lt.code,
      days_per_year: String(lt.daysPerYear),
      carry_forward: lt.carryForward,
      max_carry_forward: String(lt.maxCarryForward),
      applicable_to: lt.applicableTo,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateLeaveTypeMut({
          variables: {
            id: editId,
            input: {
              name: form.name,
              daysPerYear: parseInt(form.days_per_year),
              carryForward: form.carry_forward,
              maxCarryForward: parseInt(form.max_carry_forward),
              applicableTo: form.applicable_to,
            },
          },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Updated");
      } else {
        await createLeaveTypeMut({
          variables: {
            input: {
              name: form.name,
              code: form.code,
              daysPerYear: parseInt(form.days_per_year),
              carryForward: form.carry_forward,
              maxCarryForward: parseInt(form.max_carry_forward),
              applicableTo: form.applicable_to,
            },
          },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Leave type created");
      }
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed"));
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete Leave Type",
      message: "This leave type will be permanently removed.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteLeaveTypeMut({
          variables: { id },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Deleted");
      },
    });
  };

  const filtered = search
    ? leaveTypes.filter((lt) => [lt.name, lt.code, lt.applicableTo].some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : leaveTypes;

  return (
    <div>
      <Header
        title="Leave Types"
        subtitle="Configure leave policies for your organisation"
        action={
          <div className="flex gap-2">
            <BulkUploadButton
              resource="leave-types"
              dynamicOptions={bulkDynamicOptions}
              onFinished={(s) => {
                if (s.successful > 0) refetch();
              }}
            />
            <Can module="leave-types" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                <Plus size={16} /> Add Leave Type
              </button>
            </Can>
          </div>
        }
      />

      <div className="mb-4">
        <input className="input-field w-full" placeholder="Search leave type, code…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40 dark:bg-gray-500">
              <tr>
                <th className="table-th">Type</th>
                <th className="table-th">Code</th>
                <th className="table-th text-center">Days/Year</th>
                <th className="table-th text-center">Carry Forward</th>
                <th className="table-th">Applicable To</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((lt) => (
                <tr key={lt.id ?? lt.code} className="hover:bg-muted/40">
                  <td className="table-td font-medium">{lt.name}</td>
                  <td className="table-td font-mono text-sm">{lt.code}</td>
                  <td className="table-td text-center font-medium">{lt.daysPerYear}</td>
                  <td className="table-td text-center">
                    {lt.carryForward ? (
                      <span className="flex items-center justify-center gap-1 text-green-600">
                        <Check size={14} /> {lt.maxCarryForward > 0 ? `max ${lt.maxCarryForward}` : "Yes"}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-muted-foreground/70">
                        <X size={14} /> No
                      </span>
                    )}
                  </td>
                  <td className="table-td text-muted-foreground">{applicableLabel(lt.applicableTo)}</td>
                  <td className="table-td">
                    {lt.id && (
                      <div className="flex items-center gap-2">
                        <Can module="leave-types" action="edit">
                          <button onClick={() => openEdit(lt)} className="text-blue-500 hover:text-blue-700"><Pencil size={14} /></button>
                        </Can>
                        <Can module="leave-types" action="delete">
                          <button onClick={() => handleDelete(lt.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                        </Can>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaveTypes.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-muted-foreground/70 py-8">No leave types configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editId ? "Edit Leave Type" : "Add Leave Type"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" placeholder="e.g. Casual Leave" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" placeholder="e.g. CL" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required disabled={!!editId} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Days per Year</label>
              <input type="number" min="0" className="input-field" value={form.days_per_year}
                onChange={(e) => setForm({ ...form, days_per_year: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Applicable To</label>
              <select className="input-field" value={form.applicable_to}
                onChange={(e) => setForm({ ...form, applicable_to: e.target.value })}>
                {applicableOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="cf" checked={form.carry_forward}
              onChange={(e) => setForm({ ...form, carry_forward: e.target.checked })} className="rounded" />
            <label htmlFor="cf" className="text-sm font-medium text-foreground/80">Allow Carry Forward</label>
          </div>
          {form.carry_forward && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Max Carry Forward Days</label>
              <input type="number" min="0" className="input-field" value={form.max_carry_forward}
                onChange={(e) => setForm({ ...form, max_carry_forward: e.target.value })} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editId ? "Update" : "Create"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
