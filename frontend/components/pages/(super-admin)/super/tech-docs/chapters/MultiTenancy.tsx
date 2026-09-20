"use client";

import { DocSection, Callout, MultiTenancyDiagram, CodeBlock } from "../ui";

/** Chapter 3 — how tenant isolation works. */
export default function MultiTenancy() {
  return (
    <DocSection
      eyebrow="Chapter 3"
      title="Multi-Tenancy"
      description="Every institution is a Tenant. All business data carries a tenant_id, and the URL is namespaced by the tenant subdomain/slug so one deployment serves many colleges in isolation."
    >
      <MultiTenancyDiagram />

      <p className="text-sm text-foreground/85 leading-relaxed">
        The frontend routes under <code className="font-mono text-xs">/[tenant]/…</code>; the
        super-admin console lives under <code className="font-mono text-xs">/super/…</code> and is
        the only area not scoped to a single tenant. On the backend, the authenticated user's
        tenant is resolved from the session and injected into every query so a tenant can never read
        another tenant's rows.
      </p>

      <CodeBlock language="go" filename="every business model">{`type Student struct {
    ID       string \`gorm:"primaryKey"\`
    TenantID string \`gorm:"not null;index"\` // <- scoping column on every table
    UserID   string \`gorm:"uniqueIndex;not null"\`
    // ...
}`}</CodeBlock>

      <Callout variant="warn" title="Golden rule">
        Never write a query without a tenant filter. Resolvers must constrain by the caller's
        tenant_id; forgetting it is the single most dangerous bug class in a multi-tenant app.
      </Callout>
    </DocSection>
  );
}
