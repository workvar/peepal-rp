"use client";

import DocSection from "../../_shared/DocSection";
import ApprovalFlowDiagram from "../../diagrams/ApprovalFlowDiagram";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";

export default function ApprovalsFeature() {
  return (
    <DocSection
      id="approvals"
      title="Approvals & flows"
      description="Multi-step approval chains for any request. Used by leaves, expense claims, and any custom workflow you define."
    >
      <ApprovalFlowDiagram />

      <h3 className="text-base font-bold text-foreground mb-2">Designing a flow (admin)</h3>
      <StepList
        steps={[
          { title: "Create or pick an Approval Type", body: "Approvals → Types. Examples: 'Casual Leave', 'Travel Expense', 'Outpass'." },
          { title: "Open Approval Flows", body: "Approvals → Flows. Click 'New Flow' for the type." },
          { title: "Add steps in order", body: "For each step pick an approver target — Manager, a specific Role (e.g. HOD), a named user, or department head." },
          { title: "Mark required vs. parallel", body: "Steps run sequentially by default. Toggle parallel if multiple approvers can act in any order." },
          { title: "Save", body: "From now on, any new request of that type follows this flow. Existing in-flight requests keep their original chain." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Acting on approvals</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Anything waiting on you appears under <em>My Approvals</em>. You can
        approve, reject (with comment), or delegate to another user. The
        requester gets a notification on every state change.
      </p>

      <Callout variant="tip" title="Audit trail">
        Every action — submit, approve, reject, delegate — is recorded with
        who/when/comment. The full trail is visible at the bottom of any
        request.
      </Callout>
    </DocSection>
  );
}
