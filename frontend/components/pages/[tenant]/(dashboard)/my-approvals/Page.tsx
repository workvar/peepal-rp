"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import { Check, Plus, X } from "lucide-react";
import {
  approvalRequestsAPI,
  type ApprovalRequest,
} from "@/api/services/approvals";
import { apolloClient } from "@/lib/apollo";
import { APPROVE_REQUEST, REJECT_REQUEST } from "@/graphql/mutations/approvals";
import { useProcessTypes } from "../approval-flows/processes";
import RaiseRequestModal from "./RaiseRequestModal";

// Try to render the JSON payload as a small key:value strip; fall back to
// just the title if it isn't valid JSON.
function PayloadStrip({ payload }: { payload?: string }) {
  if (!payload) return null;
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(payload);
  } catch {
    return null;
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
      {entries.map(([k, v]) => (
        <span key={k} className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{k}:</span> {String(v)}
        </span>
      ))}
    </div>
  );
}

// MyApprovalsPage shows two stacked lists, plus a "New Request" button that
// opens the dynamic-form raise modal.
export default function MyApprovalsPage() {
  const { labelFor } = useProcessTypes(true);
  const [pending, setPending] = useState<(ApprovalRequest & { payload?: string })[]>([]);
  const [mine, setMine] = useState<(ApprovalRequest & { payload?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaise, setShowRaise] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([
      approvalRequestsAPI
        .pending()
        .then((r) => setPending(r.data?.data ?? []))
        .catch(() => setPending([])),
      approvalRequestsAPI
        .mine()
        .then((r) => setMine(r.data?.data ?? []))
        .catch(() => setMine([])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const act = async (id: string, approve: boolean) => {
    const comment = window.prompt(
      approve ? "Optional comment for approval:" : "Reason for rejection:",
      "",
    );
    if (comment === null) return;
    try {
      if (approve) {
        await apolloClient.mutate({
          mutation: APPROVE_REQUEST,
          variables: { id, comment: comment || undefined },
        });
      } else {
        await apolloClient.mutate({
          mutation: REJECT_REQUEST,
          variables: { id, comment: comment || undefined },
        });
      }
      toast.success(approve ? "Approved" : "Rejected");
      reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Could not record action");
    }
  };

  return (
    <div>
      <PageHeader
        title="My Approvals"
        subtitle="Requests waiting on you and the ones you've raised"
        actions={
          <button className="btn-primary" onClick={() => setShowRaise(true)}>
            <Plus size={16} /> New Request
          </button>
        }
      />

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Awaiting my approval
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">Nothing in your queue.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.title || `${labelFor(r.process)} request`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labelFor(r.process)} · Step {r.current_step}
                  </p>
                  <PayloadStrip payload={r.payload} />
                </div>
                <button
                  className="text-green-600 hover:text-green-800 p-1"
                  onClick={() => act(r.id, true)}
                  aria-label="Approve"
                  title="Approve"
                >
                  <Check size={18} />
                </button>
                <button
                  className="text-red-600 hover:text-red-800 p-1"
                  onClick={() => act(r.id, false)}
                  aria-label="Reject"
                  title="Reject"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          My requests
        </h2>
        {mine.length === 0 ? (
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">
              You haven't raised any approval requests yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div key={r.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.title || `${labelFor(r.process)} request`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labelFor(r.process)}
                    {r.status === "pending" ? ` · at step ${r.current_step}` : ""}
                  </p>
                  <PayloadStrip payload={r.payload} />
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background:
                      r.status === "approved"
                        ? "rgb(34 197 94 / 0.12)"
                        : r.status === "rejected"
                        ? "rgb(239 68 68 / 0.12)"
                        : "rgb(234 179 8 / 0.12)",
                    color:
                      r.status === "approved"
                        ? "rgb(22 163 74)"
                        : r.status === "rejected"
                        ? "rgb(220 38 38)"
                        : "rgb(202 138 4)",
                  }}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <RaiseRequestModal
        isOpen={showRaise}
        onClose={() => setShowRaise(false)}
        onSubmitted={reload}
      />
    </div>
  );
}
