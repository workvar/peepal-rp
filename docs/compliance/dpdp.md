# DPDP Compliance Documentation — CollERP

**Regulation:** India Digital Personal Data Protection Act, 2023 + DPDP Rules, 2025 (notified 13 Nov 2025).
**Timeline:** Data Protection Board provisions live now; consent-manager provisions effective 13 Nov 2026; **substantive compliance obligations effective 13 May 2027**. 2026 is a soft-enforcement window.
**Roles:** each tenant (institute/hospital) is the **Data Fiduciary**; the platform operator is a **Data Processor** (S.8(2)). Hospitals and institutions processing children's data at scale may be designated **Significant Data Fiduciaries (SDF)** with extra duties (DPO, DPIA, annual audit).
**Key DPDP specifics:** all persons under 18 are children (S.9); verifiable parental consent required; no monetary-threshold exemptions for penalties (up to ₹250 crore per breach category).
**Audit date:** 2026-07-13. Self-contained; see also `hipaa.md`, `gdpr.md`.

> Technical assessment, not legal advice.

---

## ✅ Compliant / Implemented Controls

| # | Control | DPDP Reference | Implementation |
|---|---------|----------------|----------------|
| 1 | Access control | S.8(5), Rules Sch. II | Three-layer access matrix on every GraphQL field (`graph/access_enforce.go`); role guards (`graph/authz.go`) |
| 2 | Credential security | S.8(5) | bcrypt hashing + password policy + anti-enumeration (`utils/password.go`) |
| 3 | Session security | S.8(5) | httpOnly/Secure/SameSite cookies (`handlers/auth.go:173`), JWT hardening (`utils/jwt.go`) |
| 4 | Logging of changes and logins | Rules Sch. II (logs) (partial) | Mutation + login audit with actor/module/IP (`graph/audit_recorder.go`) |
| 5 | Data Principal self-access (patients) | S.11 (partial) | Patient portal strictly self-scoped (`graph/patient_portal.resolvers.go`) |
| 6 | Fiduciary separation | S.8(5) | Per-tenant isolation via `TenantID` on every model with scoped indexes |
| 7 | Deletion mechanics exist | S.8(7) (mechanism only) | Cascading hard deletes remove all relations (`graph/cascade_delete.go`) |
| 8 | Data kept in-house for documents | S.8(2) | Local PDF generation; no external services receiving personal data |
| 9 | Secure account provisioning | S.8(5) | Hashed, single-use, 72h invite tokens (`invites/`) |
| 10 | Injection resistance, prod hardening | S.8(5) | Parameterized queries; GraphQL introspection/playground off in production |

---

## ❌ Non-Compliant Items

Severity: **Critical** = blocks compliance, exploitable or legally exposed today. **High** = required before 13 May 2027. **Medium** = partial control or hardening gap. **Low** = hygiene.

| # | Problem | DPDP Reference | Severity | Suggested Fix |
|---|---------|----------------|----------|---------------|
| 1 | **No consent or notice capture.** Zero consent records anywhere in the backend. DPDP requires itemized notice + free/specific/informed consent per purpose, available in English and the 22 Eighth-Schedule languages, with withdrawal as easy as granting. | S.5, S.6, Rules r.3 | **Critical** | Consent/notice engine: purpose-bound consent, notice versioning, multi-language templates, one-click withdrawal; plan consent-manager interoperability before 13 Nov 2026. |
| 2 | **No verifiable parental consent for children.** All students under 18 are children under DPDP. Guardian data exists (`models/student.go`) but no consent mechanism. Behavioral monitoring/tracking of children is restricted (S.9(3)); attendance and learning-progress tracking need exemption review. | S.9, Rules r.10 | **Critical** | Verifiable guardian consent (DigiLocker/ID-based per Rules) tied to existing guardian records; legal review of monitoring features against S.9(3) exemptions for educational institutions. |
| 3 | **No encryption at rest.** Health data, guardian details, and bank/PAN/PF numbers plaintext (`models/encounter.go`, `models/employee.go:78-99`); DB `sslmode=disable` default. Rules Schedule II explicitly names encryption as a minimum safeguard. | S.8(5), Rules Sch. II | **Critical** | Field-level encryption for sensitive columns; `sslmode=require`; infra DB encryption. |
| 4 | **Privacy policy misstates safeguards.** `frontend/app/privacy/page.tsx:53-56` claims encryption at rest + column-level encryption; neither exists. | S.5 (notice accuracy) | **Critical** | Correct policy or implement claims. |
| 5 | **No breach intimation workflow.** DPDP requires notifying **the Board and every affected Data Principal** (Rules: intimation without delay, detailed report within 72h). Nothing exists. | S.8(6), Rules r.7 | **High** | Incident module: detection log, affected-user enumeration, Board + user notification templates, 72h clock. |
| 6 | **Audit logs don't meet Rules requirements.** Rules Schedule II requires logs retained **minimum 1 year**; current logs have no retention guarantee, no read logging, no failed-login capture, mutable table. | S.8(5), Rules Sch. II | **High** | 1-year minimum log retention; read + failed-login auditing; tamper-evident storage. |
| 7 | **No erasure when purpose is served.** Indefinite retention; Rules require time-bound erasure for large fiduciaries with **48h prior notice** to the user before deletion. No scheduler exists in the codebase. | S.8(7), Rules r.8 | **High** | Retention engine: per-class retention config, scheduled purge/anonymize job, 48h pre-deletion notice emails. |
| 8 | **No Data Principal rights workflows.** No self-service access summary, correction, or erasure requests; rights routed to "your institution's administrator" with no in-product mechanism or published response timelines. | S.11, S.12, Rules r.13 | **High** | Rights-request module with identity verification, SLA tracking, and published timelines per tenant. |
| 9 | **No grievance redressal.** No grievance officer designation or ticketing. | S.13 | **High** | Per-tenant grievance officer contact + grievance workflow with response SLAs. |
| 10 | **No SDF readiness.** Hospitals/large institutes may be designated Significant Data Fiduciaries: DPO in India, annual DPIA, annual independent audit — none supported. | S.10, Rules r.12 | **High** | Tenant-level DPO designation field, DPIA templates/process, audit-support reporting. |
| 11 | **Weak authentication assurance.** No MFA, no per-account lockout (per-IP only), irrevocable 24h JWTs, no startup secret validation (`config/config.go` accepts empty `JWT_SECRET`). | S.8(5) | **High** | MFA for privileged roles; account lockout; token refresh + revocation; fail startup on missing secrets. |
| 12 | **No transport hardening.** No HSTS/security headers (`main.go`), opportunistic SMTP STARTTLS (`mailer/mailer.go:57-63`). | S.8(5) | **Medium** | Security-headers middleware; require-TLS SMTP. |
| 13 | **Processor obligations undocumented.** Platform-as-processor contract terms (S.8(2) requires processing only under valid contract) and tenant SMTP subprocessors untracked. | S.8(2) | **Medium** | Standard processor agreement; subprocessor register per tenant. |
| 14 | **Excessive internal access.** Module-level grants give staff tenant-wide access to all patients/students; admin bypasses matrix (`access_enforce.go:515`). | S.8(5) | **Medium** | Relationship-based scoping; audited break-glass for admins. |
| 15 | **Tenant isolation lacks systemic backstop.** Manual per-query `tenant_id` filters; single omission leaks another fiduciary's data. | S.8(5) | **Medium** | GORM global tenant scope or Postgres RLS. |
| 16 | **Hygiene:** stale README credentials, committed backup files, potential secrets in git history, client-trusted upload MIME. | S.8(5) | **Low** | Clean up, rotate historical secrets, magic-byte sniffing. |

---

## Timeline Checklist

| Deadline | Obligation | Status |
|---|---|---|
| Now | Data Protection Board constituted; soft enforcement underway | Monitor |
| 13 Nov 2026 | Consent-manager provisions effective | Consent engine + interop needed (#1) |
| 13 May 2027 | All substantive obligations enforceable | Items #1-11 must be closed |
