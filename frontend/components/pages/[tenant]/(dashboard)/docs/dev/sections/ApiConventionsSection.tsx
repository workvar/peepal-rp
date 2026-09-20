"use client";

import DocSection from "../../_shared/DocSection";
import CodeBlock from "../../_shared/CodeBlock";

const responseShape = `// utils.APIResponse — the only response shape we ever return
{
  "success": true,
  "data":    { /* anything */ },
  "message": "human-readable",
  "error":   ""        // populated on failure
}`;

const restShape = `# REST naming
GET    /api/v1/<resource>            list
POST   /api/v1/<resource>            create
GET    /api/v1/<resource>/:id        read
PUT    /api/v1/<resource>/:id        update (full)
PATCH  /api/v1/<resource>/:id/...    partial action (status, etc.)
DELETE /api/v1/<resource>/:id        delete

# Examples
GET  /api/v1/students
POST /api/v1/leaves
PATCH /api/v1/approval-requests/:id/approve`;

export default function ApiConventionsSection() {
  return (
    <DocSection
      id="api"
      title="API conventions"
      description="Two surfaces: REST (the original) and GraphQL (in flight). They sit side by side; new modules choose either depending on the query shape."
    >
      <CodeBlock language="json" filename="response shape">{responseShape}</CodeBlock>
      <CodeBlock language="bash" filename="REST routes">{restShape}</CodeBlock>

      <p className="text-sm text-muted-foreground">
        On the frontend, <code className="font-mono">lib/api.ts</code> wraps
        axios so you call <code className="font-mono">api.get(&quot;/students&quot;)</code> and
        get back the unwrapped <code className="font-mono">data</code> field
        (with errors thrown as <code className="font-mono">APIResponse</code> objects).
      </p>
    </DocSection>
  );
}
