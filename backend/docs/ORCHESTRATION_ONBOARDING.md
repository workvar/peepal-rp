# Peepal — Orchestration & Onboarding Guide

Audience: **developers** installing Peepal for local or server work, and **business / platform admins** standing up tenants, plans, and day-two operations.

This repository is the **Peepal (rosERP) backend** — a multi-tenant SaaS ERP API for education, healthcare, corporate, and nonprofit verticals. The companion Next.js frontend is maintained separately; production hostnames currently resolve under `workvar.com`.

| Surface | Hostname (production) |
|---------|------------------------|
| Web app | `https://roserp.workvar.com` |
| API | `https://api-roserp.workvar.com` |

---

## 1. System overview

```
Browser (Next.js :3000)
        │  CORS + httpOnly cookie `peepal_token` (or Bearer JWT)
        ▼
Go Fiber API (:8080 default / :3001 in .env.example)
        ├── REST   /api/v1/...
        ├── GraphQL POST /api/v1/graphql
        ├── Static uploads (photos, learning media)
        └── GET /health
                │
                ├── PostgreSQL (required; Aiven-managed in cloud)
                ├── Local disk ./uploads/
                ├── Ollama (optional — Ask PeepalAI NL→SQL)
                └── SMTP (platform + per-tenant settings in DB)
```

**Roles at a glance**

| Role | Who | Responsibility |
|------|-----|----------------|
| Super admin | Platform operator | Tenants, plans, modules, platform SMTP, subscriptions |
| Org admin | Institute / hospital / company admin | Users, modules in scope, operational data |
| Staff / industry roles | End users | Domain workflows (students, patients, payroll, etc.) |

---

## 2. System requirements

### 2.1 Backend (this repo)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Linux, macOS, or WSL2 | Ubuntu 22.04 LTS (or newer) |
| CPU | 2 vCPU | 4+ vCPU |
| RAM | 4 GB | 8 GB (16 GB if running Ollama locally) |
| Disk | 20 GB free | 50+ GB SSD (uploads + DB backups) |
| Go | **1.25.x** (see `go.mod`) | Same major/minor as `go.mod` |
| PostgreSQL | 14+ | **16+** managed (Aiven or equivalent) |
| Process manager (prod) | systemd or PM2 | **PM2** (`ecosystem.config.js`) |
| Docker (optional) | Docker 24+ | Docker 24+ with BuildKit |

### 2.2 Frontend (companion app — not in this repo)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18 LTS | **20 LTS** |
| npm / pnpm | npm 9+ | Current LTS package manager |
| Browser | Last 2 versions of Chrome / Edge / Firefox / Safari | Same |

### 2.3 Optional — Ask PeepalAI (local Ollama)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB free for model | 16 GB+ |
| GPU | Not required | NVIDIA GPU with ≥8 GB VRAM |
| Ollama | Latest stable | Latest stable |
| Model | `llama3.1:8b` (default) | Same unless ops specifies another tag |

PeepalAI is designed so query generation stays on the machine running Ollama (`OLLAMA_URL`, default `http://localhost:11434`).

### 2.4 Network & ports

| Service | Dev default | Notes |
|---------|-------------|--------|
| Backend API | `3001` (`.env.example`) or `8080` (code default) | Pick one and keep CORS / frontend env aligned |
| Frontend | `3000` | Listed in `CORS_ORIGINS` |
| PostgreSQL | `5432` | Use SSL in cloud (`sslmode=require`) |
| Ollama | `11434` | Local only unless deliberately exposed |
| Health check | `GET /health` | Load balancer / uptime probes |

---

## 3. Installation — developers

### 3.1 Prerequisites checklist

1. Install Go **1.25+** and ensure `go` is on `PATH`.
2. Install / provision **PostgreSQL** and create an empty database.
3. Clone this repository.
4. Have a strong secret ready: `openssl rand -base64 48` (≥32 characters).
5. Choose a super-admin password (≥8 characters, upper + lower + digit).

### 3.2 Local install (source)

```bash
# 1. Clone
git clone <this-repo-url>
cd rosERP-backend   # or your local folder name

# 2. Environment
cp .env.example .env
# Edit .env — required keys:
#   JWT_SECRET, DB_PATH, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
# Optional:
#   PORT, APP_ENV, CORS_ORIGINS, COOKIE_DOMAIN, APP_BASE_URL,
#   OLLAMA_URL, OLLAMA_MODEL

# 3. Dependencies
go mod tidy

# 4. Schema + platform seed (migrations do NOT run on normal start)
go run . --migrate

# 5. Run API
go run .
```

Verify:

```bash
curl -s http://localhost:3001/health
# {"status":"ok"}
```

Log in through the frontend against the seeded **super admin** (`SUPER_ADMIN_*` values). GraphQL Playground is available in non-production only.

### 3.3 Environment reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No | Listen port (`8080` code default; example uses `3001`) |
| `APP_ENV` | No | `development` or `production` (cookie Secure + GraphQL introspection) |
| `JWT_SECRET` | **Yes** | JWT + related HMAC material — min 32 chars recommended |
| `DB_PATH` | **Yes** | Postgres URL, e.g. `postgres://user:pass@host:5432/db?sslmode=disable` |
| `SUPER_ADMIN_EMAIL` | **Yes** (first seed) | Platform super admin email |
| `SUPER_ADMIN_PASSWORD` | **Yes** (first seed) | Platform super admin password |
| `CORS_ORIGINS` | Yes in practice | Comma-separated frontend origins |
| `COOKIE_DOMAIN` | Prod only | Empty locally; e.g. `.workvar.com` in production |
| `APP_BASE_URL` | Invite emails | Frontend base URL, no trailing slash |
| `OLLAMA_URL` | Optional | Default `http://localhost:11434` |
| `OLLAMA_MODEL` | Optional | Default `llama3.1:8b` |

**Never commit** `.env` or `.env.production`. SMTP credentials live in the database (super-admin UI), not in env files.

### 3.4 Useful CLI one-shots

| Command | When |
|---------|------|
| `go run . --migrate` | Apply schema, seed plans/modules/roles, reconcile super admin from env, exit |
| `go run . --clear-seeded-modules` | Clear tenant `modules_override` (one-off ops) |
| `go run . --backfill-uhid` | Backfill patient UHID for legacy rows |
| `./regen.sh` | Regenerate gqlgen after GraphQL schema changes |

### 3.5 Docker (optional)

```bash
docker build -t peepal-backend .
docker run --env-file .env -p 8080:8080 peepal-backend
```

Notes:

- The Dockerfile may lag `go.mod` (builder image version / binary name). Prefer aligning the image with Go **1.25** and your chosen `PORT` before production use.
- Still run migrations explicitly against the target database (`--migrate`) before relying on a fresh environment.
- There is no `docker-compose` in-repo yet; run Postgres (and optionally Ollama) as sibling containers or managed services.

### 3.6 Frontend pairing

1. Clone the Peepal frontend repository (separate from this backend).
2. Point its API / proxy config at your backend (`PORT` + `CORS_ORIGINS` must match).
3. Leave `COOKIE_DOMAIN` empty for localhost so the auth cookie is host-only.
4. Start with `npm install` and `npm run dev` (Node 18+).

---

## 4. Installation — production / business ops

### 4.1 Recommended production topology

| Layer | Recommendation |
|-------|----------------|
| Compute | Linux VM (or equivalent) sized to §2.1 Recommended |
| API process | Built binary `./main` under **PM2** (`ecosystem.config.js` → app name `peepal-backend`) |
| Secrets | `.env.production` on the server only (`env_file` in PM2 config) |
| Database | **Aiven-managed PostgreSQL** (or equivalent managed Postgres) with SSL |
| TLS / edge | Reverse proxy or load balancer terminating HTTPS for `api-roserp.workvar.com` |
| Frontend | Deployed separately to `roserp.workvar.com` |
| Media | Local `./uploads/` on the API host — include in backup; plan object-storage migration for scale |
| Email | Configure platform SMTP in super-admin UI; tenants may override |
| AI | Optional Ollama on the same host or a private sidecar — do not expose publicly |

### 4.2 Production bootstrap sequence

1. Provision Postgres (Aiven). Create DB user with least privilege; collect SSL connection string → `DB_PATH`.
2. Provision VM; install Go toolchain **or** build the binary in CI and copy `main` to the host.
3. Install Node only if you also host the frontend on the same machine; otherwise API-only.
4. Install PM2 globally (`npm i -g pm2`) if using the provided ecosystem file.
5. Deploy code/binary; create `.env.production`:

```bash
PORT=8080
APP_ENV=production
JWT_SECRET=<openssl rand -base64 48>
DB_PATH=postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require
SUPER_ADMIN_EMAIL=ops@your-org.com
SUPER_ADMIN_PASSWORD=<strong password>
CORS_ORIGINS=https://roserp.workvar.com
COOKIE_DOMAIN=.workvar.com
APP_BASE_URL=https://roserp.workvar.com
```

6. Migrate once:

```bash
./main --migrate
# or: go run . --migrate
```

7. Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # enable reboot persistence
```

8. Point the load balancer health check at `GET /health`.
9. Confirm cookie login across `roserp` ↔ `api-roserp` (shared `COOKIE_DOMAIN`).
10. In super-admin UI: set platform SMTP, create first tenant, assign plan/modules, invite org admin.

### 4.3 Business admin first-week checklist

1. **Platform SMTP** — required for invite / password-setup emails.
2. **Plans & modules** — Education / Hospital defaults are seeded; adjust catalog as needed.
3. **Create tenant** — subdomain, vertical (education / healthcare / corporate / nonprofit), timezone, currency.
4. **Subscription** — assign plan; confirm module entitlements; watch login gates for expired / inactive subscriptions.
5. **Invite org admin** — use invite flow so passwords are set via `APP_BASE_URL` links.
6. **Branding / subdomain** — ensure DNS and frontend tenant routing match the subdomain.
7. **Data load** — use bulk CSV endpoints where available; validate on a staging tenant first.
8. **Roles** — industry system roles are seeded; add custom roles only when the access matrix requires it.

---

## 5. Update schedule & release practice

Migrations are **opt-in** (`--migrate`). A normal process restart never alters schema. Treat that as the backbone of the update cadence.

### 5.1 Recommended cadence

| Stream | Cadence | Owners | Notes |
|--------|---------|--------|-------|
| Security patches (Go, OS, Postgres, PM2/Node) | **Weekly** review; critical CVEs within **24–48h** | Platform eng / DevOps | Rebuild binary after Go upgrades |
| Application releases | **Bi-weekly** (or faster for hotfixes) | Engineering | Tag releases; changelog for admins |
| Schema migrations | **With** the release that needs them | Engineering + DBA | Always backup DB first; run `--migrate` in a maintenance window |
| Dependency bumps (`go get` / frontend npm) | **Monthly** | Engineering | Run tests + `regen.sh` if GraphQL tooling changes |
| Managed DB maintenance (Aiven) | Follow provider window; prefer **off-peak** | Ops | Enable PITR / daily backups |
| Certificate renewal | Auto (Let’s Encrypt / cloud LB) — audit **quarterly** | Ops | |
| JWT / SMTP / DB credential rotation | **Quarterly** or on staff change | Security + Ops | `JWT_SECRET` rotation invalidates sessions |
| Uploads / backup restore drill | **Quarterly** | Ops | Restore to staging and smoke-test login + one vertical flow |
| Super-admin access review | **Monthly** | Business admin | Remove unused platform accounts |

### 5.2 Standard application update procedure

```bash
# 1. Announce short maintenance window if migration is included
# 2. Backup Postgres (Aiven snapshot / pg_dump) and ./uploads/

git pull origin <release-branch>

# 3. Build
go build -o main .

# 4. If the release notes say "requires migration":
./main --migrate

# 5. Reload process (zero-downtime-ish restart under PM2)
pm2 restart peepal-backend

# 6. Smoke tests
curl -fsS https://api-roserp.workvar.com/health
# Login as super admin + one org admin; hit one GraphQL query and one REST PDF/bulk path if changed
```

**Rollback:** redeploy previous `main` binary; restore DB only if a migration already ran and is not backward-compatible. Keep the prior binary and the pre-migrate dump until the release is verified.

### 5.3 Developer day-to-day updates

1. Pull latest `main` (or feature branch).
2. `go mod tidy` if dependencies changed.
3. If `graph/schema.graphqls` changed: run `./regen.sh`, implement new resolvers in module files (not the stub).
4. Apply local migrations: `go run . --migrate`.
5. Restart `go run .` and the frontend.

---

## 6. Cloud infrastructure guide

### 6.1 What Peepal uses today

| Concern | Current approach | Guidance |
|---------|------------------|----------|
| Primary datastore | **Aiven-managed PostgreSQL** | Use SSL URLs in `DB_PATH`; enable automated backups + PITR |
| API hosting | VM + **PM2** binary (`peepal-backend`) | Prefer one clear deploy path; document host access in your runbook |
| Frontend hosting | Separate deploy to `roserp.workvar.com` | Keep `CORS_ORIGINS` and `APP_BASE_URL` exact |
| Auth cookies | Shared parent domain `.workvar.com` | Required for cross-subdomain httpOnly cookie |
| Object / media storage | Local `./uploads` | Back up with the host; plan S3-compatible storage before multi-node API |
| Email | DB-configured SMTP | Prefer transactional provider (SES, Postmark, etc.) with SPF/DKIM |
| AI | Local **Ollama** | Keep private network; no public ingress |
| Secrets | `.env.production` on host | Migrate to a secrets manager when the fleet grows |
| Observability | PM2 logs + `/health` | Add centralized logging/metrics before multi-tenant scale-out |
| IaC / k8s | Not in this repository | Introduce Terraform/Helm only when multi-env parity is required |

### 6.2 Aiven / Postgres checklist

1. Create a dedicated Peepal service (not shared with unrelated apps).
2. Restrict inbound IP allowlists to API hosts / bastion.
3. Connection string form:

   `postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`

4. Enable daily backups and test restore.
5. Size storage for growth of operational tables + audit history.
6. Run `ANALYZE` / watch connection counts after bulk imports.
7. Never point a developer laptop at production without read-only credentials and approval.

### 6.3 DNS, TLS, and cookies

| Item | Value / action |
|------|----------------|
| Frontend DNS | `roserp.workvar.com` → frontend origin |
| API DNS | `api-roserp.workvar.com` → API / LB |
| TLS | Valid certs on both hostnames |
| `COOKIE_DOMAIN` | `.workvar.com` |
| `CORS_ORIGINS` | Exact frontend origin(s), no `*` |
| `APP_ENV` | `production` (enables Secure cookies; disables GraphQL playground) |

### 6.4 Scaling & HA (target state)

When a single VM is no longer enough:

1. Move `uploads/` to S3-compatible object storage (code comments already anticipate this for learning video).
2. Run ≥2 API instances behind a load balancer; sticky sessions are **not** required for JWT cookies.
3. Keep a **single** writer Postgres (Aiven HA plan); use replicas for reporting if needed.
4. Run migrations from a single job/pod — never from every replica on boot.
5. Put Ollama on a dedicated private GPU/CPU node if AI traffic grows.

### 6.5 Security baseline

- Rotate `JWT_SECRET` and DB passwords on a schedule (§5.1).
- Super-admin password policy: ≥8 chars with upper, lower, and digit.
- Limit SSH / cloud console to named operators; prefer SSO + MFA on the cloud account.
- Do not expose Postgres, PM2, or Ollama ports publicly.
- Treat GraphQL as authenticated-only in production; introspection/playground off when `APP_ENV=production`.
- Audit tenant impersonation and bulk uploads periodically.

### 6.6 Backup & disaster recovery

| Asset | Method | RPO target (suggested) |
|-------|--------|-------------------------|
| PostgreSQL | Aiven automatic backups + periodic `pg_dump` | ≤ 24h (tighter for paid production) |
| `uploads/` | Filesystem snapshot or sync to object storage | ≤ 24h |
| `.env.production` | Secrets manager or encrypted vault — not git | N/A (recover by re-issue) |
| Release artifacts | Tagged git + stored `main` binaries | Previous release always available |

Recovery drill: restore DB → restore uploads → deploy last-known-good binary → `--migrate` only if the restored schema is behind the binary (prefer matching versions).

---

## 7. Developer reference map

| Path | Role |
|------|------|
| `main.go` | Boot, CLI flags, Fiber app |
| `config/` | Env loading |
| `database/` | Connect + AutoMigrate |
| `routes/` | REST + GraphQL mount |
| `handlers/` | REST handlers; `handlers/bulk` CSV pipelines |
| `graph/` | Schema, generated code, resolvers |
| `models/` | Domain models, tenancy, plans, modules |
| `middleware/` | Auth, roles, rate limits |
| `mailer/`, `invites/` | Email + invite password setup |
| `peepalai/` | Local Ollama NL→SQL with grants/guard |
| `pdf-template/`, `qrcode/` | Document / QR generation |
| `ecosystem.config.js` | PM2 production process |
| `.env.example` | Env template |

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Login works on API but frontend bounces | `COOKIE_DOMAIN` set on localhost, or missing in prod | Empty locally; `.workvar.com` in prod |
| CORS errors | Origin not in `CORS_ORIGINS` | Add exact scheme + host + port |
| Empty schema / missing tables | Migrated never run | `go run . --migrate` |
| Super admin password “not updating” | Reconcile only runs under `--migrate` | Run migrate after changing `SUPER_ADMIN_*` |
| `/health` OK but GraphQL fails auth | Missing/expired cookie or Bearer token | Re-login; check `APP_ENV` Secure cookie over HTTP |
| PeepalAI errors | Ollama down or model missing | `ollama serve` + `ollama pull llama3.1:8b` |
| PM2 crash loop | Bad `.env.production` / DB unreachable | `pm2 logs peepal-backend`; verify `DB_PATH` |

---

## 9. Quick start cards

### Developer (local)

```text
Postgres up → cp .env.example .env → fill secrets → go mod tidy
→ go run . --migrate → go run . → start frontend on :3000
```

### Business / platform admin (cloud)

```text
Aiven Postgres → VM + .env.production → ./main --migrate
→ pm2 start ecosystem.config.js → TLS + DNS
→ platform SMTP → create tenant → assign plan → invite org admin
```

### Update night

```text
Backup DB + uploads → deploy new binary → ./main --migrate (if needed)
→ pm2 restart peepal-backend → /health + login smoke test
```

---

*Document version: aligned with the Peepal Go backend in this repository (Fiber + GraphQL + GORM/Postgres, PM2 deploy, Aiven Postgres, optional Ollama). Update this guide when ports, hostnames, or deploy topology change.*
