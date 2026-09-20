# Peepal (rosERP) — Orchestration & Onboarding Guide

This guide is the single reference for **developers** and **business admins** who need to understand, install, operate, and update Peepal — a multi-tenant ERP for educational institutes (and terminology-reskinned verticals).

**Product:** Peepal  
**Domains (production):** `*.roserp.workvar.com` (tenant apps) · `api-roserp.workvar.com` (API) · [peepal.app](https://peepal.app) (marketing / legal)  
**Stack:** Next.js 14 + TypeScript + Redux Toolkit + Apollo Client · Go Fiber + gqlgen + GORM · PostgreSQL (Aiven)

---

## Table of contents

1. [Who this is for](#1-who-this-is-for)
2. [System overview](#2-system-overview)
3. [System requirements](#3-system-requirements)
4. [Installation](#4-installation)
5. [Update schedule & release process](#5-update-schedule--release-process)
6. [Cloud infrastructure](#6-cloud-infrastructure)
7. [Business admin onboarding](#7-business-admin-onboarding)
8. [Developer onboarding](#8-developer-onboarding)
9. [Security, backups & support](#9-security-backups--support)
10. [Quick reference](#10-quick-reference)

---

## 1. Who this is for

| Audience | You will use this guide to… |
|----------|-----------------------------|
| **Developers** | Install the full stack locally, run migrations safely, ship features, deploy with PM2, and follow the update cadence. |
| **Business / institute admins** | Understand hosting boundaries, provision a tenant, configure roles & modules, and know what to expect from upgrades and backups. |
| **Ops / platform owners** | See cloud topology, env vars, ports, persistence volumes, and analytics properties. |

In-product technical docs also live under:

- Tenant: `/{tenant}/docs/dev`
- Super-admin: `/super/tech-docs`

---

## 2. System overview

```
Browser (tenant slug or /super)
        │
        ▼
Next.js 14 frontend  ──PM2──►  :3000
  · App Router, Tailwind
  · Apollo Client → GraphQL
  · axios → thin REST (auth, uploads, bulk)
  · JWT in httpOnly cookie `peepal_token` (+ refresh in `peepal_refresh`)
        │  rewrite /api/* → NEXT_PUBLIC_API_URL
        ▼
Go Fiber API  ──PM2──►  :8080
  · GraphQL (gqlgen) at /api/v1/graphql
  · REST for login, files, bulk CSV, super-admin
  · GORM (pgx) · JWT + bcrypt · tenant scoping
        │
        ▼
PostgreSQL (Aiven-managed)
  · One shared DB; every business row has tenant_id
  · Schema changes only via `go run main.go --migrate`
```

**Multi-tenancy:** Each institution is a tenant. URLs are namespaced as `/{tenant}/…` (or `{subdomain}.roserp.workvar.com`). Super-admin console is `/super/…` and is not tenant-scoped. Resolvers and handlers **must** filter by `tenant_id`.

---

## 3. System requirements

### 3.1 Developer workstation (local)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **OS** | macOS 12+, Windows 10/11 (WSL2), or Ubuntu 22.04+ | macOS 14+ or Ubuntu 24.04 LTS |
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 8 GB | 16 GB |
| **Disk** | 10 GB free (repos + deps + Playwright Chromium) | 25 GB free SSD |
| **Node.js** | 18.x LTS | 20.x LTS |
| **Package manager** | pnpm 8+ (frontend) · npm acceptable for some scripts | pnpm 9+ |
| **Go** | 1.21+ | 1.22+ |
| **Git** | 2.40+ | Latest |
| **Browser** | Chromium / Chrome / Edge (latest) | Same + Firefox for smoke checks |
| **Network** | Access to GitHub + Aiven (if using shared cloud DB) | Stable broadband; VPN if required by org policy |

Optional but useful: Docker (for isolated backend builds), PM2 (to mirror production process management).

### 3.2 Production / staging host (single-VM or small cluster)

Assumes Next.js + Go API on one host, DB on Aiven (external).

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB (16 GB if many concurrent tenants / heavy reports) |
| **Disk** | 40 GB SSD | 80+ GB SSD with separate volume for `backend/uploads/` |
| **Node.js** | 18.x LTS | 20.x LTS |
| **Go** | 1.21+ (build toolchain) | 1.22+; ship a static binary |
| **Process manager** | PM2 | PM2 + `pm2 startup` + `pm2 save` |
| **Reverse proxy** | Nginx or Caddy (TLS) | Nginx with HTTP/2, gzip/brotli, HSTS |
| **Outbound** | HTTPS to Aiven Postgres; DNS for `*.roserp.workvar.com` | Same + monitoring egress |

### 3.3 Managed database (Aiven PostgreSQL)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **Plan** | Small / startup plan (dev & light staging) | Production plan sized for peak concurrent queries |
| **PostgreSQL** | 14+ | 15+ or 16 |
| **Storage** | 10 GB | 50+ GB with automated growth alerts |
| **HA / replicas** | Single node (non-prod) | Multi-node / HA for production |
| **Backups** | Daily snapshots | Daily + PITR (point-in-time recovery) where available |
| **Connectivity** | TLS required; IP allowlist or VPC | VPC / private networking preferred |

### 3.4 End-user devices (business admins & staff)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **Browser** | Chrome / Edge / Firefox / Safari — last 2 major versions | Latest stable Chrome or Edge |
| **Screen** | 1280×720 | 1440×900 or higher |
| **Network** | Stable broadband | Wired or strong Wi‑Fi; avoid captive portals for long sessions |
| **Cookies** | Allow first-party cookies for the Peepal / workvar domain | Same (required for `peepal_token`) |

Mobile browsers can use many modules; dense admin tables and bulk tools are best on desktop.

---

## 4. Installation

### 4.1 Repository layout

Peepal is developed as a paired stack:

```
Peepal/
├── backend/     ← Go Fiber REST + GraphQL API
└── frontend/    ← Next.js 14 app (this repository: rosERP-frontend)
```

Clone both repositories your organisation uses for `backend` and `frontend`, then keep them as siblings (or follow your monorepo layout if you unify them).

### 4.2 Prerequisites checklist

1. Install **Node.js 18+** and **pnpm**.
2. Install **Go 1.21+**.
3. Obtain access to:
   - Frontend git remote (e.g. `rosERP-frontend`)
   - Backend git remote
   - Aiven Postgres connection string (`DB_PATH`) for shared/staging DB, **or** a local Postgres for fully offline work
4. Ask a platform owner for non-production credentials (never use production admin passwords locally).

### 4.3 Backend install

```bash
cd backend

# Copy and edit environment
cp .env.example .env
# Set at least:
#   DB_PATH=<postgres DSN from Aiven or local>
#   JWT / admin seed values for non-prod

go mod tidy

# First boot with schema sync (opt-in migrations)
go run main.go --migrate

# Subsequent boots (no schema changes)
go run main.go
# API listens on :8080
```

**Default seeded admin (change before any shared environment):**

| Field | Value |
|-------|--------|
| Email | `admin@college.edu` |
| Password | `Admin@123` |

**Migration rule:** A normal restart does **not** run GORM AutoMigrate. Pass `--migrate` only when models changed. Running `--migrate` may also regenerate the DB visualizer schema consumed by the frontend (`npm run gen:schema` / `pnpm gen:schema` from the frontend can regenerate it independently when Node is available).

### 4.4 Frontend install

```bash
cd frontend   # or the root of this repo

cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080
# Optional analytics (leave blank locally):
#   NEXT_PUBLIC_GA_MEASUREMENT_ID=
#   NEXT_PUBLIC_CLARITY_PROJECT_ID=

pnpm install
pnpm dev
# App at http://localhost:3000
```

`next.config.js` rewrites `/api/:path*` to `${NEXT_PUBLIC_API_URL}/api/:path*`. GraphQL clients call `{API}/api/v1/graphql` with credentials included; tenant context is sent via `X-Tenant-ID` when present.

### 4.5 Production install (single host)

```bash
# --- Backend ---
cd backend
go build -o collegeerp .
# Start with PM2 (ecosystem.config.js API entry)
pm2 start ecosystem.config.js

# Apply schema only as part of a planned release
./collegeerp --migrate   # or: go run main.go --migrate before swapping binary

# --- Frontend ---
cd ../frontend
pnpm install --frozen-lockfile
pnpm build
pm2 start ecosystem.config.js   # peepal-frontend → next start :3000

pm2 save
pm2 startup
```

Production frontend ecosystem defaults (see `ecosystem.config.js`):

- Process name: `peepal-frontend`
- Bind: `0.0.0.0:3000`
- `NEXT_PUBLIC_API_URL=https://api-roserp.workvar.com`

**Persistent volume:** Mount `backend/uploads/` on durable storage. Photo uploads and generated payslip PDFs are written there and are **outside** the Go binary.

**TLS / DNS:** Terminate TLS at the reverse proxy. Point tenant hostnames (`*.roserp.workvar.com`) and the API hostname at the appropriate targets.

### 4.6 Optional: Docker (backend)

```bash
cd backend
docker build -t peepal-backend .
docker run -p 8080:8080 \
  -e DB_PATH="<dsn>" \
  -v peepal-uploads:/app/uploads \
  peepal-backend
```

Prefer PM2 + bare metal/VM for the documented production path unless your org standardises on containers.

### 4.7 Verification

| Check | Expect |
|-------|--------|
| `GET` API health / login page | Backend responds on `:8080` |
| Open `http://localhost:3000` | Marketing or login loads |
| Sign in with seeded or test admin | Cookie `peepal_token` set; redirect into dashboard |
| Super-admin `/super/login` | Platform console reachable for authorised users |
| Tenant `/{slug}/login` | Tenant-scoped session |

E2E (developers): with backend + `pnpm dev` running:

```bash
pnpm test:install
cp tests/.env.example tests/.env
pnpm test
```

---

## 5. Update schedule & release process

### 5.1 Recommended cadence

| Channel | Cadence | Contents | Audience impact |
|---------|---------|----------|-----------------|
| **Hotfix / security** | As needed (same day) | CVEs, auth bugs, data-leak fixes | Brief maintenance window if restart required |
| **Patch** | Weekly (e.g. Tuesday) | Bug fixes, copy, small UX | Low; usually rolling restart |
| **Minor** | Bi-weekly or monthly | New modules, GraphQL fields, non-breaking schema | Short window; run `--migrate` if models changed |
| **Major** | Quarterly (planned) | Breaking API/schema, role-model changes, infra moves | Announced in advance; admin checklist |

Business admins should treat **Tuesday patch windows** (or your org’s equivalent) as the default “quiet change” day, and expect an email/notice before minor/major releases.

### 5.2 Suggested weekly rhythm (engineering)

| Day | Activity |
|-----|----------|
| Mon | Triage; freeze candidates for Tuesday patch |
| Tue | Deploy patch/minor to staging → smoke → production (low traffic window) |
| Wed–Thu | Feature development; schema work on feature branches |
| Fri | No production schema migrations unless hotfix; tag weekly build |

### 5.3 Deployment steps (every release)

1. **Announce** window to admins if downtime or migration is expected.
2. **Backup** Aiven (snapshot / confirm latest automated backup is green).
3. Deploy **backend** binary first (compatible with old frontend when possible).
4. If models changed: run **once** with `--migrate` against production DSN from a controlled shell.
5. Deploy **frontend** (`pnpm build` + PM2 reload / restart).
6. **Smoke test:** login (super + one tenant), one GraphQL list query, one file upload path.
7. **Monitor** error logs and Clarity/GA for anomalies for 30–60 minutes.
8. **Rollback:** previous PM2 binary/build + restore DB only if migration was destructive (prefer forward-fixes).

### 5.4 Schema & GraphQL discipline

- Prefer **expand → migrate → deploy → contract** for breaking changes.
- Regenerate GraphQL schema from live introspection; do not hand-edit generated artefacts casually.
- After migrate, regenerate frontend DB schema docs: `pnpm gen:schema` when applicable.
- Never run destructive SQL in production without a backup and a written rollback plan.

### 5.5 Dependency updates

| Dependency class | Schedule |
|------------------|----------|
| Security patches (Node, Go, Next, Fiber) | Within 7 days of advisory |
| Routine npm/pnpm & Go module bumps | Monthly on staging, then production |
| Major framework upgrades (Next, Go) | Dedicated major release; full regression + Playwright suite |

---

## 6. Cloud infrastructure

### 6.1 Topology (production reference)

| Component | Provider / location | Notes |
|-----------|---------------------|-------|
| **Web app** | VM / host behind reverse proxy | Next.js via PM2 (`peepal-frontend`), port 3000 |
| **API** | Same or adjacent host | Go Fiber binary via PM2, port 8080; public hostname `api-roserp.workvar.com` |
| **Database** | **Aiven PostgreSQL** | DSN in `DB_PATH`; TLS; GORM/pgx driver |
| **Object / files** | Local `backend/uploads/` on persistent disk | Photos, payslip PDFs — back up this volume |
| **DNS / TLS** | Org DNS + proxy certificates | Tenant pattern `*.roserp.workvar.com` |
| **Analytics** | Google Analytics 4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-…`); no-ops if unset |
| **Session replay / UX** | Microsoft Clarity | `NEXT_PUBLIC_CLARITY_PROJECT_ID` (build-time public ID) |
| **Legal / marketing** | peepal.app | Terms `/terms`, Privacy `/privacy` |

### 6.2 Environment variables

**Frontend (`.env.local` / PM2 `env`):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Origin of Go API (e.g. `http://localhost:8080` or `https://api-roserp.workvar.com`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement ID; leave empty in local/CI |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Optional Clarity project override |
| `NODE_ENV` / `PORT` | Production process settings (`production`, `3000`) |

**Backend (illustrative — see backend `.env.example`):**

| Variable | Purpose |
|----------|---------|
| `DB_PATH` | PostgreSQL DSN (Aiven or local) |
| Admin seed / JWT secrets | Must be unique per environment; rotate on compromise |

Never commit real `.env` / `.env.local` files. Use secret managers or host-level env injection in production.

### 6.3 Auth & tenancy (ops view)

- Access-token lifetime: **15 minutes**; cookie name `peepal_token` (httpOnly).
- Session lifetime: **30 days**, carried by the `peepal_refresh` cookie (httpOnly, rotated on every use). Clients renew silently via `POST /api/v1/auth/refresh`; a replayed refresh token revokes the whole session.
- Frontend middleware checks presence/expiry for UX redirects only; **authorization is enforced on the API**.
- GraphQL requests include credentials; tenant header `X-Tenant-ID` when set in the client.
- Super-admin (`/super`) manages tenants, plans, subscriptions; institute admins manage users/roles inside their tenant.

### 6.4 Data residency & encryption

Per product privacy commitments:

- Workspace data lives in **managed cloud databases** with encryption **at rest and in transit**.
- Backups are encrypted and retained for a **short, bounded window**.
- Sensitive fields (e.g. payment details) use **column-level encryption** on top of transport security.
- Engineering access to production data is exceptional, ticketed, and logged.

Confirm region/Aiven project placement with your platform owner for institutional compliance (DPDP, GDPR, etc.).

### 6.5 Networking checklist

1. Allowlist app hosts on Aiven (or use private networking).
2. Open only **443** (and 80→443) publicly; keep `:8080` / `:3000` on localhost or private NIC if the proxy terminates TLS.
3. Configure CORS/cookie domains consistently with `roserp.workvar.com` (and any custom domains).
4. Ensure reverse proxy forwards cookies and does not strip `Authorization` / tenant headers needed by the API.

### 6.6 Observability

| Signal | Tool / location |
|--------|-----------------|
| Process health | `pm2 status`, `pm2 logs` |
| Product analytics | GA4 (`/dev/analytics` lists event registry for engineers) |
| UX heatmaps / sessions | Microsoft Clarity |
| App errors | Host logs + any APM your org attaches |
| DB | Aiven console (connections, disk, backups) |

### 6.7 Related in-app guides

| Guide | Where |
|-------|--------|
| Architecture, modules, approvals | `/{tenant}/docs` and `/super/tech-docs` |
| Deployment notes | Docs → Deployment (PM2, uploads volume, `--migrate`) |
| Local workflow | Docs → Local development / DevOps chapter |
| E2E tests | `tests/README.md`, `tests/AUTHORING.md` |
| Analytics event catalogue | `/dev/analytics` |

---

## 7. Business admin onboarding

### 7.1 First-week checklist

1. Receive tenant URL (`https://{subdomain}.roserp.workvar.com` or path-based `/{tenant}`) and **admin** credentials from the platform owner (super-admin).
2. Sign in → change password immediately.
3. Confirm **subscription / enabled modules** with Workvar / Peepal support.
4. Create **roles** and map access (admins, teachers, staff, students, custom roles).
5. Import or create **employees** and **students** (use bulk CSV tools where available).
6. Configure **academic year**, calendars/holidays, and fee/payroll settings as licensed.
7. Invite users; verify one user per major role can sign in and only sees allowed modules.
8. Bookmark legal pages: [Terms](https://peepal.app/terms), [Privacy](https://peepal.app/privacy).

### 7.2 Day-to-day ownership

| Area | Admin responsibility |
|------|----------------------|
| Users & access | Create/disable accounts; least-privilege roles |
| Academic ops | Years, subjects, attendance, marks, leaves |
| HR / payroll | Employee records, payslips (files stored server-side) |
| Fees / finance | Ledgers and receipts per your licence |
| Comms | Announcements / email settings your plan includes |
| Data requests | Handle access/correction/deletion requests for your institution |

### 7.3 What admins should know about updates

- Routine patches usually need **no action**.
- Releases that change workflows will be noted in release notes; re-train staff if UI navigation changes.
- During announced maintenance, ask users to save work; sessions may expire (30d max, and a restart that changes `JWT_SECRET` signs everyone out).
- Never share super-admin credentials; escalate tenant-level issues to your institute admin first, then Workvar support.

---

## 8. Developer onboarding

### 8.1 First-day path

1. Read this file + root `README.md`.
2. Install toolchain (Node 18+, pnpm, Go 1.21+).
3. Bring up backend (`--migrate` once) and frontend (`pnpm dev`).
4. Log in; open `/{tenant}/docs/dev` and `/super/tech-docs`.
5. Run a focused Playwright smoke if credentials allow (`pnpm test`).

### 8.2 Feature workflow (end-to-end)

1. **Model first** — GORM model with `tenant_id` + UUID hooks under `backend/models`.
2. **Migrate** — `go run main.go --migrate`.
3. **API** — Prefer GraphQL resolver under `backend/graph`; REST only for auth, files, bulk, or streaming.
4. **Frontend** — Thin `app/.../page.tsx`; logic in `components/pages/...`.
5. **State** — Apollo for server data; Redux for auth/org chrome/terminology.
6. **Navigation** — Register module entries so the tile appears.
7. **Tests** — Extend Playwright hierarchy carefully (ordered, LIFO cleanup).

**Golden rule:** never query business tables without a tenant filter.

### 8.3 Roles & modules (product map)

| Module area | Typical roles |
|-------------|---------------|
| Dashboard | All authenticated |
| Users / access | Admin |
| Employees / payroll | Admin, Staff (as configured) |
| Students / academics | Admin, Teacher, Student (scoped) |
| Attendance / marks / leaves | Per access matrix |
| Super-admin (tenants, plans, subscriptions) | Platform operators only |

Exact entitlements are driven by the live access matrix and subscription modules — check `/super` and tenant access settings rather than hard-coding assumptions.

---

## 9. Security, backups & support

| Topic | Practice |
|-------|----------|
| **Secrets** | Unique JWT/admin secrets per env; rotate after staff offboarding |
| **Uploads volume** | Include in backup policy alongside Postgres |
| **DB backups** | Rely on Aiven schedules; test restore quarterly |
| **Least privilege** | Prefer role templates; audit admin accounts monthly |
| **Dependencies** | Follow §5.5 update schedule |
| **Incidents** | Capture `pm2 logs`, approximate time UTC, tenant slug, and user role before escalating |

Support escalation path (adjust to your contract): Institute admin → Workvar / Peepal support → engineering on-call.

---

## 10. Quick reference

| Item | Value |
|------|--------|
| Frontend dev | `pnpm dev` → `http://localhost:3000` |
| Backend dev | `go run main.go` → `http://localhost:8080` |
| Migrate | `go run main.go --migrate` |
| GraphQL | `{API}/api/v1/graphql` |
| Prod API | `https://api-roserp.workvar.com` |
| Auth cookies | `peepal_token` (httpOnly, ~15m) + `peepal_refresh` (httpOnly, ~30d) |
| DB | Aiven PostgreSQL via `DB_PATH` |
| Process manager | PM2 + `ecosystem.config.js` |
| Uploads | `backend/uploads/` (persistent disk) |
| Package manager | pnpm (frontend) |
| Node / Go | Node 18+ (20 recommended) · Go 1.21+ |
| In-app docs | `/{tenant}/docs/dev`, `/super/tech-docs` |
| Analytics QA | `/dev/analytics` |

---

*Document version: 1.0 · Aligned with Peepal / rosERP frontend & documented cloud topology (Aiven, PM2, workvar hostnames). Update this file when ports, domains, or migration policy change.*
