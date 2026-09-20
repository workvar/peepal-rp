"use client";

import { DocSection, Callout, CodeBlock, StepList } from "../ui";

/** Chapter 11 — running it locally and shipping it. */
export default function DevOps() {
  return (
    <DocSection
      eyebrow="Chapter 11"
      title="Local Development & Deployment"
      description="How to get the stack running on your machine and the conventions to follow when changing the schema or shipping."
    >
      <h3 className="text-base font-bold text-foreground">Run it locally</h3>
      <CodeBlock language="bash" filename="backend (Go / Fiber)">{`cd backend
go mod tidy
go run main.go            # serves the API + GraphQL
# schema changes? run with the migrate flag:
go run main.go --migrate  # applies GORM AutoMigrate`}</CodeBlock>

      <CodeBlock language="bash" filename="frontend (Next.js)">{`cd frontend
npm install
npm run dev               # http://localhost:3000`}</CodeBlock>

      <Callout variant="warn" title="Migrations are opt-in">
        A normal restart does NOT run AutoMigrate. Pass <code className="font-mono text-xs">--migrate</code>{" "}
        when you add or change a model. Never <code className="font-mono text-xs">git checkout</code>{" "}
        or <code className="font-mono text-xs">restore</code> in this repo — the working tree is well
        ahead of HEAD and a checkout will destroy uncommitted schema work.
      </Callout>

      <Callout variant="tip" title="schema.ts stays in sync automatically">
        Running <code className="font-mono text-xs">--migrate</code> also regenerates the DB
        Visualizer's <code className="font-mono text-xs">schema.ts</code> from the models (best-effort,
        requires Node). You can also run it on its own from{" "}
        <code className="font-mono text-xs">frontend/</code> with{" "}
        <code className="font-mono text-xs">npm run gen:schema</code>.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">Adding a feature, the right way</h3>
      <StepList
        steps={[
          { title: "Model first", body: "Add or extend a struct in backend/models with tenant_id + indexes. Run with --migrate to apply." },
          { title: "GraphQL by default", body: "Add a resolver in backend/graph/<module>.resolvers.go. Only add REST if GraphQL genuinely can't serve the case." },
          { title: "Wire the client", body: "Add a Redux thunk in frontend/store/slices and a Page component under components/pages, imported by a thin route file." },
          { title: "Keep files small", body: "Split logic into focused files. A directory of 80-line files beats one 600-line file for debugging." },
        ]}
      />

      <Callout variant="info" title="GraphQL schema regeneration">
        The GraphQL schema file is generated from live introspection. Regenerate it from the running
        server rather than hand-editing, and keep resolvers grouped per module.
      </Callout>
    </DocSection>
  );
}
