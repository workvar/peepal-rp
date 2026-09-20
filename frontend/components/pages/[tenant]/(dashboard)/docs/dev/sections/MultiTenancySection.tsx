"use client";

import DocSection from "../../_shared/DocSection";
import MultiTenancyDiagram from "../../diagrams/MultiTenancyDiagram";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

export default function MultiTenancySection() {
  return (
    <DocSection
      id="multi-tenancy"
      title="Multi-tenancy"
      description="One database, one app, many institutes. Tenants are identified by URL slug ([tenant]) and enforced server-side via middleware."
    >
      <MultiTenancyDiagram />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Callout variant="info" title="Frontend">
          The dynamic <InlineKey>[tenant]</InlineKey> route segment is the
          slug. <InlineKey>tenants/lookup/:subdomain</InlineKey> resolves the
          slug to a tenant record before login.
        </Callout>
        <Callout variant="info" title="Backend">
          <InlineKey>middleware.Tenant</InlineKey> reads tenant_id from the JWT
          claims and stores it in <InlineKey>c.Locals</InlineKey>. Handlers must
          add it to every <InlineKey>WHERE</InlineKey>.
        </Callout>
      </div>

      <Callout variant="warn" title="Terminology layer">
        The same UI is used by colleges, schools, training centres and
        clinics. Per-tenant labels (Student / Member / Patient, …) come from{" "}
        <InlineKey>backend/models/terminology.go</InlineKey> and are loaded
        into <InlineKey>store/slices/terminologySlice</InlineKey> on login.
        Use <InlineKey>useTerminology()</InlineKey> instead of hard-coding
        domain words in the UI.
      </Callout>
    </DocSection>
  );
}
