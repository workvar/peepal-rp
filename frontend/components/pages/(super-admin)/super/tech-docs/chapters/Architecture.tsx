"use client";

import { DocSection, Callout, ArchitectureDiagram, RepoStructureTree } from "../ui";

/** Chapter 2 — high-level system architecture and repo layout. */
export default function Architecture() {
  return (
    <DocSection
      eyebrow="Chapter 2"
      title="System Architecture"
      description="Three tiers: a Next.js client, a Go/Fiber API server exposing GraphQL (plus a thin REST surface), and a PostgreSQL database accessed through GORM."
    >
      <ArchitectureDiagram />

      <p className="text-sm text-foreground/85 leading-relaxed">
        The browser renders React Server/Client components and holds UI state in Redux Toolkit.
        Data fetching goes over GraphQL to the Fiber server, which resolves queries and mutations
        through gqlgen resolvers. Resolvers call into service/model code that uses GORM to read and
        write Postgres. A small set of REST routes remains for login, terminology, super-admin and
        bulk CSV upload where GraphQL is a poor fit.
      </p>

      <Callout variant="info" title="Why two APIs">
        GraphQL gives the frontend a single typed endpoint and avoids over-fetching across the
        many modules. REST is kept only where streaming, file upload or cookie-setting auth flows
        are simpler with a plain HTTP handler.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">Repository layout</h3>
      <RepoStructureTree />
    </DocSection>
  );
}
