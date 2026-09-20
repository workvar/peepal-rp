"use client";

import DocSection from "../../_shared/DocSection";

const terms: { term: string; def: string }[] = [
  { term: "Tenant",          def: "An institute. Identified by URL slug ([tenant]). Owns its own users, students, employees and settings." },
  { term: "Super Admin",     def: "Platform-level user. Creates tenants and plans; lives outside any single tenant." },
  { term: "Org Admin",       def: "The tenant's primary administrator — bootstraps the institute, creates users, configures everything." },
  { term: "Custom Role",     def: "Tenant-scoped role that adds extra permissions on top of a base role (admin/teacher/staff/student)." },
  { term: "Terminology",     def: "Per-tenant label map. Lets the same UI say Student / Member / Patient / Trainee depending on vertical." },
  { term: "Approval Type",   def: "A category of approval (Casual Leave, Expense, …). Has a default flow." },
  { term: "Approval Flow",   def: "Ordered list of steps. Each step picks an assignee dynamically (manager, role, named user)." },
  { term: "Approval Request",def: "A live instance of a flow — a real submission moving through the steps." },
  { term: "APIResponse",     def: "The single envelope every Go handler returns: { success, data, message, error }." },
  { term: "AutoMigrate",     def: "GORM call in Migrate(); runs on every Go boot. Adds new tables/columns; never drops." },
  { term: "Slice",           def: "Redux Toolkit reducer + actions. Lives under store/slices, one per concern." },
];

export default function GlossarySection() {
  return (
    <DocSection
      id="glossary"
      title="Glossary"
      description="Terms used across the codebase and in the rest of these docs."
    >
      <dl className="rounded-xl border border-border bg-card divide-y divide-border">
        {terms.map((t) => (
          <div key={t.term} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 p-4">
            <dt className="text-sm font-bold text-foreground">{t.term}</dt>
            <dd className="text-sm text-muted-foreground leading-relaxed">{t.def}</dd>
          </div>
        ))}
      </dl>
    </DocSection>
  );
}
