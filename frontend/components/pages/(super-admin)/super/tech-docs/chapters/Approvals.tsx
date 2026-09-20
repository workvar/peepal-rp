"use client";

import { DocSection, Callout, ApprovalFlowDiagram, StepList, CodeBlock, StateChart } from "../ui";

/** Chapter 8 — the configurable approval engine, end to end. */
export default function Approvals() {
  return (
    <DocSection
      eyebrow="Chapter 8"
      title="The Approval Engine"
      description="Approvals are data-driven. Each tenant defines flows of ordered steps for a process (leave, fee waiver, etc.). When a record needs sign-off, a request walks the steps until it is fully approved or rejected."
    >
      <h3 className="text-base font-bold text-foreground">The five building blocks</h3>
      <CodeBlock language="text" filename="approval models">{`ApprovalProcessType  catalogue of approvable processes (builtin or custom)
ApprovalFlow         a named pipeline for one process (+ optional custom form fields)
ApprovalStep         one ordered step: who approves + optional condition
ApprovalRequest      a live instance raised against a record (tracks current_step + status)
ApprovalAction       an approve/reject decision recorded on a step, with a comment`}</CodeBlock>

      <ApprovalFlowDiagram />

      <h3 className="text-base font-bold text-foreground mt-2">Who can be a step approver</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        An <code className="font-mono text-xs">ApprovalStep</code> names its approver by{" "}
        <code className="font-mono text-xs">approver_type</code>: a specific user
        (<code className="font-mono text-xs">approver_user_id</code>), a role
        (<code className="font-mono text-xs">approver_role</code>), a department head
        (<code className="font-mono text-xs">approver_department_id</code>), or the requester's
        manager at a given <code className="font-mono text-xs">manager_level</code>. A step may also
        carry a condition (<code className="font-mono text-xs">condition_field / op / value</code>)
        so it only applies when the payload matches — e.g. only escalate leaves longer than 5 days.
      </p>

      <h3 className="text-base font-bold text-foreground mt-2">Runtime lifecycle</h3>
      <StepList
        steps={[
          { title: "Raise", body: "A record (e.g. a Leave) is submitted. The engine finds the active flow for that process and creates an ApprovalRequest with current_step = 1, status = pending." },
          { title: "Resolve approver", body: "For the current step the engine resolves the concrete approver (user / role members / dept head / manager chain) and surfaces the request in their My Approvals queue." },
          { title: "Record an action", body: "The approver approves or rejects, writing an ApprovalAction with their comment. A rejection ends the request immediately." },
          { title: "Advance or finish", body: "On approval, if more steps remain the engine increments current_step and repeats; otherwise status becomes approved and the underlying record is marked accordingly." },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-2">Request states</h3>
      <StateChart />

      <Callout variant="tip" title="Adding a new approvable process">
        Register an ApprovalProcessType, let admins build a flow for it in the Approval Flows UI,
        and on submit create an ApprovalRequest referencing your record via reference_id. The
        engine handles routing and queues — you only react to the final approved/rejected status.
      </Callout>
    </DocSection>
  );
}
