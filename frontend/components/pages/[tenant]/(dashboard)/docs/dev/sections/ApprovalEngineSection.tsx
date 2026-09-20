"use client";

import DocSection from "../../_shared/DocSection";
import ApprovalFlowDiagram from "../../diagrams/ApprovalFlowDiagram";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

export default function ApprovalEngineSection() {
  return (
    <DocSection
      id="approvals"
      title="Approval engine"
      description="A generic state-machine that powers leaves, expense claims and any other multi-step approval. Step targets are resolved at runtime."
    >
      <ApprovalFlowDiagram />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { k: "ApprovalType",     v: "Defines the category (e.g. Casual Leave). Lives in /approval-types." },
          { k: "ApprovalFlow",     v: "Ordered list of steps for a type. Configured in /approval-flows." },
          { k: "ApprovalRequest",  v: "An instance: requester, payload, current step, status." },
          { k: "Step.target",      v: "manager · role · specific_user · department_head." },
          { k: "Engine",           v: "approval_engine.go advances the request to the next assignee." },
          { k: "Callbacks",        v: "approval_callbacks.go fires per-type side-effects on approve/reject." },
        ].map((r) => (
          <div key={r.k} className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-mono text-primary mb-1">{r.k}</div>
            <div className="text-xs text-muted-foreground">{r.v}</div>
          </div>
        ))}
      </div>

      <Callout variant="tip" title="Adding a new approval type">
        Create the <InlineKey>ApprovalType</InlineKey>, design a default flow
        in the UI, then register a callback in{" "}
        <InlineKey>handlers/approval_callbacks.go</InlineKey> if you need a
        side-effect on approve (e.g. deduct leave balance).
      </Callout>
    </DocSection>
  );
}
