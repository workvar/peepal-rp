# Phase 7 — SMS Integration

Provider-agnostic SMS gateway, configured per tenant like email, wired into the existing
notification dispatch so key events fan out over SMS alongside email and in-app. Effort ~1-2
weeks, no dependencies. Slot in last / into any gap. Mirror the existing email stack
(`backend/mailer/`, `backend/models/email_settings.go`, `/super/email` + `/org/email` pages).

## 1. Models

**`backend/models/sms_settings.go`** — per-tenant provider config (mirror `EmailSettings`).
```go
package models

// SMS provider ids.
const (
    SMSProviderTwilio = "twilio"
    SMSProviderMSG91  = "msg91"
)

// SmsSettings holds one tenant's SMS gateway configuration. Secrets are stored
// encrypted at rest (reuse the same field-encryption helper email uses, if any;
// otherwise store and mask on read like EmailSettings does its password).
type SmsSettings struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;uniqueIndex" json:"tenant_id"` // one row per tenant

    Provider  string `gorm:"default:'msg91'" json:"provider"` // twilio | msg91
    Enabled   bool   `gorm:"default:false" json:"enabled"`
    SenderID  string `json:"sender_id"`  // alphanumeric header / from-number
    APIKey    string `json:"-"`          // never serialized to clients
    APISecret string `json:"-"`
    Region    string `json:"region"`     // optional (Twilio) 

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (s *SmsSettings) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**`backend/models/sms_log.go`** — delivery audit (also lets the org page show recent sends).
```go
type SMSLog struct {
    ID        string `gorm:"primaryKey" json:"id"`
    TenantID  string `gorm:"not null;index" json:"tenant_id"`
    ToPhone   string `gorm:"not null" json:"to_phone"`
    Body      string `gorm:"type:text" json:"body"`
    Category  string `gorm:"index" json:"category"` // matches Notification.Category: leave|fee|marks|general|examcell
    Status    string `gorm:"default:'queued';index" json:"status"` // queued|sent|failed
    Provider  string `json:"provider"`
    ProviderMsgID string `json:"provider_msg_id"`
    Error     string `json:"error"`
    CreatedAt time.Time `json:"created_at"`
}
func (l *SMSLog) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**AutoMigrate** (`database/database.go`): append `&models.SmsSettings{}`, `&models.SMSLog{}`.
Tenant gating flag: add `SMSSendingAllowed *bool \`gorm:"not null;default:true"\`` to
`models.Tenant`, mirroring the existing `EmailSendingAllowed *bool` exactly (nil-safe accessor like
`AllowsEmailSending()`), toggled by super-admin, so the platform controls who may send. Note SMS
costs money, so consider defaulting the accessor to treat nil as **disabled** for SMS even though
email defaults to enabled.

## 2. Package `backend/sms/`

Mirror `backend/mailer/`. Provider-agnostic interface + one adapter to start.

**`sms/sms.go`**
```go
package sms

type Message struct {
    To       string // E.164, e.g. +9198…
    Body     string
    SenderID string
}

// Sender is the provider-agnostic port. Adapters live in sms/twilio.go, sms/msg91.go.
type Sender interface {
    Send(ctx context.Context, m Message) (providerMsgID string, err error)
    Name() string
}

// For returns the adapter for a tenant's SmsSettings, or an error if disabled/misconfigured.
func For(s models.SmsSettings) (Sender, error) { /* switch s.Provider */ }
```

**`sms/msg91.go`**, **`sms/twilio.go`** — each is a thin HTTP client (use `net/http`; no SDK
needed) implementing `Sender`. Keep credentials in the passed `SmsSettings`, not globals. Adapters
are the only place a provider API is referenced, so adding a third provider later is one file.

**`sms/dispatch.go`** — the entry point notifications call:
```go
// SendForTenant loads SmsSettings, checks Tenant.SMSSendingAllowed + Enabled,
// sends, and writes an SMSLog row. Non-fatal: logs & swallows errors so a failed
// SMS never breaks the triggering action (same contract as the mailer).
func SendForTenant(ctx context.Context, db *gorm.DB, tenantID, toPhone, body, category string) {
    /* load settings → For() → Send() → SMSLog{status} */
}
```

Phone source: `Student.Phone` / `Employee.Phone` / user contact. Skip silently when blank.
Optional: E.164 normalization helper `sms/phone.go` with a default country code from tenant config.

## 3. Wire into notification dispatch

The in-app notification creator is the fan-out point. Extend `backend/handlers/notifications.go`
(and/or `backend/graph/comms.resolvers.go`, wherever `Notification` rows are created) so that after
persisting the in-app row and (existing) email, it also calls `sms.SendForTenant(...)` for a
curated set of categories. Do it behind a small policy helper so not every notification texts:

**`backend/handlers/notify_policy.go`**
```go
// smsCategories is the allow-list of Notification.Category values that also send SMS.
var smsCategories = map[string]bool{
    "fee":      true, // fee payment recorded / due
    "leave":    true, // leave approved / rejected
    "marks":    true, // results published
    "examcell": true, // hall ticket issued (Phase 5)
}
```
Trigger points already emit these categories: fee payment (`fee_payments.resolvers.go`), leave
approve/reject (`approvals.resolvers.go` / leave resolver), results publish (`grading`/`results`),
and Phase 5 hall-ticket issue. Add the `sms.SendForTenant` call in the shared notification helper
so all four inherit it without touching each resolver.

## 4. GraphQL surface (tenant-admin settings)

Follow `EmailSettings` GraphQL (org profile). Add to `schema.graphqls`:
```graphql
type SmsSettings {
  id: ID!
  provider: String!
  enabled: Boolean!
  senderId: String
  region: String
  hasCredentials: Boolean!   # true if APIKey set; secrets never returned
  createdAt: String
}
input UpdateSmsSettingsInput {
  provider: String
  enabled: Boolean
  senderId: String
  region: String
  apiKey: String        # write-only
  apiSecret: String     # write-only
}
# Query
smsSettings: SmsSettings
# Mutation
updateSmsSettings(input: UpdateSmsSettingsInput!): SmsSettings!
sendTestSms(toPhone: String!): Boolean!
```

**`backend/graph/sms.resolvers.go`** — `requireRole(ctx, roleAdmin)`; upsert the single row per
tenant; never return `APIKey`/`APISecret` (expose only `hasCredentials`); `sendTestSms` calls
`sms.SendForTenant` with a fixed body and returns whether it queued. Run `regen.sh`.

Super-admin toggle of `Tenant.SMSSendingAllowed`: extend the existing super-admin email/tenant REST
(where `EmailSendingAllowed` is toggled) rather than adding GraphQL.

## 5. Access / subscription

- Fine module `sms` in `access_registry.go` `AccessModules`:
  `{"sms", "SMS Settings", "Organization", []string{"admin"}}`.
- `subscription_modules.go` `defaultPageMap`: `"sms": "settings"` (or leave core/unmapped so
  every tenant admin who is `SMSSendingAllowed` can configure it — match how `email` is mapped;
  check `defaultPageMap["email"]` and mirror it exactly).
- `access_industries.go`: **do not** tag — SMS is cross-industry.
- `opAccess` (`access_enforce.go`): `"updateSmsSettings": {"sms", ActionEdit}`,
  `"sendTestSms": {"sms", ActionEdit}`. Leave `smsSettings` (read) enforced too since it's a
  settings page, not a shared dropdown: `"smsSettings": {"sms", ActionView}`.

## 6. Frontend

- Route: `app/[tenant]/(dashboard)/org/sms/page.tsx` re-export.
- Components: `components/pages/[tenant]/(dashboard)/org/sms/{Page.tsx, useSmsSettings.ts, types.ts, SmsSettingsForm.tsx, TestSmsButton.tsx}`. Copy the `/org/email` page structure.
- GraphQL docs: `graphql/queries/org.ts` (+`SMS_SETTINGS`), `graphql/mutations/org.ts`
  (+`UPDATE_SMS_SETTINGS`, `SEND_TEST_SMS`).
- Nav: add `{ label: "SMS", href: "/org/sms", icon: MessageSquare, roles: ["admin","super_admin"] }`
  to the Organization section in `navConfig.ts`; add the BASE_MODULES row.
- Show recent `SMSLog` rows (last 20) on the page for delivery visibility (add an `smsLogs` query,
  admin-gated, or reuse an existing audit view).

## Files touched

Backend (new): `models/sms_settings.go`, `models/sms_log.go`, `sms/{sms,msg91,twilio,dispatch,phone}.go`,
`graph/sms.resolvers.go`, `handlers/notify_policy.go`. Backend (edit): `database/database.go`,
`models/tenant.go` (+`SMSSendingAllowed`), `graph/schema.graphqls`, notification helper,
super-admin tenant REST, `access_registry.go`, `subscription_modules.go`, `access_enforce.go`.
Frontend (new): the `/org/sms` page + components, `graphql/queries|mutations/org.ts` additions,
`navConfig.ts` + `constants/navigation/modules.ts` rows.

## Test / done

- `sms/dispatch_test.go`: with a stub `Sender`, `SendForTenant` writes an `SMSLog` `sent` row on
  success and a `failed` row (non-panicking) on adapter error; skips when `Enabled=false` or
  `SMSSendingAllowed=false`.
- Manual: configure MSG91/Twilio sandbox creds on `/org/sms`, hit `sendTestSms`, confirm receipt +
  an `SMSLog` row; record a fee payment and confirm the payer gets an SMS.
- `--migrate` for the two new tables + `Tenant.SMSSendingAllowed` column; `regen.sh` + `go build` clean.
