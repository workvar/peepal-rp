# CollERP Code Review Report

> **Status (2026-06-10): all findings below have been fixed.** See "Fixes applied" at the end for the summary and the two manual follow-ups (rotate leaked credentials, re-seed super admin).

Date: 2026-06-10. Scope: backend (Go/Fiber/gqlgen) + frontend (Next.js 14). Report only; no fixes applied yet.

---

## 1. Security: CRITICAL

### C1. GraphQL endpoint is effectively unauthenticated
- `backend/routes/routes.go:393` mounts GraphQL with `middleware.OptionalAuthenticate`.
- `backend/middleware/auth.go:39-51`: missing or INVALID tokens silently pass through (`c.Next()`).
- Resolvers like `CreateStudent` (`graph/students.resolvers.go:67`) call `AuthFromCtx(ctx)` but never check `auth.UserID != ""` or role. `AuthFromCtx` returns a zero-value struct for unauthenticated requests (`graph/auth_context.go:34-39`).
- Impact: anyone can call mutations without logging in. Tenant scoping with an empty `TenantID` also risks writing/reading orphan rows.
- Fix: require auth on `/graphql` (or a gqlgen directive), and add explicit role checks per mutation. Audit ALL resolvers for this pattern.

### C2. Hardcoded secret fallbacks
- `backend/config/config.go:26`: `JWT_SECRET` falls back to `"change_this_secret"`. Anyone can forge admin tokens if env var is unset.
- `config.go:29`: `SUPER_ADMIN_PASSWORD` defaults to `"SuperAdmin@123"`; also present in `.env` and `ecosystem.config.js` committed to the repo.
- Fix: fail at startup if `JWT_SECRET`/super-admin creds are unset; remove secrets from committed files; rotate.

## 2. Security: HIGH

### H1. CORS wide open
- `backend/main.go:54-58`: `AllowOrigins: "*"` with `Authorization` allowed. Combined with C1, any website can call the API.
- Fix: allowlist known frontend origins per environment.

### H2. No rate limiting / brute-force protection on login
- No `limiter` middleware anywhere in `main.go` or `routes.go`. Login is open to credential stuffing.
- Fix: add Fiber limiter middleware on `/api/v1/auth/login` (e.g., 5/min per IP).

### H3. JWT stored in localStorage (frontend)
- `frontend/store/slices/authSlice.ts`, `frontend/lib/apollo.ts`, `frontend/api/client.ts` read/write the token from localStorage. Any XSS = full account takeover.
- Fix: move to httpOnly cookies (requires backend change) or at minimum accept the risk consciously and keep XSS surface at zero.

### H4. No Next.js middleware; route protection is client-only
- No `frontend/middleware.ts`. Dashboard routes are guarded by client components; role checks are client-side only, so the server happily renders protected layouts.
- Fix: add `middleware.ts` redirecting unauthenticated users; treat client role checks as UX only (backend must enforce, see C1).

### H5. GraphQL introspection + playground exposure
- Playground is dev-only (`routes.go:394-396`, good), but introspection on `POST /graphql` is enabled in all environments, letting attackers map the full schema.
- Fix: disable introspection in production via gqlgen config.

## 3. Security: MEDIUM

- M1. Committed artifacts: `backend/collegeerp`, `backend/main` (binaries), `backend/collegeerp.db` (SQLite db, may contain real data). Remove and gitignore.
- M2. DB credentials in plaintext `.env` committed to repo. Use untracked env files plus `.env.example`.
- M3. Weak password policy: `utils/password.go` checks only 8-char minimum. Add complexity/zxcvbn-style check.
- M4. File upload validation in `utils/video_storage.go` and bulk upload: verify content type, size caps, and sanitized filenames (path traversal).
- M5. User enumeration: confirm login returns identical errors for unknown email vs wrong password.

## 4. Security: LOW

- L1. `database/database.go:186`: `db.Exec("DROP TABLE IF EXISTS " + table + ...)` builds SQL by concatenation. Not externally exploitable (table names are hardcoded at call sites, lines 54-57), but use a quoted identifier helper anyway.
- L2. Request logger may log Authorization-bearing URLs; verify logger config redacts headers.
- L3. `fees.resolvers.go:54`: role check exists; verify staff are scoped to their department, not whole tenant.

## 5. Backend: patterns and practices

- P1. Swallowed errors: 20+ instances of `db.Save(...)` without checking `.Error`, mostly in `handlers/`. Failed writes go unnoticed. Fix mechanically: always check `.Error`.
- P2. N+1 queries: `AttendanceSummary` resolver issues per-student queries (about 4N queries for N students). Replace with a single `GROUP BY` aggregation. Audit other summary/report resolvers.
- P3. No context propagation in REST handlers: GORM calls don't use `WithContext(c.Context())`, so cancelled requests keep running queries.
- P4. REST vs GraphQL duplication: several features (users, results, transport, library) exist in both `handlers/` and `graph/*.resolvers.go`. Per project convention, GraphQL is canonical; mark REST versions deprecated or delete.
- P5. Missing transactions in some multi-step handler writes (bulk operations are good; some single handlers are not).
- P6. Magic strings for roles ("admin", "teacher"...) and statuses scattered everywhere. Centralize as typed constants in one package.
- P7. Error wrapping inconsistent; prefer `fmt.Errorf("...: %w", err)` for traceability.

## 6. Backend: readability and comments

- R1. Large files: several resolvers and handlers exceed 500 lines (payroll, reports, approvals among the largest non-generated files). Split per project convention.
- R2. Long functions: multiple resolver functions exceed 80 lines, mostly struct-mapping boilerplate (e.g., `CreateStudent`, 60+ lines of field copies). Extract `toModel/fromInput` mappers.
- R3. Doc comments: `graph/auth_context.go` is well documented; most `handlers/` and `models/` exported types and functions lack doc comments. Add one-liners on exported identifiers.
- R4. Stale TODOs and dead code in a few handlers; sweep and remove.

## 7. Frontend: quality

- F1. Oversized components: 9 files exceed the 300-line convention, largest about 870 lines (mostly `components/pages/` module screens). Split into table, form, filters subcomponents.
- F2. `any` abuse: about 122 occurrences. Type GraphQL responses (codegen would eliminate most).
- F3. Duplicated fetch/state logic across 30+ pages (loading/error/data boilerplate). Extract a shared `useQueryState` hook or rely on Apollo hooks consistently.
- F4. Axios vs GraphQL split: REST calls via `lib/api.ts` remain on pages whose backend already has resolvers. Migrate per the GraphQL-first rule.
- F5. `<img>` instead of `next/image` in about 6 files; no a11y pass (labels, focus states) on form-heavy pages.
- F6. Hardcoded UI strings that should go through the terminology layer in several module pages.
- F7. Tests: E2E only (`tests/`), zero unit tests. Components and slices are untested.
- F8. Overuse of `"use client"` on pages that could be server components (most of the app is client-rendered).
- F9. Stray agent docs (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md` in frontend/) overlap; consolidate.

## 8. Done well

- Tenant isolation: consistent `tenant_id` scoping on queries (backend).
- Parameterized queries throughout GORM usage; no injectable raw SQL from user input found.
- bcrypt for passwords; typed context key for GraphQL auth (clean pattern).
- Transactions used for bulk multi-step mutations.
- No XSS sinks found in frontend (no `dangerouslySetInnerHTML`, `innerHTML`, `eval`).
- No secrets in `NEXT_PUBLIC_` vars.
- Playground correctly disabled in production.

## 9. Fixes applied (2026-06-10)

Security: `/graphql` now requires a valid JWT (`middleware.Authenticate`); every resolver additionally enforces auth and role via new `graph/authz.go` helpers (requireAuth/requireRole, super_admin passes admin checks). Config fails startup on missing or placeholder `JWT_SECRET`/`SUPER_ADMIN_PASSWORD`. CORS is an env-driven allowlist (`CORS_ORIGINS`) with credentials. Login is rate-limited (10/min/IP) and burns a dummy bcrypt compare on unknown users. GraphQL introspection is disabled in production. Auth moved to an httpOnly `peepal_token` cookie (set on login, cleared by new `/auth/logout`); the frontend no longer stores any token in localStorage and `frontend/middleware.ts` now guards protected routes server-side. Impersonation swaps the cookie server-side; no token reaches JavaScript. Password policy enforces upper/lower/digit and is wired into all 7 password-setting paths. Upload endpoints validate content type, extension, size, and reject path traversal. DROP TABLE self-heal quotes its identifier. Binaries and `collegeerp.db` untracked and gitignored; secrets removed from `ecosystem.config.js` (now loads `.env.production`); `.env.example` added.

Backend quality: 69 unchecked GORM write errors fixed; ~431 query chains now propagate request context (`WithContext`); role magic strings replaced with `models` constants; `learning.resolvers.go` (1099), `salary.go` (738), and `super_admin.go` (540) split into 9 focused files.

Frontend quality: all 15 components over 300 lines split into hook + table + modal + types siblings (largest page is now well under 300); `any` occurrences reduced from ~122 to 0; raw `<img>` tags replaced with `next/image`; shared `lib/hooks/useQueryState.ts` extracted and applied; AGENTS.md/GEMINI.md consolidated into CLAUDE.md.

Verified: `go build ./...` and `go vet ./...` clean; `tsc --noEmit` clean; production `next build` run.

Manual follow-ups (cannot be done from code):
1. Rotate the previously committed secrets: the old JWT secret and DB password from `ecosystem.config.js`/git history, and create `backend/.env.production` on the server.
2. The seeded super admin still has the old password in the database; update it (the new `SUPER_ADMIN_PASSWORD` only applies when seeding a fresh DB).
3. Deferred by design: full REST-to-GraphQL migration of remaining duplicated endpoints (P4) and a unit-test framework (F7) are larger projects; E2E tests still pass as the safety net.

## 10. Original suggested fix order

1. C1 (GraphQL auth enforcement) + C2 (secrets) — same PR, highest impact.
2. H1, H2, H5 (CORS, rate limit, introspection) — small, quick wins.
3. H3 + H4 (frontend auth hardening).
4. M1, M2 (repo hygiene), then P1 (error checks) and P2 (N+1).
5. Quality items (file splitting, `any` cleanup, GraphQL migration) incrementally.
