"use client";

import Link from "next/link";
import { DocSection, Callout, DataModelERD } from "../ui";
import { TABLES, MODULES } from "../../db-visualizer/schema";
import { Database } from "lucide-react";

/** Chapter 7 — the data model overview, linking to the DB Visualizer. */
export default function DataModel() {
  return (
    <DocSection
      eyebrow="Chapter 7"
      title="Data Model"
      description={`The schema has ${TABLES.length} tables across ${MODULES.length} modules. Users are the join point: an Employee or a Student is a 1:1 profile on a User, and almost everything else hangs off those two.`}
    >
      <DataModelERD />

      <p className="text-sm text-foreground/85 leading-relaxed">
        The ERD above shows the core spine. The full schema — fees, hostel, transport, library,
        learning, payroll and the approval engine — is large, so it is best explored interactively.
      </p>

      <Link
        href="/super/db-visualizer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Database size={16} />
        Open the DB Visualizer
      </Link>

      <Callout variant="info" title="Conventions">
        Primary keys are string ids. Foreign-key columns end in{" "}
        <code className="font-mono text-xs">_id</code> and are indexed. Business uniqueness is
        enforced with composite unique indexes that include{" "}
        <code className="font-mono text-xs">tenant_id</code> (e.g. a course code is unique per
        tenant, not globally).
      </Callout>
    </DocSection>
  );
}
