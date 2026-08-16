# Phase 2 — Procurement & Inventory Hardening

Vendors, purchase orders/invoices linked to the existing `InventoryItem`/`StockTransaction`
ledger, and batch/expiry on pharmacy `Drug` with FEFO dispensing. Effort ~3-4 weeks. Builds on
existing inventory/pharmacy; no brand-new infra. Everything is GraphQL. Healthcare-tagged today,
but written generically so Phase 6 mess/canteen and Phase 3 AP reuse the same vendor/PO tables.

## Modules & fine access ids

`vendors`, `purchase-orders` (POs + invoices share one page group), `pharmacy` (extend existing).

## 1. Models

**`backend/models/vendor.go`**
```go
package models

type Vendor struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_vendor_tenant_name" json:"tenant_id"`
    Name     string `gorm:"not null;uniqueIndex:idx_vendor_tenant_name" json:"name"`
    Code     string `gorm:"index" json:"code"`          // optional supplier code
    GSTIN    string `json:"gstin"`                      // tax id
    ContactName  string `json:"contact_name"`
    Phone    string `json:"phone"`
    Email    string `json:"email"`
    Address  string `json:"address"`
    PaymentTerms string `json:"payment_terms"`         // e.g. "Net 30"
    Active   bool   `gorm:"default:true" json:"active"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (v *Vendor) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**`backend/models/purchase_order.go`** — PO header + lines. Status is a string-const set.
```go
const (
    POStatusDraft     = "draft"
    POStatusOrdered   = "ordered"
    POStatusPartial   = "partially_received" // some lines received
    POStatusReceived  = "received"           // fully received
    POStatusCancelled = "cancelled"
)

type PurchaseOrder struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_po_number" json:"tenant_id"`
    PONumber string `gorm:"not null;uniqueIndex:idx_po_number" json:"po_number"` // PO-%05d per tenant

    VendorID string `gorm:"not null;index" json:"vendor_id"`
    Vendor   Vendor `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`

    OrderDate    string `gorm:"index" json:"order_date"`     // YYYY-MM-DD
    ExpectedDate string `json:"expected_date"`
    Status       string `gorm:"default:'draft';index" json:"status"`

    Subtotal float64 `gorm:"default:0" json:"subtotal"`
    TaxTotal float64 `gorm:"default:0" json:"tax_total"`
    Total    float64 `gorm:"default:0" json:"total"`
    Notes    string  `json:"notes"`

    Items []PurchaseOrderItem `gorm:"foreignKey:PurchaseOrderID" json:"items,omitempty"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (p *PurchaseOrder) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

type PurchaseOrderItem struct {
    ID              string `gorm:"primaryKey" json:"id"`
    TenantID        string `gorm:"not null;index" json:"tenant_id"`
    PurchaseOrderID string `gorm:"not null;index" json:"purchase_order_id"`

    // Link to the store item this line replenishes (nullable for one-off buys
    // that don't track stock, e.g. services). No DB FK — validate in code.
    ItemID   string        `gorm:"index" json:"item_id"`
    Item     InventoryItem `gorm:"foreignKey:ItemID" json:"item,omitempty"`
    ItemName string        `gorm:"not null" json:"item_name"` // snapshot

    Qty          float64 `gorm:"not null" json:"qty"`
    ReceivedQty  float64 `gorm:"default:0" json:"received_qty"` // running total, for partial receipts
    UnitCost     float64 `gorm:"not null;default:0" json:"unit_cost"`
    TaxPct       float64 `gorm:"default:0" json:"tax_pct"`
    LineTotal    float64 `gorm:"default:0" json:"line_total"`
}
func (i *PurchaseOrderItem) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**`backend/models/purchase_invoice.go`** — supplier bill against a PO. This is the Phase 3 AP
source (an unpaid invoice = an accounts-payable liability).
```go
const (
    PurchaseInvoiceUnpaid  = "unpaid"
    PurchaseInvoicePartial = "partially_paid"
    PurchaseInvoicePaid    = "paid"
)

type PurchaseInvoice struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_pinv_number" json:"tenant_id"`
    InvoiceNumber string `gorm:"not null;uniqueIndex:idx_pinv_number" json:"invoice_number"` // supplier's, unique per tenant

    VendorID        string        `gorm:"not null;index" json:"vendor_id"`
    Vendor          Vendor        `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
    PurchaseOrderID string        `gorm:"index" json:"purchase_order_id"` // optional link
    PurchaseOrder   PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`

    InvoiceDate string `gorm:"index" json:"invoice_date"` // YYYY-MM-DD
    DueDate     string `json:"due_date"`

    Subtotal float64 `gorm:"default:0" json:"subtotal"`
    TaxTotal float64 `gorm:"default:0" json:"tax_total"`
    Total    float64 `gorm:"default:0" json:"total"`
    PaidAmount float64 `gorm:"default:0" json:"paid_amount"`
    Status   string  `gorm:"default:'unpaid';index" json:"status"`

    // GL posting linkage (Phase 3): blank until posted to the ledger.
    LedgerBatchID string `gorm:"index" json:"ledger_batch_id"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (p *PurchaseInvoice) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**Pharmacy batch/expiry** — new `backend/models/drug_batch.go`; do **not** rewrite `Drug` (keep
`Drug.StockQty` as the denormalized total for existing reads/reorder logic).
```go
type DrugBatch struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    DrugID   string `gorm:"not null;index" json:"drug_id"`
    Drug     Drug   `gorm:"foreignKey:DrugID" json:"drug,omitempty"`

    BatchNo  string  `gorm:"not null;index" json:"batch_no"`
    ExpiryDate string `gorm:"index" json:"expiry_date"` // YYYY-MM-DD, FEFO sort key
    Qty      float64 `gorm:"not null;default:0" json:"qty"`   // remaining in this batch
    UnitCost float64 `gorm:"default:0" json:"unit_cost"`
    ReceivedFromPOID string `gorm:"index" json:"received_from_po_id"` // provenance
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (b *DrugBatch) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```
Add `BatchNo string` and `BatchID string` to `models.DispenseItem` so each dispensed line records
which batch it drew from (needed for recalls and cost accuracy). `Drug.StockQty` becomes the
`SUM(DrugBatch.Qty)` and is kept in sync inside the dispense/receive transactions.

**AutoMigrate** (`database/database.go`): append `&models.Vendor{}`, `&models.PurchaseOrder{}`,
`&models.PurchaseOrderItem{}`, `&models.PurchaseInvoice{}`, `&models.DrugBatch{}`. Existing
`Drug`/`DispenseItem` gain columns automatically. Add a helpful index:
`CREATE INDEX IF NOT EXISTS idx_drugbatch_fefo ON drug_batches (tenant_id, drug_id, expiry_date)`.

## 2. Numbering helpers

PO and invoice numbers follow the existing `INV-%05d` pattern (see `billing_helpers.go`). Add
`backend/graph/procurement_helpers.go`:
```go
// nextPONumber returns "PO-00001" style, per tenant, gap-free via a row count or
// a small sequence table — reuse whatever billing_helpers.go does for INV numbers.
func (r *Resolver) nextPONumber(ctx context.Context, tenantID string) (string, error) { /* … */ }
func (r *Resolver) nextInternalInvoiceRef(...) // if AP needs one
```

## 3. Receiving = stock in (the integration point)

`receivePurchaseOrder(id, lines)` is the heart of Phase 2. In one GORM transaction it:
1. For each received line: increment `PurchaseOrderItem.ReceivedQty`, and write a
   `StockTransaction{Kind: StockReceipt, ItemID, Qty: +received, Reference: PONumber}` (reusing the
   existing signed-ledger inventory model), bumping `InventoryItem.StockQty`.
2. If the item `LinkedDrugID` is set (or the line is a pharmacy drug), create a `DrugBatch` row
   (batch no + expiry from the receipt input) and add to `Drug.StockQty`.
3. Recompute PO `Status` (`received` if all lines fully received, else `partially_received`).

This means the existing `receiveStock`/`StockTransaction` code is the substrate; POs sit on top.

## 4. FEFO dispense change (pharmacy)

Extend the existing atomic `Dispense` mutation (`graph/pharmacy` resolver): when picking stock for
a drug, order candidate `DrugBatch` rows by `expiry_date ASC` (First-Expiry-First-Out), decrement
across batches, and stamp each `DispenseItem.BatchID`/`BatchNo`. Reject if total available across
non-expired batches is short. Add a nightly-report query `expiringDrugs(days: Int!)` for the
pharmacy dashboard. Keep the whole thing in the existing dispense transaction so stock never drifts.

## 5. GraphQL schema (add to `schema.graphqls`)

Types: `Vendor`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseInvoice`, `DrugBatch`. Inputs:
`Create/UpdateVendorInput`, `CreatePurchaseOrderInput` (+ `PurchaseOrderItemInput` list),
`UpdatePurchaseOrderInput`, `ReceivePurchaseOrderInput` (`{ lines: [ReceiveLineInput!]! }` with
batch/expiry per line), `CreatePurchaseInvoiceInput`, `RecordPurchasePaymentInput`.

Query members:
```graphql
vendors(active: Boolean): [Vendor!]!
purchaseOrders(status: String, vendorId: String): [PurchaseOrder!]!
purchaseOrder(id: ID!): PurchaseOrder
purchaseInvoices(status: String): [PurchaseInvoice!]!
drugBatches(drugId: ID!): [DrugBatch!]!
expiringDrugs(days: Int!): [DrugBatch!]!
```
Mutation members: `createVendor`, `updateVendor`, `deleteVendor`, `createPurchaseOrder`,
`updatePurchaseOrder`, `setPurchaseOrderStatus`, `receivePurchaseOrder`, `createPurchaseInvoice`,
`recordPurchasePayment`, `deletePurchaseInvoice`.

## 6. Resolver files

- `graph/vendors.resolvers.go` — plain CRUD (copy exam-types shape), `requireRole(ctx, roleAdmin, roleStaff)` for writes.
- `graph/purchase_orders.resolvers.go` — CRUD + `receivePurchaseOrder` (the transaction above).
- `graph/purchase_invoices.resolvers.go` — CRUD + `recordPurchasePayment` (updates `PaidAmount`/`Status`; Phase 3 will hook GL posting here).
- `graph/procurement_helpers.go` — numbering + `vendorToModel`/`purchaseOrderToModel`/etc. converters.
- Extend the pharmacy resolver for FEFO + `drugBatches`/`expiringDrugs`.
Run `regen.sh` after schema edits.

## 7. Access / subscription / industry

`access_registry.go` `AccessModules`:
```go
{"vendors", "Vendors", "Procurement", []string{"admin", "staff"}},
{"purchase-orders", "Purchase Orders", "Procurement", []string{"admin", "staff"}},
```
`subscription_modules.go` `defaultPageMap`: map both to a coarse module. Add a new coarse
`procurement` toggle (extend the subscription module list + `EffectiveModules`) OR fold into the
existing `inventory`/`clinical` toggle — recommend a **new `procurement` coarse module** so
non-healthcare tenants (Phase 6 mess) can buy it independently. `pharmacy` batch stays under the
existing `pharmacy` coarse module.
`access_industries.go` `moduleIndustries`: **leave vendors/purchase-orders untagged** (all
industries — schools and hospitals both procure). Pharmacy batch stays healthcare via the existing
`pharmacy` tag.
`opAccess` (`access_enforce.go`): map every write —
`createVendor`/`updateVendor`/`deleteVendor` → `vendors`;
`createPurchaseOrder`/`updatePurchaseOrder`/`setPurchaseOrderStatus`/`receivePurchaseOrder` →
`purchase-orders` (view/edit as appropriate); `createPurchaseInvoice`/`recordPurchasePayment`/
`deletePurchaseInvoice` → `purchase-orders`. Leave `vendors` (read) unenforced since PO forms use
it as a dropdown; enforce `purchaseOrders`/`purchaseInvoices` reads.

## 8. Bulk upload (optional but cheap)

`handlers/bulk/schema_vendors.go` (`init(){Register(...)}`) for mass vendor import; fields name
(required), code, gstin, phone, email, payment_terms; dedupe on `(tenant, name)`. Add a
`resolveVendorID` lookup to `reference_lookups.go` so a future PO bulk can reference vendors by name.

## 9. PDF

Purchase order PDF for emailing suppliers: loader `PurchaseOrderForPDF` in `graph/pdf_exports.go`
→ `pdf-template/purchase_order.go` (`BuildPurchaseOrderPDF`, header vendor block + line table +
totals; stamp `qrcode.VerifyURL(..., "po", po.ID)` from Phase 1) → handler
`handlers.DownloadPurchaseOrderPDF` → route `GET /api/v1/procurement/purchase-orders/:id/pdf`
guarded `RequireRole("admin","staff")`.

## 10. Frontend

Pages (thin re-exports): `/[tenant]/(dashboard)/org/vendors`, `/inventory/purchase-orders`.
Components under `components/pages/.../org/vendors/` and `.../inventory/purchase-orders/`:
`Page.tsx`, `use*.ts`, `types.ts`, `*Table.tsx`, `*Modal.tsx`, plus a `ReceiveModal.tsx` for the
receive flow (batch/expiry inputs per line) and an `ExpiringDrugsPanel.tsx` on the pharmacy page.
GraphQL docs in `graphql/queries/procurement.ts` + `graphql/mutations/procurement.ts`. Nav: add a
"Procurement" section (or entries under existing Inventory) in `navConfig.ts` and rows in
`BASE_MODULES`. Gate buttons with `<Can module="purchase-orders" action="…">`.

## Cascade

Vendors/POs are not per-person, so `cascade_delete.go` is untouched. But add referential guards:
block `deleteVendor` when POs/invoices reference it (`GQLErr("vendor has purchase orders")`), like
other in-code FK protections.

## Test / done

- `graph/purchase_orders_test.go`: `receivePurchaseOrder` writes correct `StockTransaction` rows,
  bumps `InventoryItem.StockQty`, creates `DrugBatch` for linked drugs, and flips PO status on full
  vs partial receipt.
- `graph/pharmacy_fefo_test.go`: dispense draws from earliest-expiry batch first and errors when
  short.
- `--migrate` for 5 new tables + `Drug`/`DispenseItem` columns; `regen.sh` + `go build` clean;
  frontend `npm run build` clean.
