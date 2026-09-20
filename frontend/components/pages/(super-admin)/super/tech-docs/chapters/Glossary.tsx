"use client";

import { DocSection } from "../ui";

const TERMS: { term: string; def: string }[] = [
  { term: "Tenant", def: "A customer institution. The root of data isolation; every business row carries its tenant_id." },
  { term: "Subdomain / slug", def: "The tenant's URL namespace, e.g. /acme/dashboard. Resolves which tenant a request belongs to." },
  { term: "Terminology layer", def: "Per-tenant label overrides (Student → Trainee, etc.) so the same platform can serve colleges, corporates and others." },
  { term: "Resolver", def: "A gqlgen function that fulfils a GraphQL query or mutation, grouped per module under backend/graph/." },
  { term: "requireAuth / requireRole", def: "Server-side guards run inside resolvers to enforce authentication and role-based access. super_admin passes every check; requireRole(\"admin\") also admits super_admin." },
  { term: "peepal_token", def: "The httpOnly cookie holding the signed access token (JWT, HS256, 15m by default). The only place it lives; JavaScript never reads it." },
  { term: "peepal_refresh", def: "The httpOnly cookie holding the refresh token (30d by default). POST /auth/refresh exchanges it for a new access token and rotates it; replaying a spent one revokes the whole session. Only its SHA-256 hash is stored server-side." },
  { term: "hasSession", def: "Frontend boolean backed by a non-secret peepal_session localStorage marker — a hint a cookie exists, not the token." },
  { term: "Access matrix", def: "Per-tenant table of View/Create/Edit/Delete flags per role per module. Stored sparsely as AccessRule rows; edited at /org/access-control." },
  { term: "AccessRule", def: "One row overriding a role's CRUD flags on one module. Absent = registry default (system roles) or no access (custom roles)." },
  { term: "Per-action gating", def: "accessFieldMiddleware maps each GraphQL root field to (module, verb) and enforces the matrix before the resolver runs." },
  { term: "Coarse vs fine module", def: "Coarse modules (fees, payroll…) are what a plan sells; fine page ids are what the matrix gates. defaultPageMap maps fine → coarse." },
  { term: "EffectiveModules", def: "The coarse modules a tenant may use: ModulesOverride if set, else the plan's Modules. Drives Stage-1 subscription gating." },
  { term: "Quota", def: "Plan caps on students/employees. Enforced in createStudent/createEmployee and bulk upload; surfaced by the QuotaBanner via GET /api/v1/quota." },
  { term: "Subscription", def: "A tenant's link to a plan (TenantSubscription). Login requires status active or trial; status also gates modules and quotas." },
  { term: "Approval flow", def: "A tenant-configured pipeline of ordered steps that a request walks before it is approved or rejected." },
  { term: "Approval request", def: "A live instance of a flow raised against a record; tracks current_step and overall status." },
  { term: "Fee structure", def: "A fee variation for a course/batch (Regular/NRI/…) holding per-year line items, allocated to students as StudentFee." },
  { term: "PostgreSQL (Aiven)", def: "The database. Accessed via the GORM postgres driver (pgx); the DSN comes from the DB_PATH env var. There is no SQLite anywhere in the stack." },
  { term: "AutoMigrate", def: "GORM's schema sync against PostgreSQL. Runs only when the backend is started with the --migrate flag." },
  { term: "Slice / thunk", def: "Redux Toolkit state module and its async action creator that performs a GraphQL call." },
];

/** Chapter 12 — quick reference glossary. */
export default function Glossary() {
  return (
    <DocSection
      eyebrow="Chapter 12"
      title="Glossary"
      description="The vocabulary you'll see across the codebase and these docs."
    >
      <dl className="divide-y divide-border rounded-xl border border-border bg-card">
        {TERMS.map((t) => (
          <div key={t.term} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-4 py-3">
            <dt className="text-sm font-bold text-foreground">{t.term}</dt>
            <dd className="text-sm text-muted-foreground leading-relaxed">{t.def}</dd>
          </div>
        ))}
      </dl>
    </DocSection>
  );
}
