"use client";

import DocSection from "../../_shared/DocSection";
import InlineKey from "../../_shared/InlineKey";

const rows: { layer: string; choice: string; why: string }[] = [
  { layer: "UI Framework",     choice: "Next.js 14 (App Router)",  why: "File-based routing per tenant, RSC-ready, vercel-friendly" },
  { layer: "Language",         choice: "TypeScript",                why: "Strict types across pages, store and GraphQL bindings" },
  { layer: "Styling",          choice: "Tailwind + CSS variables", why: "Semantic tokens (bg-card, text-foreground) drive the theme" },
  { layer: "State (global)",   choice: "Redux Toolkit",             why: "Auth, terminology, org chrome — anything cross-page" },
  { layer: "State (server)",   choice: "Apollo Client",             why: "Per-feature data lives in normalised cache, not Redux" },
  { layer: "HTTP client",      choice: "axios + interceptors",      why: "JWT injection, error normalisation in lib/api.ts" },
  { layer: "API",              choice: "Go · Fiber v2",             why: "Tiny, fast, ergonomic router; matches REST + GraphQL needs" },
  { layer: "GraphQL",          choice: "gqlgen",                    why: "Schema-first, generated resolvers in backend/graph" },
  { layer: "ORM",              choice: "GORM v2",                   why: "AutoMigrate keeps the PostgreSQL schema in sync; run with --migrate" },
  { layer: "Database",         choice: "PostgreSQL (Aiven)",        why: "Cloud Postgres via the GORM postgres driver (pgx)" },
  { layer: "Auth",             choice: "JWT + bcrypt",              why: "Stateless, role-aware, 24h tokens" },
  { layer: "Process manager",  choice: "PM2 (ecosystem.config.js)", why: "Same config front + back; zero-downtime reloads" },
];

/** Tech-stack table with rationale. */
export default function TechStack() {
  return (
    <DocSection
      id="tech-stack"
      title="Tech stack"
      description="Every choice is boring on purpose — predictable libraries, small surface area, no exotic frameworks."
    >
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Layer</th>
              <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Choice</th>
              <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.layer} className="border-t border-border/60">
                <td className="py-2.5 px-4 text-foreground font-semibold">{r.layer}</td>
                <td className="py-2.5 px-4"><InlineKey>{r.choice}</InlineKey></td>
                <td className="py-2.5 px-4 text-muted-foreground">{r.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocSection>
  );
}
