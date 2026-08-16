# CollERP Compliance Gap Analysis: HIPAA, GDPR, DPDP

**Date:** 2026-07-13
**Scope:** Full codebase audit (backend Go/Fiber + GraphQL, frontend Next.js)
**Verticals in scope:** Education (students incl. minors, employees) and Healthcare (patients, encounters, labs, pharmacy, IPD, insurance) — the healthcare modules put PHI squarely in HIPAA scope.

> Disclaimer: this is a technical gap analysis, not legal advice. Engage counsel before certifying compliance.

---

## 1. Executive Summary

CollERP has a solid security core: bcrypt password hashing with anti-enumeration, httpOnly/SameSite cookie auth, strict CORS, a layered role/industry/subscription access matrix enforced on every GraphQL field, hashed single-use invite tokens, tenant-scoped data, and a mutation + login audit trail.

However, it is **not currently compliant** with any of the three regimes. The largest gaps are:

| # | Gap | HIPAA | GDPR | DPDP |
|---|-----|:-:|:-:|:-:|
| 1 | No encryption at rest for PHI/financial PII; DB `sslmode=disable` default | ✕ | ✕ | ✕ |
| 2 | Privacy policy claims encryption that does not exist in code | ✕ | ✕ | ✕ |
| 3 | Audit trail: no read/view logging, not tamper-evident, failed logins not audited | ✕ | – | ✕ |
| 4 | No consent capture (incl. verifiable parental consent for minors) | – | ✕ | ✕ |
| 5 | No data-subject export (portability) or erasure/anonymization flows | – | ✕ | ✕ |
| 6 | No data retention policies or purge automation | ✕ | ✕ | ✕ |
| 7 | No breach detection/notification workflow | ✕ | ✕ | ✕ |
| 8 | No MFA; no per-account lockout; no JWT revocation | ✕ | ✕ | ✕ |
| 9 | Minimum-necessary not enforced among staff (any clinician sees any patient) | ✕ | ✕ | – |
| 10 | No startup secret validation (empty `JWT_SECRET` silently accepted) | ✕ | ✕ | ✕ |

Legend: ✕ = gap against that regime's requirements, – = not directly required.

---

## 2. Data Inventory (what the system holds)

| Category | Fields | Location |
|---|---|---|
| Patient PHI | MRN, name, DOB, contact, address, blood group, allergies, chronic conditions, deceased status | `backend/models/patient.go` |
| Clinical PHI | Diagnosis, vitals, prescriptions, lab/radiology results, admissions, triage, OT, insurance claims (diagnosis + policy no.) | `models/encounter.go`, `lab.go`, `radiology.go`, `ipd.go`, `insurance.go`, etc. |
| Student PII (minors) | DOB, gender, blood group, address, guardian names/phones | `models/student.go` |
| Employee PII + financial | DOB, personal email, **bank account, IFSC, PAN, PF/UAN/ESI/NPS numbers (plaintext)** | `models/employee.go` |
| Credentials | Email + bcrypt password hash | `models/user.go` |

All sensitive fields are stored as **plaintext columns**. No Aadhaar/SSN/biometric fields exist.

---

## 3. HIPAA (Security + Privacy Rule)

Applies because of the hospital vertical. If US covered entities/business associates are not a target market, note that in your compliance posture; the controls below still map to DPDP "reasonable security safeguards".

### Compliant / partially compliant
- **Access control (§164.312(a))** — role-based access matrix on every GraphQL root field (`graph/access_enforce.go`), resolver-level `requireAuth`/`requireRole` (`graph/authz.go`), patient portal strictly self-scoped (`graph/patient_portal.resolvers.go`).
- **Authentication (§164.312(d))** — bcrypt, password policy, per-IP login rate limiting (`middleware/auth.go:67`), timing-safe dummy hash.
- **Transmission security (partial)** — httpOnly/Secure/SameSite cookies, strict CORS; but no in-app TLS/HSTS (`main.go:106`), SMTP STARTTLS is opportunistic (`mailer/mailer.go:57-63`), DB default `sslmode=disable`.

### Gaps
| Requirement | Gap | Fix |
|---|---|---|
| §164.312(b) Audit controls | Only mutations + successful logins logged (`graph/audit_recorder.go`); **PHI reads not logged**; failed logins only `log.Printf`; logs in same DB, mutable, write failures swallowed | Log clinical read operations; audit failed logins; add hash-chaining or ship logs to append-only store; alert on audit write failure |
| §164.312(a)(2)(iv) Encryption | No encryption at rest anywhere | pgcrypto/field-level AES for clinical text + payment fields; enable disk/DB encryption; `sslmode=require` |
| §164.514(d) Minimum necessary | Module-level access only; any clinician with `encounters:view` reads every patient in the tenant; admin/super_admin bypass matrix entirely (`access_enforce.go:515`) | Care-relationship scoping (treating clinician/department); break-glass with audit for admins |
| §164.312(a)(2)(iii) Auto logoff | 24h absolute JWT only, no idle timeout, no revocation | Short-lived access token + refresh, idle timeout, revocation list |
| §164.308 Administrative safeguards | No MFA, no account lockout, no breach/incident workflow, no retention schedule | MFA (TOTP), per-account lockout, incident response module, retention config |
| §164.308(b) BAAs | SMTP is per-tenant third party; no BAA tracking | Contractual, plus require TLS on SMTP |

---

## 4. GDPR

Relevant if any tenant handles EU residents' data.

### Compliant / partially compliant
- **Art. 32 (security)** — partial, same strengths/gaps as HIPAA above.
- **Art. 5(1)(f) integrity** — tenant isolation via `TenantID` on every model, though enforced by manual per-query filters with no global scope backstop.
- **Art. 17 (erasure)** — hard-delete cascades exist (`graph/cascade_delete.go`) but are admin-triggered feature deletes, not a data-subject erasure flow.

### Gaps
| Article | Gap | Fix |
|---|---|---|
| Art. 6/7 Lawful basis, consent | **Zero consent capture** in the entire backend (grep: no matches) | Consent model (purpose, timestamp, version, withdrawal), consent UI at onboarding |
| Art. 8 Children's consent | Guardian data stored, but no parental consent mechanism | Verifiable parental/guardian consent flow for minors |
| Art. 15/20 Access + portability | No "download my data" export | Per-user JSON/PDF export endpoint (reuse existing PDF infra) |
| Art. 17 Erasure | No subject-initiated erasure; no anonymization routine | Erasure request workflow; anonymize instead of delete where retention required (e.g. clinical records) |
| Art. 13/14 Transparency | `frontend/app/privacy/page.tsx` **claims column-level encryption and bounded backup deletion that do not exist** | Correct the policy immediately or implement the claims; a false policy is worse than no policy |
| Art. 30 Records of processing | None | ROPA document per module |
| Art. 33/34 Breach notification | Nothing (only quota "breach" exists) | Incident log + 72h notification workflow |
| Art. 25 Privacy by design | No retention limits, indefinite storage, no purge jobs (no scheduler exists at all) | Retention config per data class + background purge/anonymize job |
| Art. 28 Processors | Tenant SMTP servers process names/emails with opportunistic TLS only | Require TLS; DPA templates |

---

## 5. DPDP Act 2023 + DPDP Rules 2025 (India)

Most likely the binding regime for Indian institutes/hospitals. Rules were notified 13 Nov 2025; Data Protection Board provisions are live now, consent-manager provisions start 13 Nov 2026, and **substantive compliance obligations take effect 13 May 2027**. 2026 is effectively a soft-enforcement window, so there is time, but the build list below is long.

Each tenant (institute/hospital) is the **Data Fiduciary**; the platform is a Data Processor. Hospitals and institutions processing children's data at scale may be designated **Significant Data Fiduciaries** (DPO, DPIA, annual independent audit).

### Gaps
| Obligation | Gap | Fix |
|---|---|---|
| S.6 Consent + notice | No consent or notice capture; notice must be itemized, in English + scheduled Indian languages | Consent/notice engine with language support; consent-manager interop by Nov 2026 |
| S.9 Children (under 18) | Students are minors under DPDP; **verifiable parental consent required**; no tracking/behavioral monitoring of children without exemption | Parental consent flow tied to guardian records already in `models/student.go`; review attendance/monitoring features against S.9(3) |
| S.8(5) Security safeguards | Rules mandate encryption, access control, **logs retained 1 year**, backups | Encryption at rest, audit-log retention config (≥1 yr), documented backup policy |
| S.8(6) Breach intimation | None; DPDP requires notifying the Board **and each affected Data Principal** (Rules: without delay, details within 72h) | Breach workflow with user notification |
| S.11/12 Rights (access, correction, erasure) | No self-service access/correction/erasure; privacy page defers to admins | In-product request workflow with SLA tracking (Rules require published response timelines) |
| S.8(7) Erasure when purpose served | Indefinite retention | Retention schedule; Rules specify time-bound erasure with 48h prior notice to the user |
| Grievance redressal | None | Grievance officer contact + ticket workflow per tenant |
| SDF duties (if designated) | No DPO field, no DPIA process | Tenant-level DPO designation; DPIA templates |

---

## 6. Cross-cutting technical findings

1. **No startup secret validation** (`config/config.go`): empty `JWT_SECRET` signs tokens with an empty key; empty `SUPER_ADMIN_PASSWORD` seeds a super admin with a hashed empty string. `docs/archive/2026-06-10-code-review.md` claims this validation exists; it does not. **Fix first, trivial.**
2. **No security headers**: zero matches for HSTS/CSP/X-Frame-Options in backend; add a helmet middleware.
3. **Admin/super_admin bypass the access matrix** (`access_enforce.go:515`): no minimum-necessary segmentation over PHI for those roles.
4. **Tenant isolation is manual**: ~200 of ~354 `.Find/.First` calls lack a same-line `tenant_id` filter (most scoped via pre-verified parent IDs, but fragile). Add a GORM tenant scope callback or Postgres RLS as a backstop.
5. **Upload MIME validation trusts the client header** (`handlers/photo_upload.go:85`): sniff magic bytes.
6. **Hygiene**: stale default credentials in `backend/README.md:39`, committed `access_enforce.go.<numbers>` backup files, real secrets in local `backend/.env` (gitignored, but rotate anything ever committed to history).
7. **JWTs are irrevocable for 24h**; logout only clears the cookie.

---

## 7. Prioritized remediation roadmap

**P0 — quick wins (days)**
1. Startup validation of `JWT_SECRET` / `SUPER_ADMIN_PASSWORD` (fail fast).
2. Fix or retract the false encryption claims in `frontend/app/privacy/page.tsx`.
3. Security headers middleware + `sslmode=require` + require-TLS SMTP.
4. Audit failed logins; alert on audit write failures; delete stray backup files; fix README creds.

**P1 — core compliance features (weeks)**
5. Encryption at rest for clinical free-text + employee payment fields (field-level AES or pgcrypto).
6. Read/view audit logging for clinical modules + 1-year audit retention.
7. Consent module: notice versioning, purpose-bound consent, withdrawal, verifiable parental consent for students/patients under 18.
8. Data-subject rights: self-service export (JSON + PDF), correction request, erasure/anonymization workflow with admin approval.

**P2 — hardening (weeks-months)**
9. MFA (TOTP) at least for admin/clinical roles; per-account lockout; short-lived tokens + refresh/revocation; idle timeout.
10. Retention engine: per-data-class retention config + scheduled purge/anonymize job (introduces the first background scheduler).
11. Breach/incident module: detection log, Board + user notification workflow, grievance officer per tenant.
12. Minimum-necessary for staff: care-relationship scoping, break-glass access with audit; remove blanket admin bypass over clinical modules.
13. GORM tenant-scope callback or Postgres RLS.

---

## 8. What is already strong (keep)

bcrypt + password policy + anti-enumeration; algorithm-confusion-safe JWT parsing; httpOnly/Secure/SameSite cookies; strict CORS allowlist; mandatory auth on GraphQL with the three-layer access matrix; hashed, single-use, 72h invite tokens; parameterized queries throughout; patient portal self-scoping; local-only PDF generation (PHI never leaves the server for rendering); clinical history preserved on staff deletion; introspection/playground disabled in production.
