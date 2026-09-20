"use client";

import Link from "next/link";
import { DocSection, Callout, StatGrid } from "../ui";
import { TABLES } from "../../db-visualizer/schema";
import { Boxes, Server, Database, Layers } from "lucide-react";

/** Chapter 1 — what Peepal is and how to read these docs. */
export default function Introduction() {
  return (
    <DocSection
      eyebrow="Chapter 1"
      title="Introduction & Onboarding"
      description="Peepal is a multi-tenant ERP for educational institutions: it manages employees, students, academics, attendance, marks, fees, hostel, transport, library, learning, payroll and a configurable approval engine — all under one tenant-isolated platform."
    >
      <p className="text-sm text-foreground/85 leading-relaxed">
        This guide is written for a developer joining the team. Read it top to bottom: each
        chapter builds on the previous one. By the end you should understand how a request
        travels from the browser to the database, how data is isolated per institution, how
        approvals are configured and executed, and where to find each module in the codebase.
      </p>

      <StatGrid
        cols={4}
        stats={[
          { label: "Frontend", value: "Next.js 14", icon: Layers, hint: "App Router · TypeScript · Redux Toolkit · Tailwind" },
          { label: "Backend", value: "Go + Fiber", icon: Server, hint: "gqlgen GraphQL (default) · REST for a few cases" },
          { label: "Database", value: "PostgreSQL", icon: Database, hint: `Aiven · GORM/pgx · ${TABLES.length} tables` },
          { label: "Model", value: "Multi-tenant", icon: Boxes, hint: "Every row scoped by tenant_id" },
        ]}
      />

      <Callout variant="tip" title="The two companion tools in this console">
        The <strong>Technical Docs</strong> (this page) explain the system in prose and
        diagrams. The{" "}
        <Link href="/super/db-visualizer" className="text-primary font-semibold hover:underline">
          DB Visualizer
        </Link>{" "}
        renders every table and relationship on a pannable canvas. Keep both open while you
        onboard.
      </Callout>

      <Callout variant="info" title="GraphQL-first">
        New backend work is added as gqlgen resolvers served at{" "}
        <code className="font-mono text-xs">POST /api/v1/graphql</code>. REST endpoints survive
        only for auth/login, terminology, super-admin and bulk upload. The frontend talks
        GraphQL, not axios-to-REST, for all net-new surface area.
      </Callout>
    </DocSection>
  );
}
