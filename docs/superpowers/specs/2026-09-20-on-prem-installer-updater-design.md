# On-prem installer & updater (extend peepal-agent)

**Date:** 2026-09-20  
**Status:** Approved for implementation planning  
**Approach:** Extend existing `installer/` (`peepal-installer` + `peepal-agent`); do not replace with PM2.

## Goal

Ship Windows, macOS, and Linux installers that provision PeepalRP on a customer machine, keep it updated from GitHub release assets, and let tenant admins learn about and trigger updates from the ERP UI — while optional auto-apply continues to work on the agent.

## Non-goals

- Switching process supervision to PM2 (agent remains the supervisor).
- Building the application from git source on the customer machine (release assets only).
- Cross-tenant active-user visibility or blocking Update now based on other tenants.
- A full realtime/chat product; presence is only for the update popup count.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Relation to existing installer | Extend agent/installer (Approach 1) |
| Update trigger | Optional auto-apply **and** tenant-admin popup (Update now / Remind later) |
| Code delivery | Prebuilt GitHub release assets |
| Env configuration | Full `.env.example` walkthrough on first install; new keys only on update |
| Active users | Open realtime (WebSocket) connections |
| Who sees popup | Tenant `admin` role; count = that tenant only |
| Update confirm | Simple confirm (no other-tenant stats) |
| Install paths | Linux `/opt/apps/peepal-rp`; macOS `/usr/local/apps/peepal-rp`; Windows `C:\Program Files\PeepalRP` |
| Remind later | Per-tenant snooze (1 hour); does **not** delay install-wide auto-apply |

---

## 1. Install & on-disk layout

### Packages

Continue shipping native packages (Windows `.exe` / Inno, macOS `.pkg`, Linux `.deb`/`.rpm`) that install `peepal-installer` and `peepal-agent`. Release CI remains tag-driven (existing installer packaging workflows).

### Default roots

| OS | Path |
| --- | --- |
| Linux | `/opt/apps/peepal-rp` |
| macOS | `/usr/local/apps/peepal-rp` |
| Windows | `C:\Program Files\PeepalRP` |

### Layout

```
<root>/
  bin/peepal-agent
  app/backend          # replaced on every backend release
  app/frontend         # replaced on every frontend release
  runtime/…            # bundled Node / local Postgres when used
  data/                # survives every update
    config.json
    backend.env
    state.json         # installed tags, seeded flag
    pgdata/            # if local DB
    uploads/
    logs/
```

Everything under `data/` stays outside release swap directories.

### First-time install flow

1. Preflight (administrator rights, free disk, free ports, RAM floor).
2. GitHub access: use baked-in / `PEEPAL_REPO_TOKEN` if present; otherwise prompt for credentials (private repos).
3. Database: local (ask database name) vs cloud (ask URI); validate connectivity before writing config.
4. Full interactive walkthrough of `backend/.env.example` (required vs optional called out).
5. Download latest release assets for backend and frontend (not `main`).
6. Run migrations and first-time seed.
7. Register OS service for `peepal-agent`; agent starts stack + front-door proxy.
8. Re-running on an existing install follows the update path: reuse env; prompt only for **new required** keys.

Source is not left on disk to delete: customers receive prebuilt assets, not a clone/build tree.

---

## 2. Agent: local control API + maintenance

### Responsibilities (unchanged core)

- Supervise local Postgres (if managed), backend binary, and Next.js standalone frontend.
- Own the public HTTP port; reverse-proxy `/api/*` → backend, everything else → frontend.
- Poll GitHub for newer semver release tags; stage, swap, migrate, health-check, rollback on failure.
- During updates, serve the existing Windows-update-style maintenance page (HTTP 503) with progress step text; keep `/_peepal/status` live for auto-reload.

### Local control API (new)

Loopback-only control routes for the backend. Authenticate with a shared secret written at install time into `data/config.json` (agent) and `data/backend.env` (`PEEPAL_AGENT_TOKEN`).

| Endpoint | Purpose |
| --- | --- |
| `GET /_peepal/status` | Existing public status (mode, step, versions) for the maintenance page |
| `GET /_peepal/control/update` | Available vs installed tags; auto-apply settings; update window |
| `POST /_peepal/control/update` | Apply now (same apply path as a successful poll) |
| `POST /_peepal/control/check` | Force poll without applying |

Bind control routes to `127.0.0.1` only. Require `Authorization: Bearer <token>` on control routes. Reject non-loopback callers.

### Apply flow

1. Set mode `updating` → public proxy serves maintenance HTML/JSON.
2. Stage release assets while the old app still runs.
3. Stop backend/frontend (Postgres stays up) → swap directories → restore uploads/env → migrate → restart → wait for health.
4. On failure: restore previous directories, restart, set mode `failed` with last error.
5. On success: mode `running`.

### Auto-apply

Hourly poll (configurable) and quiet hours remain. Tenant **Remind later** only suppresses the ERP popup for that tenant; it does **not** cancel or delay install-wide auto-apply.

### Boundary

The backend never downloads releases. It only reads status/availability and triggers apply via the control API.

---

## 3. Presence, GraphQL, and tenant-admin UI

### Presence

- Authenticated WebSocket at `GET /api/v1/presence`.
- Frontend connects when a user is in a tenant dashboard (not public/login pages).
- Heartbeat + disconnect cleanup.
- In-memory map `tenantID → set(userID)` — sufficient for single-machine on-prem.
- Purpose: update popup active-user count only.

### Authorization

Tenant users with the **`admin`** role may query update status, snooze, and apply. Other roles do not see the popup.

### GraphQL

Prefer GraphQL over new REST for product surface (project convention).

| Field | Behavior |
| --- | --- |
| `systemUpdateStatus` | Installed/available versions, update available flag, whether this tenant is snoozed, `activeUsersInTenant` from presence; agent `GET …/control/update` for release info |
| `snoozeSystemUpdate` | Sets tenant `update_snoozed_until = now + 1h` |
| `applySystemUpdate` | Backend `POST` agent apply; returns promptly; downtime UX is the agent maintenance page |

Persist snooze as a nullable `tenants.update_snoozed_until` timestamp column. Suppress popup while `now < update_snoozed_until`.

### Frontend

- On tenant admin layout: poll `systemUpdateStatus` periodically (and on window focus).
- Modal when update available and not snoozed:
  - “New updates are available. Do you want to update?”
  - Active users in **this tenant**
  - **Update now** | **Remind later**
- Update now → simple confirm (“The app will be briefly unavailable”) → `applySystemUpdate`.
- Remind later → `snoozeSystemUpdate` → hide for that tenant for one hour.
- While agent mode is `updating`, all users see the agent maintenance page (no separate in-app progress bar required for the downtime window).

### Auto-apply vs snooze

If auto-apply runs while a tenant is snoozed, users still see maintenance. After a successful update, versions match and the popup does not reappear until a newer release exists.

---

## 4. Env walkthrough, seeding, errors, testing

### Env source of truth

`backend/.env.example`, shipped with the backend release asset (and/or mirrored into the installer at package build time). Installer parses keys and comments and classifies:

- **Required** — no usable default / marked required
- **Optional** — defaulted or documented optional
- **Secret** — offer generate vs paste

Where `.env.example` alone is ambiguous, the installer may keep a small explicit required/optional list keyed to the example file.

### First install write rules

Write `data/backend.env` (and copy into the live backend path as today). Precedence:

1. User answer  
2. Generated secret (if chosen)  
3. Example default  
4. Optional left empty → omit or keep commented default  

Always inject installer-owned values the operator should not invent: `PEEPAL_AGENT_TOKEN`, DB DSN from the DB step, ports, `APP_ENV=production`.

### Update env rules

Diff current env vs new release `.env.example`. Prompt only for **new required** keys. Never rotate JWT/DB password unless the operator explicitly opts in.

### Seeding

On first successful install only: run existing migrate + first-account / super-admin seed path. Record `seeded: true` in `data/state.json`. Later updates run migrate but do not re-seed in a way that overwrites customer accounts. Existing super-admin reconcile-from-env behavior remains if those env vars change.

### Error handling

| Failure | Behavior |
| --- | --- |
| Bad GitHub token / release fetch | Fail with clear message; no partial swap |
| DB unreachable | Fail before writing env |
| Apply / health timeout | Rollback previous app dirs; maintenance shows failure |
| Agent control API unreachable | GraphQL soft error; UI shows update service unavailable (not “up to date”) |
| Presence unavailable | Popup still works; count shows 0 or “unknown”; do not block apply |

### Acceptance tests

- Fresh install on Linux at `/opt/apps/peepal-rp` with local DB and with cloud URI.
- Full env prompt covers every `.env.example` key; optional keys skippable.
- Update with no new keys: silent env reuse.
- Update with one new required key: single prompt.
- Tenant `admin` sees popup; other roles do not.
- Remind later hides for that tenant for 1h; other tenants still see it.
- Update now → maintenance page → healthy again.
- Auto-apply still works when enabled; snooze does not cancel it.
- Presence count matches open dashboard sockets for that tenant.
- Failed update rolls back.

---

## Architecture sketch

```
┌─────────────────────────────────────────────────────────┐
│  peepal-agent (OS service)                              │
│  - supervisor (postgres?, backend, frontend)            │
│  - public proxy + maintenance page                      │
│  - GitHub release updater + rollback                    │
│  - loopback control API (Bearer token)                  │
└───────────────┬──────────────────────────▲──────────────┘
                │ proxy /api               │ apply / status
                ▼                          │
┌─────────────────────────────────────────────────────────┐
│  backend                                                │
│  - GraphQL: systemUpdateStatus / snooze / apply         │
│  - presence WebSocket                                   │
│  - tenant.update_snoozed_until                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  frontend (tenant admin)                                │
│  - update available modal                               │
│  - presence connection                                  │
└─────────────────────────────────────────────────────────┘
```

## Implementation notes (for planning)

- Prefer GraphQL for ERP-facing update APIs; REST only if needed for the WebSocket upgrade path.
- Reuse `installer/internal/updater`, `proxy`, and `runstate` rather than rewriting apply/maintenance.
- Change default install roots in `paths` / packaging scripts; document migration for any existing `/opt/peepal` installs if those exist in the wild (out of band note in the implementation plan).
- Add `PEEPAL_AGENT_TOKEN` to `.env.example` as an installer-managed secret (optional in example; required on installed machines).

## Open follow-ups (non-blocking)

- Whether super-admin should also see a platform-level update UI (nice-to-have).
- Code signing / notarization remains a packaging concern already noted in installer README.
