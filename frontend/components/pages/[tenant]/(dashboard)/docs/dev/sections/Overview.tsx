"use client";

import DocSection from "../../_shared/DocSection";
import StatGrid from "../../_shared/StatGrid";
import Callout from "../../_shared/Callout";
import { Boxes, Server, Database, Layers } from "lucide-react";

/** First section of /docs/dev — what this codebase is and the headline numbers. */
export default function Overview() {
  return (
    <DocSection
      id="overview"
      eyebrow="Where to start"
      title="What is Peepal, technically?"
      description="A multi-tenant ERP for educational institutes (colleges, schools, training centres). The same deployment can be re-skinned with terminology layers to serve corporate L&D, healthcare and non-profits."
    >
      <StatGrid
        cols={4}
        stats={[
          { label: "Frontend",    value: "Next.js 14",  icon: Layers,  hint: "App Router · TS · Tailwind" },
          { label: "Backend",     value: "Go + Fiber",  icon: Server,  hint: "REST + GraphQL (gqlgen)" },
          { label: "Database",    value: "PostgreSQL",  icon: Database, hint: "Aiven · GORM (pgx)" },
          { label: "Modules",     value: "30+",         icon: Boxes,   hint: "People · Academics · Finance · Campus" },
        ]}
      />

      <Callout variant="info" title="One mental model">
        Every page in the app maps 1-to-1 to a directory under{" "}
        <code className="font-mono">app/[tenant]/(dashboard)</code> and a Go
        handler in <code className="font-mono">backend/handlers</code>. If you can find
        the handler, you can find the page — and vice versa.
      </Callout>

      <Callout variant="tip" title="Reading order">
        Start with <em>Tech stack → Repo structure → Architecture</em>. Then
        jump to whatever module you&apos;re editing — they all follow the same
        shape, so understanding one teaches you all of them.
      </Callout>
    </DocSection>
  );
}
