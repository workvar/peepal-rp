# CollERP Feature-Gap Build — Technical Plan (Overview)

Per-phase implementation specs for the 7-phase gap plan (`feature-gap-phase-plan.md`).
Each phase doc is self-contained and hand-off ready. Read this overview first for the
shared conventions every phase reuses, then work the phase docs in sequence.

## Phase docs

| # | Doc | Module(s) | Effort | Depends on |
|---|-----|-----------|--------|-----------|
| 1 | [phase-1-qr-barcode.md](phase-1-qr-barcode.md) | QR/barcode service | ~1 wk | none |
| 2 | [phase-2-procurement-inventory.md](phase-2-procurement-inventory.md) | vendors, POs, invoices, drug batches | ~3-4 wk | existing inventory/pharmacy |
| 3 | [phase-3-financial-accounting.md](phase-3-financial-accounting.md) | chart of accounts, GL, AP, AR | ~4-6 wk | Phase 2, fees/billing/payroll |
| 4 | [phase-4-clinical-enhancements.md](phase-4-clinical-enhancements.md) | referral commission, duty roster, UHID, test templates | ~3 wk | Phase 3, lab/referral/encounter |
| 5 | [phase-5-exam-cell.md](phase-5-exam-cell.md) | question bank, paper gen, hall tickets | ~4 wk | Phase 1 (QR), exam-types/curriculum |
| 6 | [phase-6-student-life-campus-ops.md](phase-6-student-life-campus-ops.md) | assignments, mess/canteen, transport GPS | ~3-4 wk | Phase 2 (mess procurement) |
| 7 | [phase-7-sms.md](phase-7-sms.md) | SMS gateway + dispatch | ~1-2 wk | none |

**Sequencing:** 1 → 2 → 3, then 4/5/6 in parallel, 7 last (slots into any gap).
Phase 1 unblocks Phase 5 hall tickets; Phase 2 unblocks Phase 3 AP and Phase 6 mess;
Phase 3 unblocks Phase 4 commission payouts.

## Shared conventions (apply to every phase)

The codebase has one house style for a GraphQL module. Each phase doc assumes it and
only calls out deviations. Reference implementations to copy: **exam-types** (simple CRUD,
full stack) and **inventory** (stock ledger).

### Backend — the 8-step module recipe

1. **Model** — `backend/models/<module>.go`, `package models`. Every model:
   - `ID string` UUID primary key (`gorm:"primaryKey"`), **never** `uint` or `gorm.Model`.
   - `TenantID string \`gorm:"not null;index"\`` as the first field after `ID`.
   - Per-tenant natural keys join a composite `uniqueIndex:idx_<x>` (see `ExamType`).
   - FKs as an id string + struct pair: `FooID string \`gorm:"index"\`` and
     `Foo Foo \`gorm:"foreignKey:FooID" json:"foo,omitempty"\``. **No DB-level FK
     constraints exist** (migration disables them), so validate refs in code.
   - Enum-ish fields = plain `string` + exported package `const` set + `gorm:"default:'…'"`.
   - Day-granular dates stored as `string` `"YYYY-MM-DD"`; timestamps as `time.Time`
     `CreatedAt` / `UpdatedAt`. **No soft delete** (`DeletedAt`) anywhere; deletes are hard.
   - `BeforeCreate(tx *gorm.DB) error` hook assigning `uuid.NewString()` when `ID == ""`.
2. **AutoMigrate** — append every new model pointer to the `AutoMigrate(...)` list in
   `backend/database/database.go` `Migrate()`. Raw partial unique indexes (for
   "one active X per person") go right after via `migrateDB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS …")`.
   New models require the backend restarted with the **`--migrate` flag** (normal restart skips AutoMigrate).
3. **Schema** — add types / inputs / `Query` / `Mutation` members to the single
   `backend/graph/schema.graphqls` (monolith, banner-commented per module). Timestamps
   are `String` (RFC3339); Create inputs use `!` on required fields, Update inputs make
   everything optional.
4. **Resolvers** — `backend/graph/<module>.resolvers.go`, `package graph`, methods on
   `*queryResolver` / `*mutationResolver`. Rules:
   - Every DB call `r.DB.WithContext(ctx)`.
   - **Tenant scoping is manual and mandatory:** `Where("tenant_id = ?", auth.TenantID)`
     (or `"id = ? AND tenant_id = ?"`) on every read/update/delete.
   - Gate at top: `requireAuth(ctx)` (reads), `requireRole(ctx, roleAdmin[, …])` (writes),
     `requireSuperAdmin(ctx)` (platform only). Super-admin & admin pass any `requireRole`.
   - Updates build a `map[string]interface{}` of only non-nil pointer fields →
     `.Model(&models.X{}).Where("id = ? AND tenant_id = ?", …).Updates(m)`;
     `RowsAffected == 0` → `ErrNotFound`. Deletes return `(bool, error)` = `RowsAffected > 0`.
   - Errors: `ErrNotFound`, `ErrForbidden`, `GQLErr("user-facing message")` (→ `VALIDATION_ERROR`).
   - One `xxxToModel(m models.X) *model.X` converter at the file bottom; timestamps via
     `m.CreatedAt.Format(time.RFC3339)` / `rfc3339OrNil`.
   - Then run `backend/regen.sh` (gqlgen's duplicate-resolver failure is expected & ignored;
     the script resets `graph/schema.resolvers.go` to its committed stub and runs `go build`).
5. **Access matrix** — register the fine module in `backend/models/access_registry.go`
   `AccessModules` (`{id, label, group, defaultRoles}`); map fine→coarse subscription module
   in `backend/models/subscription_modules.go` `defaultPageMap`; tag industry in
   `backend/models/access_industries.go` `moduleIndustries` if vertical-specific; add **each
   root field** to `opAccess` in `backend/graph/access_enforce.go`
   (`{Module, models.ActionView|Create|Edit|Delete}`). Omit read queries that feed
   cross-page dropdowns so revoking a page never breaks an unrelated list; their writes stay enforced.
6. **Bulk (optional)** — `backend/handlers/bulk/schema_<resource>.go` with `init(){Register(...)}`;
   resolve dropdown/FK cells via `backend/handlers/bulk/reference_lookups.go`. No route change needed.
7. **PDF (optional)** — loader in `backend/graph/pdf_exports.go` → template in
   `backend/pdf-template/<doc>.go` (uses `NewDoc()` block renderer) → handler in `backend/handlers/`
   (`streamPDF`) → role-guarded REST route in `backend/routes/routes.go`. PDFs are the only
   sanctioned REST additions (binary streaming); everything else is GraphQL.
8. **Cascade** — if the model is per-person, extend `backend/graph/cascade_delete.go`
   (`deleteEmployeeCascade` / `deleteStudentCascade`): **delete** owned rows, **blank the FK**
   on shared/historical rows, both scoped `… AND tenant_id = ?`.

### Frontend — the module recipe (Apollo-only, no Redux slice)

Reference: `frontend/components/pages/[tenant]/(dashboard)/academic/exam-types/`.

1. **Route** — `app/[tenant]/(dashboard)/<module>/page.tsx` is a one-line re-export:
   `export { default } from "@/components/pages/[tenant]/(dashboard)/<module>/Page";`
2. **Components** — `frontend/components/pages/[tenant]/(dashboard)/<module>/` split into
   small files: `Page.tsx` (composition + `handleSave`), `use<Module>.ts` (Apollo hook that
   centralizes `refetchQueries`), `types.ts` (`Gql*` camelCase types + `*Form` snake_case
   string form types + `empty*Form`), `<X>Table.tsx`, `<X>Modal.tsx`.
3. **GraphQL docs** — `frontend/graphql/queries/<domain>.ts` and `mutations/<domain>.ts`,
   `SCREAMING_SNAKE` `gql` consts. Apollo client is cookie-auth (`credentials:"include"`) +
   `X-Tenant-ID` header; already wired in `lib/apollo.ts`.
4. **Access / nav** — add a row to `frontend/constants/navigation/modules.ts` `BASE_MODULES`
   and a `NavItem` to `frontend/components/layout/sidebar/navConfig.ts`; add the module id to
   `MODULE_INDUSTRIES` in `frontend/lib/access.ts` if vertical-specific (and `ROLE_LOCKED_MODULES`
   if it's a single-role self-service page). Gate action buttons with
   `<Can module="…" action="create|edit|delete">`. Route guard + sidebar visibility come free
   from `useAccess()`/`canViewHref`.
5. **Mapping** — no shared mapper. `gql → form` in the modal's seeding `useEffect`;
   `form → gql input` inline in the page's `handleSave`.

### Roles & industries

Roles: `admin, teacher, student, staff, super_admin, patient`. New finance/accounting pages
are admin-gated (an "accountant" concept is achieved via the access matrix + a custom role,
not a new system role). Education-vertical modules (exam cell, assignments, mess, transport)
tag `TenantTypeEducation`; clinical additions tag `TenantTypeHealthcare`; cross-cutting infra
(QR, SMS, finance) stays untagged (all industries).

### Definition of done (per phase)

Models migrate under `--migrate`; `regen.sh` + `go build ./...` clean; each new root field in
`opAccess`; module appears in access-control matrix and sidebar for the intended roles/industry;
frontend `npm run build` clean; cascade updated for per-person models; at least one resolver
unit test in the module's `_test.go` following `employees_resolvers_test.go` / `grading_logic_test.go`.
