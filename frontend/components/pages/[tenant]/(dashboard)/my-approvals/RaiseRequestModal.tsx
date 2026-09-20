"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import toast from "react-hot-toast";
import {
  approvalRequestsAPI,
  type ApprovalFlow,
  type FormField,
} from "@/api/services/approvals";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

// RaiseRequestModal lets a regular user start an approval request through
// any active non-builtin flow. Inputs are derived from the flow's
// form_fields JSON so the form adapts to whatever the admin defined.
export default function RaiseRequestModal({ isOpen, onClose, onSubmitted }: Props) {
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [flowId, setFlowId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    approvalRequestsAPI
      .activeFlows()
      .then((r) => {
        const list: ApprovalFlow[] = r.data?.data ?? [];
        setFlows(list);
        if (list[0]) setFlowId(list[0].id);
      })
      .catch(() => setFlows([]));
  }, [isOpen]);

  const selected = useMemo(() => flows.find((f) => f.id === flowId), [flows, flowId]);

  // Reset values when the chosen flow changes.
  useEffect(() => {
    setValues({});
  }, [flowId]);

  const fields: FormField[] = useMemo(() => {
    if (!selected?.form_fields) return [];
    try {
      return JSON.parse(selected.form_fields);
    } catch {
      return [];
    }
  }, [selected]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowId) {
      toast.error("Pick a flow");
      return;
    }
    setSubmitting(true);
    try {
      // Cast number/date strings into the right shapes for the payload.
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.key] ?? "";
        if (f.required && !v) {
          throw new Error(`"${f.label || f.key}" is required`);
        }
        payload[f.key] = f.type === "number" ? Number(v) : v;
      }
      await approvalRequestsAPI.raise({ flow_id: flowId, title, payload });
      toast.success("Request raised");
      setTitle("");
      setValues({});
      onSubmitted();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as Error).message ||
        (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      toast.error(msg || "Could not raise request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Raise Approval Request" isOpen={isOpen} onClose={onClose}>
      {flows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom approval flows are active. Ask an admin to add one in
          <span className="font-mono"> Approval Flows</span>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Flow
            </label>
            <SearchableSelect
              value={flowId}
              onChange={setFlowId}
              options={flows.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="Select flow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Title
            </label>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short description of the request"
              required
            />
          </div>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {f.label || f.key}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className="input-field"
                  rows={3}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              ) : (
                <input
                  className="input-field"
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
