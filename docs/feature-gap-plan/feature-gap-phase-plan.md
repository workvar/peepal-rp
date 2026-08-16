# CollERP Feature Gap — Phase-wise Build Plan

Source: gap analysis vs. LABREP (pathology), 2x HMS SRS docs, school MIS deck.
Convention: GraphQL-first (gqlgen resolvers per module in `graph/<module>.resolvers.go`), models in `models/`, frontend pages under `app/[tenant]/(dashboard)/<module>`, UI split into small files under `components/`.

---

## Phase 1 — Cross-cutting infra (QR/Barcode)

Build once, reused by every later phase.

- **QR/Barcode service** — `backend/qrcode/` package generating PNG/SVG codes server-side (Go lib, no new infra). Wire into: lab report PDFs, patient ID, student ID, hall tickets (Phase 5).

**Effort:** small, ~1 week. No dependencies.

---

## Phase 2 — Procurement & Inventory hardening

- **Vendor module** — `Vendor` model, CRUD resolvers, `org/vendors` page.
- **Purchase Orders / Invoices** — `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseInvoice` models; link to existing `InventoryItem`/`StockTransaction`; `inventory/purchase-orders` page.
- **Pharmacy batch/expiry** — extend `Drug` with `Batch` (batch no, expiry date, qty), FEFO-aware `Dispense` logic.
- Link mess/canteen (Phase 6) purchasing to the same vendor/PO tables once built.

**Effort:** medium, ~3-4 weeks. Depends on: nothing new (builds on existing inventory/pharmacy).

---

## Phase 3 — Financial Accounting core

- **Chart of Accounts** — `Account` model (asset/liability/income/expense tree).
- **General Ledger** — `LedgerEntry` model, double-entry posting helper (`graph/ledger_helpers.go`, mirrors existing `cascade_delete.go` pattern of shared helpers).
- **Accounts Payable** — auto-post from Purchase Invoices (Phase 2).
- **Accounts Receivable** — auto-post from existing student `FeePayment` and (if healthcare tenant) `InvoicePayment`.
- **Payroll → GL** — post existing `Payroll` runs as expense entries.
- New `finance/ledger`, `finance/chart-of-accounts`, `finance/ap`, `finance/ar` pages (admin/accountant role-gated via existing access-matrix).

**Effort:** large, ~4-6 weeks. Depends on: Phase 2 (AP source), existing fee/billing/payroll modules (AR/expense source).

---

## Phase 4 — Clinical enhancements

- **Referral commission/income-sharing** — extend `Referral` model with `CommissionType` (flat/%), `CommissionAmount`, `Payee` (doctor/centre); settlement records post into GL (Phase 3) as payable.
- **General staff duty roster** — generalize `ClinicianSchedule` into a `DutyRoster` usable by any employee role, not just clinicians; `hr/duty-roster` page.
- **OPD UHID/CR number** — add `UHID`/`CRNumber` field to `Encounter`/`Patient`, surfaced on OPD billing.
- **Pathology test template library** — seed script loading a curated set of standard test templates (name, unit, normal range, method) into `LabTest` catalog; not a full 2400-template NABL set initially, start with common panels (CBC, LFT, KFT, lipid, thyroid) and make it extensible via bulk upload (reuse existing `handlers/bulk/` framework).

**Effort:** medium, ~3 weeks. Depends on: Phase 3 (commission payouts), existing lab/referral/encounter models.

---

## Phase 5 — Academic Exam Cell

- **Question bank** — `QuestionBankItem` model (subject, unit, difficulty, marks) scoped per `CurriculumSubject`.
- **Question paper generation** — `QuestionPaper` assembled from bank by rules (marks distribution, difficulty mix), PDF export via existing `pdf-template` pattern.
- **Hall ticket generation** — `HallTicket` model tied to `ExamSchedule` + student; PDF with QR (Phase 1) for attendance verification.
- Marksheet/result announcement already exist (`grading.go`, `results.go`) — no new work there.

**Effort:** medium-large, ~4 weeks. Depends on: Phase 1 (QR), existing exam-types/curriculum modules.

---

## Phase 6 — Student life & campus ops

- **Homework/assignment module** — new `StudentAssignment`/`AssignmentSubmission` models (distinct from the existing employee L&D `LearningAssignment`); teacher creates, student submits, `academic/assignments` + `portal/assignments` pages.
- **Mess/canteen module** — `MessMenu`, `MessAttendance`, `MessExpense` models; ties into Vendor/PO (Phase 2) for provisioning; `hostel/mess` page.
- **Transport GPS + driver attendance** — add `Latitude`/`Longitude` (live ping or manual check-in) to `TransportVehicle`, `DriverAttendance` model linked to existing `Employee`; `transport/live` page.

**Effort:** medium, ~3-4 weeks. Depends on: Phase 2 (mess procurement), existing transport/hostel modules.

---

## Phase 7 — SMS integration

- **SMS gateway service** — `backend/sms/` package (provider-agnostic interface + one adapter, e.g. Twilio/MSG91), env-configured per tenant like `email_settings.go`. New `SmsSettings` model + `org/sms` settings page.
- Extend notification dispatch (`handlers/notifications.go`) to send SMS alongside email/in-app for key events (fee payment, leave approval, results published, hall ticket issued).

**Effort:** small, ~1-2 weeks. No dependencies — can slot in anytime, placed last.

---

## Suggested sequencing

1. Phase 1 (QR infra) → unblocks Phase 5 (hall tickets)
2. Phase 2 (procurement) → unblocks Phase 3 (AP) and Phase 6 (mess)
3. Phase 3 (accounting) → unblocks Phase 4 (commission payouts)
4. Phases 4, 5, 6 can run in parallel once 1–3 are done; independent of each other
5. Phase 7 (SMS) → last, no dependencies on or from other phases

**Total estimate:** ~19-25 weeks for one engineer working sequentially; compressible to ~13-15 weeks with 2 engineers running Phases 4/5/6 in parallel after Phase 3, with Phase 7 slotted into any gap.

Every new model needs `--migrate` on next backend restart (see project convention); every new GraphQL surface goes through the gqlgen regen step, not hand-written resolvers.
