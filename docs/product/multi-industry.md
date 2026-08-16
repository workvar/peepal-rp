# Multi-Industry Platform (Phase 1)

StepElly runs multiple industries in parallel on one codebase. Every tenant
has a `Type` (education / corporate / healthcare / nonprofit, set by the
super-admin at tenant creation) and the platform scopes modules to it, so a
hospital and a college can coexist without seeing each other's features.

## How industry scoping works

One map drives everything: `backend/models/access_industries.go`
(`moduleIndustries`). A module listed there only exists for those industries;
unlisted modules (employees, leaves, attendance, payroll, events, …) are
shared by all. The frontend mirrors it in `MODULE_INDUSTRIES`
(`frontend/lib/access.ts`) so nav decisions are correct before `myAccess`
loads.

Enforcement happens in three layers, all keyed off the tenant's canonical
type:

1. `MyAccess` (backend/graph/access.resolvers.go) forces out-of-industry
   modules to all-false, which hides them from the sidebar, dashboard tiles,
   global search, and the route guard for everyone — admins included.
2. `AccessMatrix` omits them, so the access-control editor only shows the
   tenant's own modules.
3. `accessFieldMiddleware` (backend/graph/access_enforce.go) rejects their
   GraphQL operations outright via `enforceIndustryModule`, before the
   subscription and role-matrix checks.

Education-only modules include students, marks, subjects, exams, curriculum,
grading, timetable, fees, hostel, transport, library, the student portal, and
the roll-number-shaped attendance pages (`attendance-summary`,
`attendance-shortage`, `attendance-export`).
Healthcare-only modules are patients, appointments, and encounters.

## Terminology: no education wording outside education

Module scoping hides whole pages, but shared pages still have to *speak* the
tenant's language. That is the terminology layer
(`backend/models/terminology_defaults.go`, mirrored bundle-side in
`frontend/constants/terminology/`). A hospital admin must never read the words
"Student", "Teacher", "Semester", "Campus" or "Academic Year" anywhere.

Beyond the original nouns (member / staff / department / course), the map
carries:

- `session`, `cohort`, `term`, `year` — Class/Batch/Semester/Academic Year in
  education; Shift/Unit/Cycle/Financial Year in healthcare.
- `role_staff`, `role_member`, `role_support` (+ plurals) — display names for
  the stored role ids. **Role ids never change**: they are always
  `admin/teacher/student/staff` in the database. Resolve them for display via
  `frontend/lib/roleLabels.ts` (`roleLabel`, `roleLabelPlural`, `roleOptions`),
  never by hardcoding a string.

Note that healthcare maps the `student` role to **Trainee**, not Patient —
patients have their own dedicated `patient` role, so reusing "Patient" would
collide.

New tokens are added to the Go struct and the four frontend bundles. They do
**not** need a gqlgen regen: `terminologySlice` merges the server payload over
the bundled defaults, so a token the GraphQL resolver does not return still
resolves from the bundle.

### Rules when touching shared UI

1. Never hardcode "Student", "Teacher", "Class", "Semester", "Campus" or
   "college.edu" in a page outside an education-only module. Pull the word
   from `useTerminology()`.
2. Never hardcode a role label. Use `roleLabel(role, t)`.
3. If a control offers a member-vs-employee choice (attendance filters, report
   entity type, bulk-upload pickers), gate it on
   `moduleAllowedForIndustry("students", tenantType)` and default to
   `employee` when it is false — otherwise the query returns an empty result
   for every non-education tenant.
4. If a sidebar section survives for other industries because it holds one
   shared module, relabel its header in
   `components/layout/sidebar/navSectionLabels.ts`.
5. **Every sidebar link must have an owning access module.** `canViewHref`
   resolves a link to its `BASE_MODULES` entry by deepest-`baseHref`-prefix;
   when nothing matches it returns null and the link is treated as
   *unrestricted* — visible to every industry, every role, regardless of
   subscription. Adding a page to `navConfig.ts` without a matching
   `BASE_MODULES` entry (plus `access_registry.go`, `access_industries.go` and
   `subscription_modules.go` on the backend) silently creates that hole. Audit
   by matching every `href:` in `navConfig.ts` against every `baseHref:` in
   `constants/navigation/modules.ts`; only `/dashboard`, `/org/brochure` and
   `/org/email` should legitimately be unowned.

## Healthcare Phase 1 modules

Hospitals keep doctors/nurses in the shared Employee module (terminology
relabels it "Clinicians") and share departments, attendance, leaves, payroll,
approvals, announcements, and events. On top of that, Phase 1 adds a
`clinical` coarse subscription module containing three pages:

- **Patients** (`/patients`) — registry with MRN (auto-generated as
  `MRN-00001` when blank), demographics, emergency contacts, and safety flags
  (allergies, chronic conditions). Deleting a patient cascades to their
  appointments and encounters (`backend/graph/clinical_delete.go`).
- **Appointments** (`/appointments`) — consultation bookings linking a
  patient to a clinician (and optionally a department), with double-booking
  rejection per clinician/date/start-time and statuses scheduled → completed
  / cancelled / no_show.
- **OPD Visits** (`/encounters`) — clinical visit records: chief complaint,
  vitals (JSON text field: bp, pulse, temp_c, spo2, weight_kg), diagnosis,
  prescription, notes, follow-up date, open/closed status. Creating a visit
  from an appointment marks the appointment completed. Patient allergies are
  surfaced on the visit form and table for safety.

Clinical reads are matrix-enforced server-side (unlike shared lookup lists)
because medical records are sensitive.

## Healthcare Phase 2 modules

Phase 2 completes the OPD loop (visit → prescription → dispense → bill) with
two more coarse subscription modules, `billing` and `pharmacy`, plus
schedules under `clinical`:

- **Billing** (`/billing`) — a `BillableService` catalog (code, category,
  unit price) and invoices with frozen line items, flat discounts, and
  payments (cash/card/upi/online/cheque). Invoice numbers auto-generate as
  `INV-00001`. Overpayment is rejected; status derives from amounts
  (unpaid → partially_paid → paid); only unpaid invoices can be cancelled.
- **Pharmacy** (`/pharmacy`) — a `Drug` catalog (form, strength, unit price,
  reorder level) with live stock, restock/correction via `adjustDrugStock`,
  and `Dispense` records whose lines freeze name/price and decrement stock
  atomically (insufficient stock rolls the whole dispense back). Low-stock
  rows are flagged against the reorder level.
- **Clinician Schedules** (`/schedules`) — weekly availability windows
  (day-of-week + HH:MM range + slot minutes) per clinician. Booking and
  rescheduling appointments validate against active windows; clinicians with
  no schedule stay freely bookable. The appointment form shows the selected
  clinician's consulting hours for the chosen date.
- **Patients bulk upload** — `handlers/bulk/schema_patients.go` registers the
  `patients` resource in the REST bulk framework; the Patients page has a
  Bulk Upload button. Blank `mrn` auto-generates.

Deleting a patient also cascades invoices/payments and dispenses (stock is
not restored); deleting a clinician removes their schedules.

Invoices download as PDF (doubling as the receipt once paid) via the backend
PDF engine: template in `pdf-template/clinical_invoice.go`, streamed from
`GET /api/v1/clinical/invoices/:id/pdf` (admin/staff only — patients have no
login), Download button on each invoice row.

## Adding the next industry (or extending healthcare)

1. Backend: create models + per-module `graph/<module>.resolvers.go`, append
   the schema section to `schema.graphqls`, run the gqlgen regen dance.
2. Register the fine modules in `models/access_registry.go`, tag them in
   `models/access_industries.go`, map them to a coarse module in
   `models/subscription_modules.go` (and add the coarse key to `ALL_MODULES`
   if new — `SeedModuleConfig` inserts missing keys additively on start).
3. Add opAccess entries in `graph/access_enforce.go`.
4. Frontend: mirror the industry tags in `lib/access.ts`, add entries to
   `BASE_MODULES` / `PATH_NAMES` / sidebar `navConfig.ts`, and build the
   pages under `components/pages/[tenant]/(dashboard)/<module>/`.

## Setup notes

- New tables require one restart with `--migrate` (normal restarts skip
  AutoMigrate).
- Give hospital tenants a plan/override containing the `clinical` module;
  `DefaultModulesFor(healthcare)` now returns attendance, leaves, employees,
  clinical, announcements, reports, events, notifications.
