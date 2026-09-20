"use client";

import { DocSection, Callout, CodeBlock, StepList } from "../ui";
import AccessEnforcementDiagram from "../AccessEnforcementDiagram";

/** Chapter 5 — the role access matrix and per-action gating. */
export default function AccessControl() {
  return (
    <DocSection
      eyebrow="Chapter 5"
      title="Access Control & Per-Action Gating"
      description="On top of the base roles, each tenant has a role access matrix: every role gets View / Create / Edit / Delete flags per module. Enforcement is per-action — each GraphQL operation declares the module and verb it needs, and is denied unless the caller's effective access permits that exact verb."
    >
      <h3 className="text-base font-bold text-foreground">The four pieces</h3>
      <CodeBlock language="text" filename="access model">{`AccessModules   registry of access-controllable modules (id, label, group, default roles)
AccessAction    the four CRUD verbs: view · create · edit · delete
AccessRule      a per-tenant row overriding one role's flags on one module (sparse)
AccessFlags     the {view,create,edit,delete} booleans, with Can(action) + Or(union)`}</CodeBlock>

      <p className="text-sm text-foreground/85 leading-relaxed">
        Rules are <strong>sparse</strong>: a row exists only when an admin moves a
        (role, module) pair away from its built-in default. With no row, the effective access
        falls back to the registry default for system roles, or to <em>no access</em> for custom
        roles.
      </p>

      <h3 className="text-base font-bold text-foreground mt-2">How a call is gated</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        A gqlgen field middleware (<code className="font-mono text-xs">accessFieldMiddleware</code>,
        wired via <code className="font-mono text-xs">srv.AroundFields</code>) runs on every root
        field. If the field is in the <code className="font-mono text-xs">opAccess</code> map it runs
        two gates in order before the resolver: <strong>Stage 1</strong>,{" "}
        <code className="font-mono text-xs">enforceSubscriptionModule</code> — is the module part of
        the tenant's plan? — then <strong>Stage 2</strong>,{" "}
        <code className="font-mono text-xs">enforceAccess(module, action)</code> — does the role's
        matrix permit this verb?
      </p>

      <AccessEnforcementDiagram />

      <StepList
        steps={[
          { title: "Stage 1 — subscription", body: "enforceSubscriptionModule blocks modules the org didn't buy. It binds everyone in the org INCLUDING admins; only super_admin and 'core' modules (users, org, departments, …) skip it. Details in the next chapter." },
          { title: "Stage 2 — admins bypass", body: "For the role matrix, admin and super_admin are never restricted — it only narrows the other roles." },
          { title: "Stored rule wins", body: "For the caller's system role + module, a stored AccessRule overrides the registry default; otherwise the default flags apply." },
          { title: "Check the verb", body: "If those flags permit the requested action, the call proceeds." },
          { title: "Custom-role union", body: "If the base role is denied, a linked custom role's rule may still grant that verb (the two are OR-ed). Otherwise the call is rejected with ErrForbidden." },
        ]}
      />

      <Callout variant="warn" title="The matrix tightens, it never loosens">
        Existing <code className="font-mono text-xs">requireRole(...)</code> guards stay in place as
        a floor. The matrix can restrict access below the historical role defaults but can never
        grant past a resolver's own guard — defence in depth, not a replacement.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">Declaring a gated operation</h3>
      <CodeBlock language="go" filename="backend/graph/access_enforce.go">{`var opAccess = map[string]struct {
    Module string
    Action models.AccessAction
}{
    "createStudent": {"students", models.ActionCreate},
    "updateStudent": {"students", models.ActionEdit},
    "deleteStudent": {"students", models.ActionDelete},
    // ...one entry per gated query/mutation
}`}</CodeBlock>

      <Callout variant="info" title="What is intentionally NOT mapped">
        Self-service operations (<code className="font-mono text-xs">applyLeave</code>,{" "}
        <code className="font-mono text-xs">submitQuiz</code>, <code className="font-mono text-xs">my*</code>{" "}
        queries) are governed by their own owner checks, so a module default never blocks a user
        acting on their own data. A few list queries that feed cross-page dropdowns are left
        view-unenforced on the server (their VIEW is gated on the client instead) — but their{" "}
        writes are always enforced.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">The frontend mirror</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        The same flags drive the UI via the <code className="font-mono text-xs">myAccess</code> map
        (Redux <code className="font-mono text-xs">accessSlice</code>). The sidebar and{" "}
        <code className="font-mono text-xs">RouteGuard</code> hide pages a role can't view; the{" "}
        <code className="font-mono text-xs">&lt;Can&gt;</code> component (backed by{" "}
        <code className="font-mono text-xs">useAccess().canDo</code>) hides action buttons. The
        server stays the source of truth — the client only avoids showing what would be rejected.
      </p>
      <CodeBlock language="tsx" filename="hiding an action button">{`<Can module="students" action="create">
  <button className="btn-primary">Add Student</button>
</Can>`}</CodeBlock>

      <Callout variant="tip" title="Editing the matrix">
        Admins manage all this at <code className="font-mono text-xs">/org/access-control</code>.
        The <code className="font-mono text-xs">accessMatrix</code> query (admin-only) returns every
        role column for the editor; <code className="font-mono text-xs">myAccess</code> returns just
        the current user's effective flags for guards and buttons. The{" "}
        <strong>Admin column is hard-fixed at full access</strong> and cannot be edited, so an admin
        can never lock themselves out. Stage 1 (the subscription module gate) is covered next.
      </Callout>
    </DocSection>
  );
}
