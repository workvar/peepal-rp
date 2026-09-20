"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  approvalFlowsAPI,
  type ApprovalFlow,
  type ApprovalProcess,
  type ApprovalStep,
  type FormField,
} from "@/api/services/approvals";
import { apolloClient } from "@/lib/apollo";
import { GET_ORG_USERS } from "@/graphql/queries/org";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDepartments } from "@/store/slices/orgSlice";
import StepEditor from "./StepEditor";
import FormFieldsEditor from "./FormFieldsEditor";
import { useProcessTypes } from "./processes";
import SearchableSelect from "@/components/ui/SearchableSelect";

type OrgUser = { id: string; name: string; email: string; role: string };

interface FlowFormState {
  name: string;
  process: ApprovalProcess;
  is_active: boolean;
  form_fields: FormField[];
  steps: ApprovalStep[];
}

const emptyForm = (): FlowFormState => ({
  name: "",
  process: "leave",
  is_active: true,
  form_fields: [],
  steps: [],
});

// Approval flow builder. Pulls the process list dynamically from the
// /approval-process-types endpoint so newly-added types show up here
// without code changes.
export default function ApprovalFlowsPage() {
  const dispatch = useAppDispatch();
  const departments = useAppSelector((s) => s.org.departments);
  const { types, labelFor } = useProcessTypes(true);

  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [filter, setFilter] = useState<ApprovalProcess | "">("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<ApprovalFlow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FlowFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchDepartments());
    apolloClient.query({ query: GET_ORG_USERS, fetchPolicy: "cache-first" }).then(({ data }) => setUsers(data?.orgUsers ?? [])).catch(() => {});
  }, [dispatch]);

  const reload = (process?: ApprovalProcess | "") => {
    setLoading(true);
    approvalFlowsAPI
      .list((process || undefined) as ApprovalProcess | undefined)
      .then((r) => setFlows(r.data?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload(filter);
  }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), process: types[0]?.code ?? "leave" });
    setShowModal(true);
  };

  const openEdit = (f: ApprovalFlow) => {
    setEditing(f);
    let parsedFields: FormField[] = [];
    try {
      parsedFields = f.form_fields ? JSON.parse(f.form_fields) : [];
    } catch {
      parsedFields = [];
    }
    setForm({
      name: f.name,
      process: f.process,
      is_active: f.is_active,
      form_fields: parsedFields,
      steps: (f.steps ?? []).slice().sort((a, b) => a.step_order - b.step_order),
    });
    setShowModal(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        process: form.process,
        is_active: form.is_active,
        form_fields: JSON.stringify(form.form_fields),
        steps: form.steps,
      };
      if (editing) {
        await approvalFlowsAPI.update(editing.id, payload);
        toast.success("Flow updated");
      } else {
        await approvalFlowsAPI.create(payload);
        toast.success("Flow created");
      }
      setShowModal(false);
      reload(filter);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Could not save flow");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (f: ApprovalFlow) => {
    if (!confirm(`Delete flow "${f.name}"?`)) return;
    try {
      await approvalFlowsAPI.remove(f.id);
      toast.success("Flow deleted");
      reload(filter);
    } catch {
      toast.error("Could not delete flow");
    }
  };

  return (
    <div>
      <PageHeader
        title="Approval Flows"
        subtitle="Define multi-step approval chains for any process"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Flow
          </button>
        }
      />

      <div className="mb-4">
        <div className="max-w-xs">
          <SearchableSelect
            value={filter}
            onChange={(v) => setFilter(v as ApprovalProcess | "")}
            options={types.map((p) => ({ value: p.code, label: p.label }))}
            placeholder="All processes"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : flows.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            No approval flows yet. Without a flow for a given process, actions
            are auto-approved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {f.name}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      · {labelFor(f.process)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.steps?.length ?? 0} step
                    {(f.steps?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                    {f.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(f)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Edit flow"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(f)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete flow"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "Edit Approval Flow" : "New Approval Flow"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Name
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Process
              </label>
              <SearchableSelect
                value={form.process}
                onChange={(v) => setForm({ ...form, process: v as ApprovalProcess })}
                options={types.map((p) => ({ value: p.code, label: p.label }))}
                placeholder="Select process"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>

          <div>
            <p className="block text-sm font-medium text-foreground/80 mb-2">
              Request form fields
            </p>
            <FormFieldsEditor
              fields={form.form_fields}
              onChange={(form_fields) => setForm({ ...form, form_fields })}
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-foreground/80 mb-2">
              Steps
            </p>
            <StepEditor
              steps={form.steps}
              users={users}
              departments={departments}
              formFields={form.form_fields}
              onChange={(steps) => setForm({ ...form, steps })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
