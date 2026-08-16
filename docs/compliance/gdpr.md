# GDPR Compliance Documentation — CollERP

**Regulation:** EU General Data Protection Regulation (2016/679)
**Applies if:** any tenant processes personal data of EU residents. Health data (patients) and children's data (students) are special/higher-protection categories (Art. 9, Art. 8).
**Roles:** each tenant institution is the Controller; the platform operator is a Processor (Art. 28).
**Audit date:** 2026-07-13. Self-contained; see also `hipaa.md`, `dpdp.md`.

> Technical assessment, not legal advice.

---

## ✅ Compliant / Implemented Controls

| # | Control | GDPR Reference | Implementation |
|---|---------|----------------|----------------|
| 1 | Access control by role and module | Art. 32(1)(b), Art. 25 | Three-layer access matrix on every GraphQL root field (`graph/access_enforce.go`); resolver guards (`graph/authz.go`) |
| 2 | Data-subject self-access (patients) | Art. 15 (partial) | Patient portal exposes the caller's own records only (`graph/patient_portal.resolvers.go`) |
| 3 | Credential protection | Art. 32(1)(a) (partial) | bcrypt hashing, password policy, anti-enumeration (`utils/password.go`) |
| 4 | Session security | Art. 32 | httpOnly/Secure/SameSite cookies (`handlers/auth.go:173`); JWT alg-confusion protection (`utils/jwt.go`) |
| 5 | Processing records for changes | Art. 5(2) (partial) | Mutation + login audit trail with actor/module/IP (`graph/audit_recorder.go`) |
| 6 | Controller separation (multi-tenancy) | Art. 32, Art. 5(1)(f) | `TenantID` on every model; tenant-scoped indexes; access middleware reads tenant from auth |
| 7 | No third-party PII rendering | Art. 28 (partial) | PDF documents generated locally (gofpdf); no external analytics or PII-receiving APIs found |
| 8 | Deletion cascades | Art. 17 (partial mechanism) | Hard-delete cascades remove all relations (`graph/cascade_delete.go`); no lingering orphan PII on admin delete |
| 9 | Secure provisioning | Art. 32 | Hashed, single-use, 72h invite tokens (`invites/`) |
| 10 | Privacy notice exists | Art. 13 (partial) | `frontend/app/privacy/page.tsx` published (but see Non-Compliant #2 — contents are inaccurate) |
| 11 | Injection resistance | Art. 32(1)(b) | Parameterized GORM queries; introspection disabled in production |

---

## ❌ Non-Compliant Items

Severity: **Critical** = blocks compliance, exploitable or legally exposed today. **High** = required control absent. **Medium** = partial control or hardening gap. **Low** = hygiene.

| # | Problem | GDPR Reference | Severity | Suggested Fix |
|---|---------|----------------|----------|---------------|
| 1 | **No consent capture at all.** Zero consent models, timestamps, or opt-in records in the backend (grep: no matches). No lawful-basis tracking per processing purpose. | Art. 6, Art. 7, Art. 9(2) | **Critical** | Consent module: purpose, notice version, timestamp, withdrawal, granular per-purpose records; capture at onboarding and account creation. |
| 2 | **Privacy policy makes false claims.** `frontend/app/privacy/page.tsx:53-56` claims "encryption at rest" and "column-level encryption" for sensitive fields; neither exists in code. Misrepresentation to data subjects. | Art. 5(1)(a), Art. 13 | **Critical** | Immediately correct the policy or implement the claimed encryption; false transparency statements are worse than absent ones. |
| 3 | **No encryption at rest.** Special-category health data and financial identifiers (bank, PAN) plaintext (`models/encounter.go`, `models/employee.go:78-99`); DB default `sslmode=disable`. | Art. 32(1)(a), Art. 9 | **Critical** | Field-level encryption for clinical text + payment fields; `sslmode=require`; infra-level DB encryption. |
| 4 | **No parental consent for children.** Students are minors; guardian data is stored (`models/student.go`) but no verifiable parental consent mechanism exists. | Art. 8 | **High** | Verifiable guardian consent flow tied to existing guardian records. |
| 5 | **No data portability or subject access export.** No "download my data" endpoint; only operational exports (attendance CSV, payslip PDFs). | Art. 15, Art. 20 | **High** | Per-user machine-readable (JSON) + human-readable (PDF) export covering all personal data held. |
| 6 | **No erasure ("right to be forgotten") workflow.** Deletes are admin-triggered feature actions, not subject-initiated requests; no anonymization routine for records that must be retained (e.g. clinical). | Art. 17 | **High** | Erasure-request workflow with identity verification, admin approval, SLA tracking; anonymize where legal retention prevents deletion. |
| 7 | **No rectification workflow.** No subject-initiated correction requests; edits are admin-only. | Art. 16 | **High** | In-product correction request + review flow. |
| 8 | **No breach notification capability.** Nothing detects, logs, or notifies; GDPR requires supervisory-authority notice within 72h and subject notice for high-risk breaches. | Art. 33, Art. 34 | **High** | Incident module: detection, severity triage, 72h authority workflow, subject notification. |
| 9 | **No retention limits or purge automation.** All data retained indefinitely; no scheduler exists. Policy §8 promises bounded backup deletion that is not implemented. | Art. 5(1)(e), Art. 25 | **High** | Retention config per data class + scheduled purge/anonymize job; align policy text with reality. |
| 10 | **No records of processing activities (ROPA).** | Art. 30 | **High** | ROPA document per module/purpose; expose per-tenant processing register. |
| 11 | **No processor safeguards for email.** Per-tenant SMTP relays receive names/emails over opportunistic STARTTLS (`mailer/mailer.go:57-63`); no DPA management. | Art. 28, Art. 32 | **Medium** | Require TLS on SMTP; DPA templates for tenant-configured processors. |
| 12 | **Weak authentication assurance.** No MFA, no per-account lockout, no session revocation (24h irrevocable JWT), no startup secret validation (`config/config.go` accepts empty `JWT_SECRET`). | Art. 32(1)(b),(d) | **High** | MFA for privileged roles; account lockout; refresh + revocation; fail startup on missing secrets. |
| 13 | **No transport hardening.** No HSTS/security headers; TLS delegated entirely to unspecified proxy (`main.go:106`). | Art. 32(1)(a) | **Medium** | Helmet-style middleware + HSTS; document TLS termination requirement. |
| 14 | **Excessive internal access (data minimization).** Any staff role with a module grant sees all subjects tenant-wide; admin/super_admin bypass the matrix (`access_enforce.go:515`). | Art. 5(1)(c), Art. 25 | **Medium** | Relationship-based scoping for clinical data; scoped admin access with break-glass audit. |
| 15 | **Tenant isolation has no systemic backstop.** Manual `tenant_id` filters per query; one omission leaks cross-controller data. | Art. 32(1)(b) | **Medium** | GORM global tenant scope or Postgres RLS. |
| 16 | **Audit gaps.** Reads not logged, failed logins not logged, log table mutable, write failures swallowed. | Art. 5(2), Art. 32 | **Medium** | Read auditing for special-category data; failed-login records; tamper-evident storage. |
| 17 | **Hygiene:** stale README credentials, committed backup files, possible secrets in git history, client-trusted upload MIME. | Art. 32 | **Low** | Clean up, rotate historical secrets, magic-byte sniffing. |
