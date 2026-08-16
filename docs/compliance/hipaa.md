# HIPAA Compliance Documentation — CollERP

**Regulation:** US Health Insurance Portability and Accountability Act (Security Rule 45 CFR §164.302-318, Privacy Rule §164.500-534, Breach Notification Rule §164.400-414)
**Applies because:** the healthcare vertical stores PHI (patients, encounters, diagnoses, labs, radiology, pharmacy, IPD, insurance claims).
**Audit date:** 2026-07-13. Self-contained; see also `gdpr.md`, `dpdp.md`.

> Technical assessment, not legal advice.

---

## ✅ Compliant / Implemented Controls

| # | Control | HIPAA Reference | Implementation |
|---|---------|-----------------|----------------|
| 1 | Unique user identification | §164.312(a)(2)(i) | Per-user accounts, email or ID-based login, roles (`models/user.go`) |
| 2 | Role-based access control | §164.312(a)(1) | Three-layer access matrix (industry → subscription → role) enforced on every GraphQL root field (`graph/access_enforce.go`), resolver guards `requireAuth`/`requireRole` (`graph/authz.go`) |
| 3 | Patient self-access scoping | §164.524, minimum necessary | Patient portal resolves only the caller's own records via `patientForCaller` (`graph/patient_portal.resolvers.go`) |
| 4 | Person/entity authentication | §164.312(d) | bcrypt password hashing (`utils/password.go`), password policy (≥8 chars, upper/lower/digit), timing-safe anti-enumeration dummy hash |
| 5 | Session security | §164.312 | httpOnly + Secure + SameSite=Lax cookie (`handlers/auth.go:173`), 24h expiry, JWT algorithm-confusion protection (`utils/jwt.go`) |
| 6 | Login throttling | §164.308(a)(5) (partial) | Per-IP rate limit, 10/min (`middleware/auth.go:67`) |
| 7 | Audit of changes and logins | §164.312(b) (partial) | Every successful mutation + login recorded with actor, role, module, IP (`graph/audit_recorder.go`, `models/audit.go`); admin-only, tenant-scoped viewer |
| 8 | Tenant isolation | §164.308(a)(4) | `TenantID` on every model with scoped unique indexes; access middleware reads tenant from auth context |
| 9 | PHI stays on-server for documents | §164.308(b) | PDFs (discharge summary, receipts) generated locally with gofpdf; no third-party rendering service |
| 10 | Clinical record preservation | §164.530(j) | Deleting a clinician blanks `clinician_id` but preserves encounters/appointments (`graph/cascade_delete.go:61-76`) |
| 11 | Injection resistance | §164.306(a) | Parameterized GORM queries throughout; no user-controlled SQL concatenation |
| 12 | Secure invite provisioning | §164.308(a)(4) | 32-byte CSPRNG tokens stored as SHA-256 hashes, 72h TTL, single-use (`invites/`) |
| 13 | Production hardening of GraphQL | §164.306(a) | Introspection + playground disabled when `APP_ENV=production` (`graph/handler.go:39`) |

---

## ❌ Non-Compliant Items

Severity: **Critical** = blocks compliance, exploitable or legally exposed today. **High** = required control absent. **Medium** = partial control or hardening gap. **Low** = hygiene.

| # | Problem | HIPAA Reference | Severity | Suggested Fix |
|---|---------|-----------------|----------|---------------|
| 1 | **No encryption at rest.** Diagnoses, allergies, vitals, prescriptions, lab results, and employee bank/PAN data stored as plaintext columns (`models/encounter.go`, `models/employee.go:78-99`). No AES/pgcrypto anywhere in backend. | §164.312(a)(2)(iv), §164.312(e)(2)(ii) | **Critical** | Field-level AES-256-GCM (or pgcrypto) for clinical free-text and payment fields; full-disk/DB encryption at infra level; document key management. |
| 2 | **PHI reads/views are not audited.** Audit middleware fires only on `fc.Object == "Mutation"` (`graph/access_enforce.go:465`). HIPAA requires accounting of access to PHI, not just changes. | §164.312(b), §164.528 | **Critical** | Record audit entries for clinical read operations (patients, encounters, labs, radiology, pharmacy queries) with actor + patient ID. |
| 3 | **Audit log is not tamper-evident.** Plain GORM table in the same DB; no hash chaining, signing, or WORM storage; write failures silently swallowed (`audit_recorder.go:72`). | §164.312(b), §164.312(c)(1) | **High** | Hash-chain entries or stream to append-only storage; alert on audit write failure instead of `_ =` discard. |
| 4 | **Failed logins not in the audit trail.** Only `log.Printf` (`handlers/auth.go:107-127`). | §164.308(a)(5)(ii)(C) | **High** | Record failed attempts in `AuditLog` with IP + attempted identifier. |
| 5 | **No MFA.** No TOTP/WebAuthn/OTP anywhere. | §164.312(d) (addressable) | **High** | TOTP MFA, mandatory for admin and clinical roles. |
| 6 | **No per-account lockout.** Only per-IP throttling; distributed attacks bypass it. | §164.308(a)(5) | **High** | Lockout/backoff after N failures per account. |
| 7 | **No minimum-necessary among staff.** Any user with `encounters:view` reads every patient in the tenant; admin/super_admin bypass the matrix entirely (`access_enforce.go:515`). | §164.514(d) | **High** | Care-relationship scoping (treating clinician/department); break-glass access with mandatory audit for admins. |
| 8 | **No breach detection or notification workflow.** Nothing for incident logging or notifying individuals/HHS. | §164.400-414 | **High** | Incident module: detection log, affected-record enumeration, notification workflow, 60-day clock. |
| 9 | **No retention schedule or disposal process.** Data (incl. audit logs) lives indefinitely; no purge/anonymize jobs, no scheduler at all. | §164.316(b)(2), §164.310(d)(2)(i) | **High** | Retention config per data class (≥6 yrs for HIPAA docs); scheduled purge/anonymization job. |
| 10 | **No startup secret validation.** Empty `JWT_SECRET` silently signs tokens with an empty key; empty `SUPER_ADMIN_PASSWORD` seeds a hashed empty string (`config/config.go` — no validation despite `docs/archive/2026-06-10-code-review.md:100` claiming it). | §164.312(d) | **High** | Fail startup on missing/short `JWT_SECRET` and `SUPER_ADMIN_PASSWORD`. |
| 11 | **No transmission security in-app.** Plain `app.Listen` (`main.go:106`); no HSTS or security headers (zero matches for CSP/X-Frame-Options); DB default `sslmode=disable` (`.env.example`); SMTP STARTTLS opportunistic (`mailer/mailer.go:57-63`). | §164.312(e)(1) | **High** | Terminate TLS at proxy + add HSTS/helmet middleware; `sslmode=require`; require-TLS SMTP. |
| 12 | **No session revocation or idle timeout.** JWTs valid for full 24h; logout only clears the cookie. | §164.312(a)(2)(iii) | **Medium** | Short-lived access token + refresh token with revocation list; idle timeout. |
| 13 | **No BAA management.** Per-tenant SMTP servers are third parties handling names/emails; no business-associate tracking. | §164.308(b) | **Medium** | Contractual BAAs; document subprocessors. |
| 14 | **Tenant isolation relies on manual per-query filters.** ~200 of ~354 `.Find/.First` calls lack a same-line `tenant_id` filter (most scoped via verified parent IDs, but no backstop). | §164.308(a)(4) | **Medium** | GORM global tenant-scope callback or Postgres row-level security. |
| 15 | **Upload validation trusts client Content-Type header** (`handlers/photo_upload.go:85`). | §164.306(a) | **Low** | Sniff magic bytes before accepting. |
| 16 | **Hygiene:** stale default credentials in `backend/README.md:39`; committed `access_enforce.go.<numbers>` backup files; secrets possibly in git history. | §164.316 | **Low** | Fix README, delete stray files, rotate historical secrets. |
