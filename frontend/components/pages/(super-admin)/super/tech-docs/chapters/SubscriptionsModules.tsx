"use client";

import { DocSection, Callout, CodeBlock, StepList, StatGrid } from "../ui";
import { Boxes, Layers, Users, ShieldCheck } from "lucide-react";

/** Chapter 6 — subscriptions, module management and quotas. */
export default function SubscriptionsModules() {
  return (
    <DocSection
      eyebrow="Chapter 6"
      title="Subscriptions, Modules & Quotas"
      description="A plan decides two things for a tenant: which feature modules it may use, and how many students and employees it may create. The super-admin console manages plans and the module catalogue; enforcement happens at login, in the GraphQL field middleware, and at create time."
    >
      <StatGrid
        cols={4}
        stats={[
          { label: "Coarse modules", value: "ALL_MODULES", icon: Boxes, hint: "what a plan sells (e.g. fees, payroll)" },
          { label: "Fine pages", value: "access ids", icon: Layers, hint: "matrix modules, mapped to coarse" },
          { label: "Quota resources", value: "students · employees", icon: Users, hint: "per-plan caps" },
          { label: "Enforced at", value: "3 points", icon: ShieldCheck, hint: "login · field middleware · create" },
        ]}
      />

      <h3 className="text-base font-bold text-foreground">Plans &amp; subscriptions</h3>
      <CodeBlock language="go" filename="models/subscription.go">{`SubscriptionPlan      MaxStudents, MaxEmployees, Modules (CSV of coarse modules)
TenantSubscription    one per tenant — Status, dates, *Override fields, ModulesOverride

// "effective" = override if set, else the plan's value:
EffectiveModules()      → ModulesOverride ?? Plan.Modules
EffectiveMaxStudents()  → StudentsOverride ?? Plan.MaxStudents
EffectiveMaxEmployees() → EmployeesOverride ?? Plan.MaxEmployees`}</CodeBlock>
      <p className="text-sm text-foreground/85 leading-relaxed">
        A super-admin assigns a subscription via{" "}
        <code className="font-mono text-xs">POST /api/v1/super/subscriptions</code> (
        <code className="font-mono text-xs">AssignSubscription</code>). It upserts the tenant's row
        and stores <code className="font-mono text-xs">ModulesOverride</code> exactly as sent: a
        non-empty CSV restricts the org to those modules; an empty string means "use the plan's
        modules". It deliberately does <strong>not</strong> auto-seed an override — doing so once
        made every org look permanently overridden and silently restricted.
      </p>

      <Callout variant="warn" title="Login depends on it">
        Non-super-admins can only log in when their <code className="font-mono text-xs">TenantSubscription</code>{" "}
        status is <code className="font-mono text-xs">active</code> or{" "}
        <code className="font-mono text-xs">trial</code> (<code className="font-mono text-xs">SubscriptionLoginAllowed</code>).
        That check sits in the login handler, before any session is issued.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">Coarse modules vs. fine pages</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        A plan sells <em>coarse</em> modules (<code className="font-mono text-xs">fees</code>,{" "}
        <code className="font-mono text-xs">payroll</code>,{" "}
        <code className="font-mono text-xs">reports</code>, …). The access matrix works in{" "}
        <em>fine</em> page ids (<code className="font-mono text-xs">fee-categories</code>,{" "}
        <code className="font-mono text-xs">reports-fees</code>,{" "}
        <code className="font-mono text-xs">salary-templates</code>, …).{" "}
        <code className="font-mono text-xs">defaultPageMap</code> collapses fine → coarse. A fine id
        that isn't in the map is a <strong>core</strong> page (users, org, departments,
        academic-years, calendar, approvals) and is never subscription-gated — only the role matrix
        applies to it.
      </p>
      <CodeBlock language="go" filename="models/subscription_modules.go (excerpt)">{`var defaultPageMap = map[string]string{
    "fee-categories":  "fees",
    "reports-fees":    "reports",
    "salary-templates":"payroll",
    "attendance-summary":"attendance",
    // ...fine page id  →  coarse subscription module
}
// SubscriptionModuleForAccess("") == ""  → core, always allowed`}</CodeBlock>
      <p className="text-sm text-foreground/85 leading-relaxed">
        Stage 1 of the field middleware calls{" "}
        <code className="font-mono text-xs">enforceSubscriptionModule</code>, which uses{" "}
        <code className="font-mono text-xs">TenantAllowsAccessModule</code>: core pages and tenants
        with no subscription always pass; otherwise the page's coarse module must be in{" "}
        <code className="font-mono text-xs">EffectiveModules</code>. This binds{" "}
        <strong>admins too</strong> — a feature the org didn't buy is unavailable regardless of role
        — and only super_admin is exempt. In parallel, the{" "}
        <code className="font-mono text-xs">myAccess</code> resolver zeroes the flags of any
        non-subscribed module, so the sidebar and route guard hide those pages for everyone.
      </p>

      <h3 className="text-base font-bold text-foreground mt-2">The Module Configurator</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        Super-admins curate the catalogue at{" "}
        <code className="font-mono text-xs">/super/modules</code> (backed by{" "}
        <code className="font-mono text-xs">/api/v1/super/module-config/*</code>). Two things are
        editable, and changes apply live — no redeploy.
      </p>
      <StepList
        steps={[
          { title: "Module catalogue", body: <>ModuleCatalog rows are the coarse modules a plan can sell. The <code className="font-mono text-xs">Key</code> is immutable; the <code className="font-mono text-xs">Label</code> is renamable.</> },
          { title: "Page mapping", body: <>ModulePageMap maps each fine page to a coarse key (<code className="font-mono text-xs">""</code> marks a page as core). The sentinel <code className="font-mono text-xs">__unassigned__</code> parks a page so it stays hidden from all tenants until mapped.</> },
          { title: "Live cache", body: <>A read-write-mutex cache (<code className="font-mono text-xs">cachedPageMap</code> / <code className="font-mono text-xs">cachedCatalog</code>) is seeded from ALL_MODULES + defaultPageMap, overlaid with DB rows, and refreshed after every write so gating updates instantly.</> },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-2">Quotas (headcount limits)</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        The plan caps <code className="font-mono text-xs">MaxStudents</code> and{" "}
        <code className="font-mono text-xs">MaxEmployees</code> (a value of 0 or less means
        unlimited; a tenant with no subscription is never blocked).
      </p>
      <StepList
        steps={[
          { title: "Create-time (GraphQL)", body: <><code className="font-mono text-xs">enforceResourceQuota</code> runs inside <code className="font-mono text-xs">createStudent</code> / <code className="font-mono text-xs">createEmployee</code> and rejects with a full message when the tenant is at its cap.</> },
          { title: "Bulk upload (REST)", body: <>The bulk handler computes <code className="font-mono text-xs">remaining = limit − current</code> and fails any rows beyond it, mirroring the GraphQL reject.</> },
          { title: "Visibility", body: <><code className="font-mono text-xs">GET /api/v1/quota</code> is readable by any authenticated tenant user (counts/limits only, no billing). The persistent, non-dismissible <code className="font-mono text-xs">QuotaBanner</code> renders when there is a breach.</> },
        ]}
      />

      <Callout variant="info" title="Why these are REST, not GraphQL">
        Subscription assignment, module-config and quota-status are REST endpoints. They are
        super-admin / cross-cutting surfaces (and assignment is a super-admin-only console action),
        which is the same carve-out that keeps auth-login, terminology and bulk upload on REST while
        everything tenant-facing defaults to GraphQL.
      </Callout>
    </DocSection>
  );
}
