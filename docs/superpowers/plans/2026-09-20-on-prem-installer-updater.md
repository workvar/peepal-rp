# On-prem Installer & Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `peepal-installer` / `peepal-agent` with new install roots, full `.env.example` walkthrough, loopback update control API, presence-backed tenant-admin update popup, and root `INSTALLATION.md`.

**Architecture:** Agent remains process supervisor + release-asset updater + maintenance proxy. Backend talks to agent over loopback Bearer control API. Tenant admins get GraphQL update status/snooze/apply plus a WebSocket presence count. No PM2; no on-machine git builds.

**Tech Stack:** Go (installer module + collegeerp backend), Fiber + gqlgen, Next.js frontend, gorilla/websocket (already indirect), PostgreSQL via GORM AutoMigrate.

**Spec:** `docs/superpowers/specs/2026-09-20-on-prem-installer-updater-design.md`

## Global Constraints

- Prefer GraphQL for ERP-facing APIs; WebSocket path may be REST.
- Do not replace agent with PM2.
- Release assets only (no customer-machine source builds).
- Remind later is per-tenant 1h snooze; does not delay auto-apply.
- Active count = open presence WebSocket connections in that tenant.
- Install roots: Linux `/opt/apps/peepal-rp`, macOS `/usr/local/apps/peepal-rp`, Windows `C:\Program Files\PeepalRP`.

---

## File Structure

### Installer (create / modify)

```
installer/internal/paths/paths.go                    # new Default() roots + Data dirs
installer/internal/paths/paths_test.go               # create
installer/internal/appconfig/config.go               # AgentToken field
installer/internal/updater/state.go                  # Seeded bool
installer/internal/envexample/parse.go               # create — parse .env.example
installer/internal/envexample/parse_test.go          # create
installer/internal/envexample/prompt.go              # create — interactive + diff-new-required
installer/cmd/peepal-installer/environment.go        # use envexample walkthrough + AgentToken
installer/cmd/peepal-installer/install.go            # set Seeded after first migrate
installer/cmd/peepal-agent/main.go                   # start control listener
installer/internal/agentctl/server.go                # create — loopback control HTTP
installer/internal/agentctl/server_test.go           # create
installer/packaging/linux/nfpm.yaml                  # path updates
installer/packaging/linux/postinstall.sh
installer/packaging/linux/preremove.sh
installer/packaging/macos/build-pkg.sh
installer/packaging/windows/peepal.iss               # if hardcoded paths
installer/README.md                                  # path docs
```

### Backend

```
backend/.env.example                                 # PEEPAL_AGENT_* keys
backend/config/config.go                             # AgentURL, AgentToken
backend/models/tenant.go                             # UpdateSnoozedUntil *time.Time
backend/presence/hub.go                              # create — in-memory presence
backend/presence/hub_test.go                         # create
backend/presence/handler.go                          # create — WS upgrade
backend/agentclient/client.go                        # create — HTTP client to agent
backend/agentclient/client_test.go                   # create
backend/graph/schema.graphqls                        # SystemUpdateStatus + fields
backend/graph/system_update.resolvers.go             # create
backend/graph/model/…                                # gqlgen regenerate
backend/routes/routes.go                             # GET /api/v1/presence
```

### Frontend

```
frontend/lib/presence.ts                             # create — WS client hook helper
frontend/components/layout/SystemUpdatePrompt.tsx    # create — modal
frontend/components/layout/PresenceBeacon.tsx        # create — connect WS
frontend/app/[tenant]/(dashboard)/layout.tsx         # mount beacon + prompt
```

### Docs

```
INSTALLATION.md                                      # create at repo root
```

---

### Task 1: Install paths + AgentToken + Seeded flag

**Files:**
- Modify: `installer/internal/paths/paths.go`
- Create: `installer/internal/paths/paths_test.go`
- Modify: `installer/internal/appconfig/config.go`
- Modify: `installer/internal/updater/state.go`
- Modify: packaging scripts listed above
- Modify: `installer/README.md` path table

**Interfaces:**
- Produces: `paths.Default()` returns new roots; `appconfig.Config.AgentToken string`; `updater.State.Seeded bool`

- [ ] **Step 1: Write paths test**

```go
func TestDefaultRoots(t *testing.T) {
  // Use build tags or table with runtime.GOOS expectation for current OS only
  d := Default()
  switch runtime.GOOS {
  case "darwin":
    if d.Root != "/usr/local/apps/peepal-rp" { t.Fatalf(...) }
    if d.Data != "/usr/local/apps/peepal-rp/data" { t.Fatalf(...) } // New() puts data under root; Default historically split Data — change Default to use New(root) pattern OR set Data under root for consistency with spec
  ...
  }
}
```

**Decision:** Change `Default()` so Data lives under Root (`New(root)`), matching the spec layout (`data/` under install root). Update any code that assumed `/var/lib/peepal` separately.

- [ ] **Step 2: Implement path + packaging + AgentToken + Seeded**
- [ ] **Step 3: `cd installer && go test ./internal/paths/ ./internal/appconfig/ ./internal/updater/`**
- [ ] **Step 4: Commit** `feat(installer): new install roots, agent token, seeded state`

---

### Task 2: Parse and prompt `.env.example`

**Files:**
- Create: `installer/internal/envexample/parse.go`, `parse_test.go`, `prompt.go`
- Modify: `installer/cmd/peepal-installer/environment.go`
- Modify: `backend/.env.example` (document `PEEPAL_AGENT_URL`, `PEEPAL_AGENT_TOKEN`)

**Interfaces:**
- Produces:
  - `type Var struct { Key, Default, Comment string; Required, Secret, Optional bool }`
  - `func Parse(r io.Reader) ([]Var, error)`
  - `func Walk(vars []Var, existing envfile.Vars, ask func(...)) (envfile.Vars, error)` — full walk when existing empty; only new required when existing set
  - Injected always: `PEEPAL_AGENT_TOKEN`, `DB_PATH`/`ports` from installer answers

Classification rules:
- Empty default + comment contains `required` (case-insensitive) → Required
- Key in fixed set `{JWT_SECRET, DB_PATH, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD}` → Required
- Key contains `SECRET`, `PASSWORD`, `TOKEN` → Secret
- Non-empty default → Optional with default
- Otherwise Optional

- [ ] **Step 1: Tests for Parse + Walk diff behavior**
- [ ] **Step 2: Implement + wire into `writeEnvironment`**
- [ ] **Step 3: `go test ./internal/envexample/`**
- [ ] **Step 4: Commit** `feat(installer): interactive .env.example walkthrough`

---

### Task 3: Agent loopback control API

**Files:**
- Create: `installer/internal/agentctl/server.go`, `server_test.go`
- Modify: `installer/cmd/peepal-agent/main.go`
- Modify: `installer/internal/appconfig/config.go` if ControlPort needed (default `127.0.0.1:9080`)

**Interfaces:**
- Produces: `agentctl.New(Options{Token, Addr, Updater *updater.Updater, Status *runstate.State, Cfg appconfig.Config}) *http.Server`
- Routes (Bearer required; reject if `RemoteAddr` host not loopback):
  - `GET /_peepal/control/update` → JSON `{installed_backend, installed_frontend, available_backend, available_frontend, update_available, auto_apply, window_start_hour, window_end_hour}`
  - `POST /_peepal/control/update` → calls `Updater.CheckAndApply` (or force apply when newer known)
  - `POST /_peepal/control/check` → poll only, no apply (expose via updater helper if needed)

- [ ] **Step 1: Test unauthorized + non-loopback rejected; authorized GET shape**
- [ ] **Step 2: Implement server; start from `run()` alongside public proxy**
- [ ] **Step 3: Generate `AgentToken` in installer if empty; write to config + env**
- [ ] **Step 4: `go test ./internal/agentctl/`**
- [ ] **Step 5: Commit** `feat(agent): loopback update control API`

---

### Task 4: Presence hub + agent client + tenant snooze column

**Files:**
- Create: `backend/presence/hub.go`, `hub_test.go`, `handler.go`
- Create: `backend/agentclient/client.go`, `client_test.go`
- Modify: `backend/models/tenant.go`, `backend/config/config.go`, `backend/routes/routes.go`, `backend/.env.example`

**Interfaces:**
- `presence.Hub` with `Connect(tenantID, userID)`, `Disconnect`, `Count(tenantID) int`
- `presence.NewHandler(hub, authMiddleware) fiber/http handler` at `GET /api/v1/presence`
- `agentclient.Client{BaseURL, Token}` with `Status(ctx)`, `Apply(ctx)`, `Check(ctx)`
- Config: `PEEPAL_AGENT_URL` default `http://127.0.0.1:9080`, `PEEPAL_AGENT_TOKEN`
- `Tenant.UpdateSnoozedUntil *time.Time` — AutoMigrate picks it up via existing Tenant migrate list

- [ ] **Step 1: Hub unit tests (connect/disconnect/count)**
- [ ] **Step 2: Implement hub + WS handler (gorilla/websocket via net/http adaptor)**
- [ ] **Step 3: Agent client + httptest tests**
- [ ] **Step 4: Wire route + config + tenant field**
- [ ] **Step 5: Commit** `feat(backend): presence hub and agent client`

---

### Task 5: GraphQL system update APIs

**Files:**
- Modify: `backend/graph/schema.graphqls`
- Create: `backend/graph/system_update.resolvers.go`
- Run: `cd backend && go run github.com/99designs/gqlgen generate`

Schema:

```graphql
type SystemUpdateStatus {
  installedBackend: String!
  installedFrontend: String!
  availableBackend: String!
  availableFrontend: String!
  updateAvailable: Boolean!
  snoozed: Boolean!
  snoozedUntil: String
  activeUsersInTenant: Int!
  agentReachable: Boolean!
}

extend type Query {
  systemUpdateStatus: SystemUpdateStatus!
}

extend type Mutation {
  snoozeSystemUpdate: SystemUpdateStatus!
  applySystemUpdate: Boolean!
}
```

Resolvers: `requireRole(ctx, roleAdmin)` — tenant admin only for product popup (super_admin also passes `requireRole`). Soft-fail agent errors → `agentReachable: false`, `updateAvailable: false`.

- [ ] **Step 1: Add schema + generate**
- [ ] **Step 2: Implement resolvers**
- [ ] **Step 3: `go test ./graph/ -count=1` focused if tests added; else `go build ./...`**
- [ ] **Step 4: Commit** `feat(graphql): system update status snooze and apply`

---

### Task 6: Frontend popup + presence beacon

**Files:**
- Create: `frontend/lib/presence.ts`
- Create: `frontend/components/layout/PresenceBeacon.tsx`
- Create: `frontend/components/layout/SystemUpdatePrompt.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/layout.tsx`

Behavior:
- `PresenceBeacon` connects WS when `hasSession && user` (all roles) using credentials/cookies.
- `SystemUpdatePrompt` only if `user.role === "admin"`: poll `systemUpdateStatus` every 5 min + on focus; show modal when `updateAvailable && !snoozed && agentReachable`; ConfirmDialog for Update now; Remind later → mutation.

- [ ] **Step 1: Implement components**
- [ ] **Step 2: Mount in dashboard layout**
- [ ] **Step 3: Typecheck / lint touched files**
- [ ] **Step 4: Commit** `feat(frontend): tenant admin system update prompt`

---

### Task 7: Root INSTALLATION.md

**Files:**
- Create: `INSTALLATION.md`

Cover:
1. Dev setup (clone, pnpm, Go, `.env` from example, migrate, run frontend+backend)
2. On-prem package install (Windows/macOS/Linux paths, wizard overview, DB local vs cloud, env walkthrough, service commands)
3. Updates (auto-apply + tenant admin UI)
4. Uninstall / data locations
5. Link to `installer/README.md` for packaging internals

- [ ] **Step 1: Write INSTALLATION.md**
- [ ] **Step 2: Commit** `docs: add INSTALLATION.md`

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| New install paths | 1 |
| Full `.env.example` walkthrough / update new keys | 2 |
| AgentToken in env + config | 1, 2, 3 |
| Seeded flag / first-time seed only | 1 (+ wire in install.go migrate) |
| Loopback control API | 3 |
| Presence WebSocket | 4 |
| Tenant snooze column | 4 |
| GraphQL status/snooze/apply | 5 |
| Tenant admin modal + active count | 6 |
| Auto-apply unchanged; snooze UI-only | 3, 5, 6 |
| INSTALLATION.md | 7 |

## Existing install note

Machines already on `/opt/peepal` keep working if `config.json` has absolute `install_root`. New defaults apply to fresh installs only; document in INSTALLATION.md.
