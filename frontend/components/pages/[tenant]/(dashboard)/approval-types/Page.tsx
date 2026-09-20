"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  approvalProcessTypesAPI,
  type ApprovalProcessType,
} from "@/api/services/approvals";

// ApprovalTypesPage manages tenant-defined process types. Built-in types
// (leave/holiday/...) are seeded automatically and shown but cannot be
// deleted. Admins can deactivate any type to hide it from the flow builder.
export default function ApprovalTypesPage() {
  const [types, setTypes] = useState<ApprovalProcessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ApprovalProcessType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: "", label: "", description: "", is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const reload = () => {
    setLoading(true);
    approvalProcessTypesAPI
      .list()
      .then((r) => setTypes(r.data?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", label: "", description: "", is_active: true });
    setShowModal(true);
  };

  const openEdit = (t: ApprovalProcessType) => {
    setEditing(t);
    setForm({
      code: t.code,
      label: t.label,
      description: t.description ?? "",
      is_active: t.is_active,
    });
    setShowModal(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await approvalProcessTypesAPI.update(editing.id, form);
        toast.success("Updated");
      } else {
        await approvalProcessTypesAPI.create({
          ...form,
          // Normalise the code so flows resolve cleanly.
          code: form.code.trim().toLowerCase().replace(/\s+/g, "_"),
        });
        toast.success("Created");
      }
      setShowModal(false);
      reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (t: ApprovalProcessType) => {
    if (t.is_builtin) {
      toast.error("Built-in types cannot be deleted — deactivate instead");
      return;
    }
    if (!confirm(`Delete "${t.label}"?`)) return;
    try {
      await approvalProcessTypesAPI.remove(t.id);
      toast.success("Deleted");
      reload();
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div>
      <PageHeader
        title="Approval Types"
        subtitle="Define what kinds of things go through approval"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Type
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Label</th>
                <th className="table-th">Code</th>
                <th className="table-th">Description</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {types.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="table-td font-medium text-foreground">
                    {t.label}
                    {t.is_builtin && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        built-in
                      </span>
                    )}
                  </td>
                  <td className="table-td font-mono text-xs text-muted-foreground">{t.code}</td>
                  <td className="table-td text-muted-foreground">{t.description || "—"}</td>
                  <td className="table-td">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: t.is_active
                          ? "rgb(34 197 94 / 0.12)"
                          : "rgb(148 163 184 / 0.16)",
                        color: t.is_active ? "rgb(22 163 74)" : "rgb(100 116 139)",
                      }}
                    >
                      {t.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        disabled={t.is_builtin}
                        className="text-red-600 hover:text-red-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? "Edit Approval Type" : "New Approval Type"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Label</label>
            <input
              className="input-field"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Travel Authorization"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Code{" "}
              <span className="text-xs text-muted-foreground">
                (lowercase, used internally)
              </span>
            </label>
            <input
              className="input-field font-mono"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="travel_authorization"
              required
              disabled={!!editing?.is_builtin}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Description
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
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
