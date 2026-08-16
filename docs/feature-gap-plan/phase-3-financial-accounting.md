# Phase 3 — Financial Accounting Core

Double-entry general ledger: chart of accounts, ledger entries, and auto-posting from the money
sources already in the system (student `FeePayment`, healthcare `InvoicePayment`, `Payroll`, and
Phase 2 `PurchaseInvoice`). Effort ~4-6 weeks, the largest phase. Depends on Phase 2 (AP source)
and the existing fee/billing/payroll modules (AR + expense sources). All GraphQL. Cross-industry
(untagged). Admin/accountant-gated.

## Design principle

The ledger is a **derived, append-only mirror** of source documents, not a new place to enter
money. Users keep recording fees/payroll/purchases where they do today; a shared posting helper
(mirroring `graph/cascade_delete.go`'s "one place, called from many resolvers" pattern) turns each
source event into a balanced set of ledger entries. This keeps the GL always reconciled and avoids
a parallel data-entry surface.

## Modules & fine access ids

`chart-of-accounts`, `ledger`, `accounts-payable` (`ap`), `accounts-receivable` (`ar`). New coarse
subscription module `finance`.

## 1. Models

**`backend/models/account.go`** — chart of accounts (a tree).
```go
package models

// Account types (the five roots of double-entry).
const (
    AccountAsset     = "asset"
    AccountLiability = "liability"
    AccountEquity    = "equity"
    AccountIncome    = "income"
    AccountExpense   = "expense"
)

type Account struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_account_code" json:"tenant_id"`
    Code     string `gorm:"not null;uniqueIndex:idx_account_code" json:"code"` // e.g. "1000", "4000"
    Name     string `gorm:"not null" json:"name"`
    Type     string `gorm:"not null;index" json:"type"` // asset|liability|equity|income|expense

    ParentID string  `gorm:"index" json:"parent_id"` // tree; blank = root
    Parent   *Account `gorm:"foreignKey:ParentID" json:"parent,omitempty"`

    // IsSystem marks accounts the auto-posting logic relies on (see seed below);
    // these cannot be deleted and their type is locked.
    IsSystem bool `gorm:"default:false" json:"is_system"`
    // SystemKey is a stable handle the posting code looks accounts up by, e.g.
    // "ar_students", "cash", "fee_income", "salary_expense", "ap_vendors".
    SystemKey string `gorm:"index" json:"system_key"`

    Active   bool   `gorm:"default:true" json:"active"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (a *Account) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**`backend/models/ledger.go`** — a batch (journal entry) with balanced lines.
```go
// LedgerBatch is one journal entry: a set of lines whose debits equal credits.
// It records provenance so a source document maps to exactly one batch.
type LedgerBatch struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    Date     string `gorm:"not null;index" json:"date"` // YYYY-MM-DD (posting date)
    Memo     string `json:"memo"`

    // Source provenance: SourceType in {fee_payment, invoice_payment, payroll,
    // purchase_invoice, purchase_payment, manual}; SourceID is that row's id.
    SourceType string `gorm:"index" json:"source_type"`
    SourceID   string `gorm:"index" json:"source_id"`

    Posted   bool   `gorm:"default:true;index" json:"posted"`
    Reversed bool   `gorm:"default:false" json:"reversed"` // reversal batch created?
    Lines    []LedgerEntry `gorm:"foreignKey:BatchID" json:"lines,omitempty"`

    CreatedAt time.Time `json:"created_at"`
}
func (b *LedgerBatch) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

// LedgerEntry is one debit or credit line. Exactly one of Debit/Credit is > 0.
type LedgerEntry struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    BatchID  string `gorm:"not null;index" json:"batch_id"`

    AccountID string  `gorm:"not null;index" json:"account_id"`
    Account   Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`

    Debit  float64 `gorm:"default:0" json:"debit"`
    Credit float64 `gorm:"default:0" json:"credit"`
    Memo   string  `json:"memo"`

    CreatedAt time.Time `json:"created_at"`
}
func (e *LedgerEntry) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**AutoMigrate**: append `&models.Account{}`, `&models.LedgerBatch{}`, `&models.LedgerEntry{}`.
Index for reporting: `CREATE INDEX IF NOT EXISTS idx_ledger_acct_date ON ledger_entries (tenant_id, account_id)`
and on `LedgerBatch (tenant_id, source_type, source_id)` for idempotency lookups.

## 2. Seed the chart of accounts

New `backend/database/seed_accounts.go`, called from the seed path (like the default-admin seed).
On first run per tenant, insert a minimal system chart with stable `SystemKey`s the posting code
depends on:

| Code | Name | Type | SystemKey |
|------|------|------|-----------|
| 1000 | Cash / Bank | asset | `cash` |
| 1100 | Accounts Receivable — Students | asset | `ar_students` |
| 1110 | Accounts Receivable — Patients | asset | `ar_patients` |
| 2000 | Accounts Payable — Vendors | liability | `ap_vendors` |
| 4000 | Fee Income | income | `fee_income` |
| 4100 | Clinical Income | income | `clinical_income` |
| 5000 | Salary Expense | expense | `salary_expense` |
| 5100 | Purchases / COGS | expense | `purchases` |

Admins can add children/siblings freely; system accounts are immutable. Make the seed **additive**
(insert-if-missing by `SystemKey`) so it is safe to re-run, matching `SeedModuleConfig`'s additive
convention.

## 3. The posting helper (the core)

`backend/graph/ledger_helpers.go` — mirrors `cascade_delete.go`: exported functions taking an open
`tx *gorm.DB`, called from the source resolvers.
```go
// account resolves a system account id by key within a tenant (cached per request).
func accountIDByKey(tx *gorm.DB, tenantID, systemKey string) (string, error)

// postBatch writes one balanced LedgerBatch. It rejects unbalanced input
// (sum(debit) != sum(credit)) and is idempotent on (sourceType, sourceID):
// if a posted, non-reversed batch already exists for that source, it no-ops.
func postBatch(tx *gorm.DB, tenantID, date, memo, sourceType, sourceID string, lines []postLine) error

type postLine struct{ AccountKey string; Debit, Credit float64; Memo string }

// reverseBatch posts an inverse batch when a source document is deleted/voided.
func reverseBatch(tx *gorm.DB, tenantID, sourceType, sourceID string) error
```

### Auto-posting rules

Call `postBatch` inside the existing transactions of each source, so the ledger commits atomically
with the source row (no drift, no cron backfill for live events).

- **AR — student fee payment** (in `fee_payments.resolvers.go` on record): debit `cash`,
  credit `fee_income`, `sourceType="fee_payment"`. (If you also model invoicing-before-payment,
  raise the receivable at invoice time: debit `ar_students` / credit `fee_income`, then payment
  debits `cash` / credits `ar_students`. Start with the simpler cash-basis pair; note the accrual
  path as a follow-up.)
- **AR — clinical invoice payment** (healthcare tenants, `billing.resolvers.go`): debit `cash`,
  credit `clinical_income`, `sourceType="invoice_payment"`.
- **Expense — payroll run** (`payroll.resolvers.go` on generate): debit `salary_expense`
  (gross), credit `cash` (net) + credit the relevant liability accounts for PF/ESI/TDS if modeled
  (start: debit `salary_expense` net, credit `cash`), `sourceType="payroll"`, one batch per
  payroll row (or per run with per-employee lines).
- **AP — purchase invoice** (Phase 2, `purchase_invoices.resolvers.go` on create): debit
  `purchases`, credit `ap_vendors`, `sourceType="purchase_invoice"`; stamp
  `PurchaseInvoice.LedgerBatchID`.
- **AP — purchase payment** (on `recordPurchasePayment`): debit `ap_vendors`, credit `cash`,
  `sourceType="purchase_payment"`.
- **Deletion/void**: each source's delete path calls `reverseBatch`.

Idempotency + the `(source_type, source_id)` unique-ish lookup means re-running or double-submits
never double-post. A one-off backfill command (`cmd/backfill-ledger`, run manually, guarded like
other `cmd/` tools) posts historical fees/payroll/invoices; note the migrations-need-`--migrate`
and "don't `go build ./cmd/x/` into the repo" conventions from project memory.

## 4. Reporting queries

`backend/graph/ledger.resolvers.go` (read side): 
```graphql
accounts(type: String, activeOnly: Boolean): [Account!]!
account(id: ID!): Account
ledgerBatches(from: String, to: String, sourceType: String): [LedgerBatch!]!
accountLedger(accountId: ID!, from: String, to: String): AccountLedger!   # running balance
trialBalance(asOf: String): [TrialBalanceRow!]!                            # per-account debit/credit totals
profitAndLoss(from: String!, to: String!): FinancialStatement!            # income - expense
balanceSheet(asOf: String!): FinancialStatement!                          # asset = liab + equity
accountsReceivableAging(asOf: String): [AgingRow!]!                       # from ar_* + open fees/invoices
accountsPayableAging(asOf: String): [AgingRow!]!                          # from ap_vendors + unpaid PurchaseInvoices
```
`FinancialStatement`/`TrialBalanceRow`/`AgingRow`/`AccountLedger` are computed GraphQL types
(`graph/model`, hand-defined and pinned in `gqlgen.yml` `models:` if not auto-generatable, or plain
generated types built by the resolver). Aging pulls straight from source docs
(`FeePayment`/`StudentFee`, `PurchaseInvoice.Status/DueDate`) rather than re-deriving from ledger,
so it stays intuitive for staff.

## 5. Chart-of-accounts mutations

`backend/graph/accounts.resolvers.go`: `createAccount`, `updateAccount`, `deleteAccount`
(blocked when `IsSystem` or when `LedgerEntry` rows reference it → `GQLErr`), `createManualJournal`
(admin-only balanced `postBatch` with `sourceType="manual"`) for adjustments. All `requireRole(ctx, roleAdmin)`.

## 6. Schema

Add all types/inputs/queries/mutations above to `schema.graphqls` under a `# ── Finance ──`
banner. Run `regen.sh`.

## 7. Access / subscription / industry

`access_registry.go` `AccessModules`:
```go
{"chart-of-accounts", "Chart of Accounts", "Finance", []string{"admin"}},
{"ledger", "General Ledger", "Finance", []string{"admin"}},
{"accounts-payable", "Accounts Payable", "Finance", []string{"admin"}},
{"accounts-receivable", "Accounts Receivable", "Finance", []string{"admin"}},
```
"Accountant" role = a custom role in the per-tenant access matrix granted view/edit on these four
modules; no new system role needed (system roles stay `admin/teacher/student/staff/patient`).
`subscription_modules.go` `defaultPageMap`: map all four → new coarse `finance` module (add
`finance` to the subscription module list + `EffectiveModules` + `subscription_modules.go` fine→coarse
map). `access_industries.go`: **untagged** (all industries keep books).
`opAccess` (`access_enforce.go`): map writes —
`createAccount`/`updateAccount`/`deleteAccount`/`createManualJournal` → `chart-of-accounts`;
enforce reads `accounts`→view `chart-of-accounts`, `ledgerBatches`/`accountLedger`/`trialBalance`/
`profitAndLoss`/`balanceSheet` → `ledger` view; `accountsReceivableAging` → `accounts-receivable`;
`accountsPayableAging` → `accounts-payable`. The **auto-posting itself is not a GraphQL field**, so
it needs no `opAccess` entry — it runs inside source resolvers whose own access already gates them.

## 8. PDF

Financial statement exports (P&L, balance sheet, trial balance) as PDF via the standard loader →
`pdf-template/financial_statement.go` (`BuildPLPDF`, `BuildBalanceSheetPDF`, two-column account/
amount layout, `PageBreak` between statements) → handlers → routes
`GET /api/v1/finance/reports/pl?from&to`, `/balance-sheet?asOf`, guarded `RequireRole("admin")`.

## 9. Frontend

Pages: `/[tenant]/(dashboard)/finance/{chart-of-accounts, ledger, ap, ar}`. Components per module
under `components/pages/.../finance/…`: a tree editor for chart of accounts, a batch/journal list +
drill-down for ledger, aging tables for AP/AR, and a `StatementView.tsx` for P&L/balance sheet with
a date-range picker. GraphQL docs in `graphql/queries/finance.ts` + `mutations/finance.ts`. New
"Finance" nav section in `navConfig.ts` (roles `["admin","super_admin"]`, plus any custom accountant
role surfaces via myAccess) and `BASE_MODULES` rows. Gate manual-journal/account-edit buttons with
`<Can module="chart-of-accounts" action="…">`.

## Cascade / integrity

Not per-person, so `cascade_delete.go` untouched. But deleting a **person** that owns fee payments
already cascades those source rows (`deleteStudentFees`); add `reverseBatch` calls there so the GL
reverses when the underlying fee payment is deleted, keeping books consistent with person deletion.

## Test / done

- `graph/ledger_helpers_test.go`: `postBatch` rejects unbalanced lines, is idempotent per source,
  and `reverseBatch` nets an account to zero.
- `graph/finance_reports_test.go`: seeded fee payment + payroll + purchase invoice produce a
  correct trial balance (debits == credits) and P&L/balance-sheet totals.
- `--migrate` for 3 tables + account seed; `regen.sh` + `go build` clean; backfill command verified
  on a copy before running against real data.
