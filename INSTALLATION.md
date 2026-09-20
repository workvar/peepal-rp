# Installation

This guide covers two ways to run PeepalRP:

1. **Development** — clone the monorepo and run backend + frontend locally.
2. **On-premises** — install with the packaged installer (Windows, macOS, Linux).

For packaging internals and agent behaviour, see [`installer/README.md`](./installer/README.md).

---

## Prerequisites

| Tool | Dev | On-prem (customer machine) |
| --- | --- | --- |
| Git | Yes | Used by packaging / optional |
| Go 1.25+ | Yes | Bundled via installer where needed |
| Node 20+ / pnpm | Yes | Bundled Node for the frontend runtime |
| PostgreSQL 16+ | Yes (local or cloud) | Local (installer-managed) or cloud URI |

---

## Development setup

### 1. Clone and install JS deps

```bash
git clone <repo-url> PeepalRP
cd PeepalRP
pnpm install
```

### 2. Backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` at minimum:

- `JWT_SECRET` — generate with `openssl rand -base64 48`
- `DB_PATH` — Postgres connection string
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — first platform admin
- `CORS_ORIGINS` — usually `http://localhost:3000`
- Leave `COOKIE_DOMAIN` empty for localhost
- `RPI_LOCAL_ENABLE=true` — use when opening the app at `http://raspberrypi.local` (Raspberry Pi mDNS). This keeps auth cookies host-only and un-`Secure` so login works over HTTP, and allows `*.local` / LAN CORS origins. Restart after changing it.

On-prem-only keys (`PEEPAL_AGENT_URL`, `PEEPAL_AGENT_TOKEN`) can stay empty in local dev; the tenant update UI will report the agent as unreachable.

### 3. Database migrate + seed

```bash
cd backend
go run . --migrate
```

This applies schema migrations and seeds the super-admin and default plans/roles.

### 4. Run backend and frontend

From the repo root (separate terminals):

```bash
pnpm backend:run    # or: cd backend && go run .
pnpm dev            # Next.js on http://localhost:3000
```

API defaults to the port in `PORT` (example: `3001`). GraphQL is at `POST /api/v1/graphql`.

### 5. Useful monorepo commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm backend:build
pnpm installer:build
```

Go modules are linked via root `go.work` (`backend` + `installer`).

---

## On-premises install

### Default install locations

| OS | Path |
| --- | --- |
| Linux | `/opt/apps/peepal-rp` |
| macOS | `/usr/local/apps/peepal-rp` |
| Windows | `C:\Program Files\PeepalRP` |

Layout under the install root:

```
<root>/
  bin/peepal-agent
  app/backend
  app/frontend
  runtime/…          # Node / local Postgres when used
  data/              # survives updates
    config.json
    backend.env
    state.json
    pgdata/
    uploads/
    logs/
```

### Install packages

Download the platform installer from the [GitHub Releases](https://github.com/workvar/peepal-rp/releases) page for a given tag:

| Platform | Asset |
| --- | --- |
| Windows | `PeepalSetup-<version>.exe` |
| macOS (Apple Silicon) | `Peepal-<version>-arm64.pkg` |
| macOS (Intel) | `Peepal-<version>-amd64.pkg` |
| Linux | `peepal_<version>_amd64.deb` / `.rpm` (or arm64) |

App update bundles (`peepal-backend_*.tar.gz`, `peepal-frontend.tar.gz`) are also on the same release; the agent downloads those automatically — end users only need the installer above.

Build artifacts can also be produced locally (see `installer/README.md`). Typical customer flow after download:

**Windows** — run the `.exe` installer (Inno Setup).

**macOS** — open the `.pkg`, then complete setup if prompted.

**Linux** — install the `.deb` / `.rpm`, then the post-install hook runs the setup wizard into `/opt/apps/peepal-rp`.

You can also run the installer binary directly:

```bash
sudo peepal-installer --dir /opt/apps/peepal-rp
```

### What the wizard does

1. Preflight (admin rights, disk, ports, RAM).
2. GitHub credentials if the release repos are private (baked-in / env token, or prompt).
3. Database: **local** (asks for database name) or **cloud** (asks for URI); connectivity is checked before continuing.
4. Full walkthrough of `backend/.env.example` — every key, labeled required or optional; secrets can be generated.
5. Downloads the latest **release assets** (not `main`).
6. Migrations + first-time seed (recorded in `data/state.json` as `seeded`).
7. Registers `peepal-agent` as an OS service (systemd / launchd / Windows scheduled task).

Re-running the installer on an existing install reuses `data/backend.env` and only prompts for **new required** env keys.

### Service commands

```bash
# Linux
sudo systemctl status peepal

# macOS
sudo launchctl kickstart -k system/com.peepal.agent

# Windows
schtasks /Query /TN PeepalAgent

# Force one update check
peepal-agent -config <data>/config.json -check-updates
```

Logs: `<root>/data/logs/agent.log`.

### Updates

- **Automatic:** the agent polls GitHub release tags on a schedule (quiet hours optional) and applies updates with a full-screen maintenance page while the swap runs.
- **From the product UI:** tenant **admins** see “New updates are available…” with an active-user count for their tenant. **Update now** confirms and triggers the agent; **Remind later** snoozes the popup for that tenant for one hour (does not cancel install-wide auto-apply).

The public app is served through the agent proxy. During an update, browsers get the maintenance page; `/_peepal/status` stays up so the page can reload when the app is healthy again.

### Uninstall

```bash
sudo peepal-setup --uninstall
# or
sudo peepal-installer --uninstall
```

Use `--keep-data` if you want to retain `data/` (database, uploads, env). Fresh installs use the new default paths; older installs that already wrote an absolute `install_root` in `config.json` keep that path.

---

## Configuration reference

Source of truth for backend keys: [`backend/.env.example`](./backend/.env.example).

On installed machines, the live file is `<root>/data/backend.env` (copied into the backend app dir for the process). Installer-managed keys include:

- `PEEPAL_AGENT_URL` — default `http://127.0.0.1:9080`
- `PEEPAL_AGENT_TOKEN` — shared secret for the loopback control API
- `RPI_LOCAL_ENABLE` — `true` to use `http://raspberrypi.local` (cookies + CORS). Also settable at install time with `--rpi-local`.

Do not commit real `.env` files.

### Raspberry Pi (`raspberrypi.local`)

Raspberry Pi OS advertises `http://raspberrypi.local` via Avahi. The packaged installer already listens on all interfaces; the missing piece is cookies: production sets the `Secure` flag, which browsers drop on HTTP, and `.local` is a public suffix so a `COOKIE_DOMAIN` value is rejected.

Set `RPI_LOCAL_ENABLE=true` in `<root>/data/backend.env` (or pass `--rpi-local` at install) and restart `peepal-agent`. That turns `Secure` off, keeps the cookie host-only, allows `*.local` / LAN CORS origins, and rewrites localhost `APP_BASE_URL` to `http://raspberrypi.local`. Avahi is a recommended package of the Linux installer; Raspberry Pi OS already has it.
