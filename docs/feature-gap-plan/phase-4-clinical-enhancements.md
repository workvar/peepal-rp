# Phase 4 — Clinical Enhancements

Four independent healthcare improvements: referral commission/income-sharing, a general staff duty
roster generalized from clinician schedules, OPD UHID/CR numbers, and a pathology test-template
library. Effort ~3 weeks. Depends on Phase 3 (commission payouts post to GL) and existing
lab/referral/encounter models. All GraphQL. Healthcare-tagged (except the duty roster, which is
cross-industry HR).

## 4a. Referral commission / income-sharing

Extend the existing `Referral` model (`models/referral.go`) rather than replacing it. Settlements
post into the GL (Phase 3) as a payable.

**Add to `models.Referral`:**
```go
// Commission on this referral (income-sharing with the referring doctor/centre).
CommissionType   string  `gorm:"default:'none'" json:"commission_type"` // none | flat | percent
CommissionValue  float64 `gorm:"default:0" json:"commission_value"`     // amount (flat) or percent (0-100)
CommissionBase   float64 `gorm:"default:0" json:"commission_base"`      // billable amount the % applies to
CommissionAmount float64 `gorm:"default:0" json:"commission_amount"`    // computed, frozen at settlement
PayeeType        string  `json:"payee_type"`  // doctor | centre
PayeeName        string  `json:"payee_name"`  // free text external payee
PayeeEmployeeID  string  `gorm:"index" json:"payee_employee_id"` // optional internal doctor
SettlementStatus string  `gorm:"default:'pending';index" json:"settlement_status"` // pending | settled
SettledOn        string  `json:"settled_on"` // YYYY-MM-DD
```
Consts in `referral.go`: `ReferralCommissionNone/Flat/Percent`, `ReferralSettlementPending/Settled`.

**Resolver** (extend `graph/referral.resolvers.go`): `setReferralCommission(id, input)` computes
`CommissionAmount` (flat = value; percent = base * value/100) and stores it; `settleReferral(id)`
flips status to `settled`, stamps `SettledOn`, and — if Phase 3 is live — calls the ledger helper
to post a payable: debit `referral_commission_expense`, credit `ap_vendors` (or a dedicated
`referral_payable` system account), `sourceType="referral_commission"`, `sourceID=referral.ID`.
Add the `referral_commission_expense` system account to the Phase 3 seed chart. If Phase 3 is not
yet deployed, settlement just records the amount and a follow-up posts it later.

**Schema**: add the fields to `type Referral`, an `input SetReferralCommissionInput`, and
mutations `setReferralCommission(id: ID!, input: SetReferralCommissionInput!): Referral!` and
`settleReferral(id: ID!): Referral!`. `opAccess`: both → `{"referrals", ActionEdit}`. No new fine
module; reuses `referrals`.

**Frontend**: extend the existing referrals page components with a commission section in the
referral modal and a "Settle" action + settlement filter. New GraphQL docs go in the existing
clinical query/mutation files.

## 4b. General staff duty roster

Generalize `ClinicianSchedule` (`models/clinician_schedule.go`) into a `DutyRoster` usable by any
employee role, not just clinicians. Keep `ClinicianSchedule` as-is (appointment booking still reads
it); `DutyRoster` is a superset for non-clinical shift planning, so we add a new model rather than
migrating the old one and risking the appointment logic.

**`backend/models/duty_roster.go`**
```go
type DutyRoster struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`

    EmployeeID string   `gorm:"not null;index" json:"employee_id"`
    Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`

    // A dated shift (not a recurring weekly window) so real rosters with
    // day-off patterns and swaps are expressible.
    Date      string `gorm:"not null;index" json:"date"`       // YYYY-MM-DD
    ShiftName string `json:"shift_name"`                       // Morning | Evening | Night | custom
    StartTime string `gorm:"not null" json:"start_time"`       // HH:MM
    EndTime   string `gorm:"not null" json:"end_time"`
    Location  string `json:"location"`                         // ward / desk / dept
    Notes     string `json:"notes"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (d *DutyRoster) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```
Partial index to prevent double-booking a person on the same shift slot:
`CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_emp_slot ON duty_rosters (tenant_id, employee_id, date, start_time)`.

**Resolver** `graph/duty_roster.resolvers.go`: `dutyRoster(from, to, employeeId, departmentId)`
list, `createDutyRoster`/`updateDutyRoster`/`deleteDutyRoster`, plus a `bulkSetDutyRoster(input)`
that writes many shifts in one transaction (roster grids). `requireRole(ctx, roleAdmin, roleStaff)`
for writes. Reads `requireAuth` (staff see their own; admins see all — filter by employee when the
caller isn't admin).

**Access/industry**: new fine module `duty-roster`, group `HR`, default roles `["admin","staff"]`.
`defaultPageMap`: `"duty-roster": "hr"` (or core/unmapped if HR isn't a coarse module — mirror how
existing HR pages like leave/payroll are mapped; check and match). **Untagged** in
`moduleIndustries` (every vertical rosters staff). `opAccess`: the create/update/delete/bulk writes
→ `{"duty-roster", Action…}`.

**Cascade**: `DutyRoster` is per-person → add to `deleteEmployeeCascade` a
`tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).Delete(&models.DutyRoster{})`.

**Frontend**: `/[tenant]/(dashboard)/hr/duty-roster` page; a week-grid `RosterGrid.tsx` plus a
shift modal. GraphQL docs in a new `graphql/queries|mutations/hr.ts`. Nav row under an HR/Employees
section.

## 4c. OPD UHID / CR number

Surface a Unique Health ID (lifetime, per patient) and a per-visit CR (Case Record) number on OPD
billing. UHID belongs on `Patient`; CR on `Encounter`.

**Add to `models.Patient`:** `UHID string \`gorm:"index;uniqueIndex:idx_patient_uhid"\``. Generate
on registration in the patient create resolver via a per-tenant sequence helper (e.g.
`UH-<tenantShort>-%06d`), reusing the numbering approach from `billing_helpers.go`. Backfill
existing patients with a one-off `cmd/backfill-uhid` guarded command.

**Add to `models.Encounter`:** `CRNumber string \`gorm:"index"\``. Assign on encounter create
(`CR-%06d` per tenant, or per-patient visit counter). Both are day-one identifiers, so set them in
`BeforeCreate`-adjacent resolver logic, not the hook (hook only does the UUID).

**Schema**: add `uhid` to `type Patient`, `crNumber` to `type Encounter` (read-only outputs; not in
create inputs — server-assigned). Surface both on the OPD invoice: extend the existing invoice PDF
(`pdf-template` invoice builder) and the billing screen to print UHID + CR. No new mutations,
minimal `opAccess` change (fields ride existing patient/encounter queries).

**Frontend**: show UHID on the patient header/profile and CR on the encounter/OPD-billing view.
Small edits to existing patient/encounter components; no new page.

## 4d. Pathology test-template library

Seed a curated set of standard test templates into the existing `LabTest` catalog (name, unit,
normal range, method), extensible via the existing bulk framework. Start with common panels, not a
full NABL set.

**Model check**: reuse `models.LabTest` (from `models/lab.go`) — it already has `Code`, `Name`,
`Category`, `SampleType`, `Unit`, `RefLow`, `RefHigh`, `RefText`, `Price`, `Active`. That is exactly
a test template. Use the existing `Category` field for the panel grouping (haematology,
biochemistry, …); only add a dedicated `Panel string \`gorm:"index"\`` if you want CBC/LFT/KFT to
group independently of `Category`. It has no `Method` field — add `Method string` if the pathology
report needs it. Do **not** create a parallel template model — the catalog *is* the template
library.

**Seed** `backend/database/seed_lab_templates.go`, additive (insert-if-missing by
`(tenant, panel, name)`), run per tenant on first healthcare enablement. Seed the common panels:
CBC, LFT, KFT, Lipid Profile, Thyroid (TSH/T3/T4), with standard adult reference ranges and units.
Keep the data in a small in-repo table/JSON so it is reviewable.

**Bulk extensibility**: add `handlers/bulk/schema_lab_tests.go` (`init(){Register(...)}`) with
fields panel, name (required), unit, ref_low, ref_high, normal_range_text, method; dedupe on
`(tenant, panel, name)`. This lets a lab expand toward the full catalog without code changes,
reusing `bulk` validation/PDF-guide machinery.

**Frontend**: the existing lab test-catalog page gains a "Panel" column/filter and a Bulk Upload
button (`<BulkUploadButton resource="lab_tests" />`). No new module.

## Files touched (Phase 4 total)

Backend (edit): `models/referral.go`, `models/patient.go`, `models/encounter.go`, `models/lab.go`,
`graph/referral.resolvers.go`, patient/encounter create resolvers, `graph/schema.graphqls`,
`database/database.go` (migrate `DutyRoster`; new columns), `access_registry.go`,
`subscription_modules.go`, `access_enforce.go`, `graph/cascade_delete.go`, Phase 3 account seed.
Backend (new): `models/duty_roster.go`, `graph/duty_roster.resolvers.go`,
`handlers/bulk/schema_lab_tests.go`, `database/seed_lab_templates.go`, `cmd/backfill-uhid`.
Frontend: referral commission UI, new `/hr/duty-roster` page + components, UHID/CR display edits,
lab catalog panel/bulk additions, `graphql/*/hr.ts` + clinical doc additions, nav rows.

## Test / done

- `graph/referral_commission_test.go`: flat vs percent computes `CommissionAmount`; `settleReferral`
  posts a balanced GL batch (when Phase 3 present) and is idempotent.
- `graph/duty_roster_test.go`: double-booking the same slot is rejected; non-admin sees only own shifts.
- UHID uniqueness + CR assignment verified on patient/encounter create.
- `--migrate` (DutyRoster table, Patient.UHID, Encounter.CRNumber, LabTest.Panel); seeds additive
  and re-runnable; `regen.sh` + `go build` + `npm run build` clean.
