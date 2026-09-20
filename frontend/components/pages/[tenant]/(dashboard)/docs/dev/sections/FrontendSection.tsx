"use client";

import DocSection from "../../_shared/DocSection";
import CodeBlock from "../../_shared/CodeBlock";
import StateChart from "../../diagrams/StateChart";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

const pageRouter = `// app/[tenant]/(dashboard)/students/page.tsx
export { default } from "@/components/pages/[tenant]/(dashboard)/students/Page";`;

const apiSnippet = `// frontend/lib/api.ts (shape only)
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

api.interceptors.request.use((cfg) => {
  const token = store.getState().auth.token;
  if (token) cfg.headers.Authorization = \`Bearer \${token}\`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) store.dispatch(logout());
    return Promise.reject(err.response?.data ?? err);
  },
);`;

export default function FrontendSection() {
  return (
    <DocSection
      id="frontend"
      title="Frontend (Next.js · Redux · Apollo)"
      description="App Router with two top-level groups: (super-admin) for platform owners and [tenant] for everything else. The (dashboard) sub-group hosts the authed app."
    >
      <h3 className="text-base font-bold text-foreground mb-2">The thin route file</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Every page in <InlineKey>app/[tenant]/(dashboard)</InlineKey> is one
        line — a re-export. Real logic lives under <InlineKey>components/pages/...</InlineKey>{" "}
        so it can be split into many small components.
      </p>
      <CodeBlock language="tsx" filename="app/[tenant]/(dashboard)/students/page.tsx">{pageRouter}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">HTTP layer</h3>
      <CodeBlock language="ts" filename="frontend/lib/api.ts">{apiSnippet}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Redux store</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Redux holds chrome-level state — auth, terminology, org profile,
        notifications. Per-feature data has migrated to Apollo&apos;s normalised
        cache (employees, students, marks, leaves, …).
      </p>
      <StateChart />

      <Callout variant="tip" title="Where to put new state">
        If the data is shared across modules and rarely changes (org profile,
        terminology) → Redux slice. If it&apos;s per-feature and refetchable →
        Apollo query directly inside the page.
      </Callout>
    </DocSection>
  );
}
