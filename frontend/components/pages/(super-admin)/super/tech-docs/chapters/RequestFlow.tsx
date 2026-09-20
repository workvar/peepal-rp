"use client";

import { DocSection, Callout, RequestLifecycle, StepList, CodeBlock } from "../ui";

/** Chapter 9 — how one request travels client → GraphQL → DB and back. */
export default function RequestFlow() {
  return (
    <DocSection
      eyebrow="Chapter 9"
      title="Request Data Flow"
      description="Follow a single mutation from a button click in the browser to a row in Postgres and back into Redux. This is the path almost every feature follows."
    >
      <RequestLifecycle />

      <StepList
        steps={[
          { title: "Dispatch a thunk", body: "A component dispatches a Redux Toolkit async thunk from its slice (e.g. createStudent). The thunk builds a GraphQL operation." },
          { title: "Send over GraphQL", body: "The request hits POST /api/v1/graphql with the httpOnly cookie attached. No manual token handling is needed." },
          { title: "Resolve & guard", body: "gqlgen routes to the resolver. A field middleware enforces the per-action access matrix (module + verb), requireAuth/requireRole run as a floor, the tenant is pulled from the session, and inputs are validated. See Chapter 5." },
          { title: "Persist via GORM", body: "The resolver calls model/service code that reads or writes Postgres through GORM, always filtered by tenant_id." },
          { title: "Return typed data", body: "The resolver returns the typed GraphQL object; gqlgen serialises it back to the client." },
          { title: "Reduce into state", body: "The thunk's fulfilled case updates the slice; selectors re-render the UI. Errors flow to the rejected case." },
        ]}
      />

      <Callout variant="info" title="Where the layers live">
        Frontend slices sit in <code className="font-mono text-xs">frontend/store/slices/</code>;
        GraphQL resolvers in <code className="font-mono text-xs">backend/graph/</code> as per-module{" "}
        <code className="font-mono text-xs">&lt;module&gt;.resolvers.go</code> files; models in{" "}
        <code className="font-mono text-xs">backend/models/</code>.
      </Callout>

      <CodeBlock language="text" filename="one round trip">{`Component → dispatch(thunk) → GraphQL mutation
        → Fiber → gqlgen resolver → guard(tenant, role)
        → GORM → PostgreSQL
        ← typed result ← resolver ← thunk.fulfilled → Redux → re-render`}</CodeBlock>
    </DocSection>
  );
}
