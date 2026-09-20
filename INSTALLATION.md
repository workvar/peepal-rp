# Installation

This guide covers three ways to run PeepalRP:

1. **Development** — clone the monorepo and run backend + frontend locally.
2. **On-premises** — install with the packaged installer (Windows, macOS, Linux).
3. **Raspberry Pi** — Linux `arm64` package on Raspberry Pi OS, with optional
   `http://raspberrypi.local` access on the LAN.

For packaging internals and agent behaviour, see [`installer/README.md`](./installer/README.md).

---

## Prerequisites

| Tool | Dev | On-prem (customer machine) |
| --- | --- | --- |
| Git | Yes | Used by packaging / optional |
| Go 1.25+ | Yes | Bundled via installer where needed |
| Node 20+ / pnpm | Yes | Bundled Node for the frontend runtime |
| PostgreSQL 16+ | Yes (local or cloud) | Local (installer-managed) or cloud URI |

Raspberry Pi additionally needs Raspberry Pi OS (64-bit). PostgreSQL and
mDNS (`avahi-daemon`) are pulled in by the `.deb`.

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

For LAN access via `http://raspberrypi.local` during development, see
[Raspberry Pi](#raspberry-pi-raspberrypilocal) (`RPI_LOCAL_ENABLE`).

On-prem-only keys (`PEEPAL_AGENT_URL`, `PEEPAL_AGENT_TOKEN`) can stay empty in local
dev; the tenant update UI will report the agent as unreachable.

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
| Linux (x86_64) | `peepal_<version>_amd64.deb` / `.rpm` |
| Linux (ARM64 / Raspberry Pi) | `peepal_<version>_arm64.deb` / `.rpm` |

App update bundles (`peepal-backend_*.tar.gz`, `peepal-frontend.tar.gz`) are also on
the same release; the agent downloads those automatically — end users only need
the installer above. On a Pi, the agent needs the **`linux_arm64`** backend asset
(published on the same tag).

Build artifacts can also be produced locally (see `installer/README.md`). Typical
customer flow after download:

**Windows** — run the `.exe` installer (Inno Setup).

**macOS** — open the `.pkg`, then complete setup if prompted.

**Linux** — install the `.deb` / `.rpm`, then the post-install hook runs the setup
wizard into `/opt/apps/peepal-rp`.

You can also run the installer binary directly:

```bash
sudo peepal-installer --dir /opt/apps/peepal-rp
```

### What the wizard does

1. Preflight (admin rights, disk, ports, RAM).
2. GitHub credentials if the release repos are private (baked-in / env token, or prompt).
3. Database: **local** (asks for database name) or **cloud** (asks for URI); connectivity is checked before continuing.
4. Full walkthrough of `backend/.env.example` — every key, labeled required or optional; secrets can be generated. Includes the Raspberry Pi / `raspberrypi.local` prompt when that key is reached.
5. Downloads the latest **release assets** (not `main`).
6. Migrations + first-time seed (recorded in `data/state.json` as `seeded`).
7. Registers `peepal-agent` as an OS service (systemd / launchd / Windows scheduled task).

Re-running the installer on an existing install reuses `data/backend.env` and only
prompts for **new required** env keys.

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

The public app is served through the agent proxy. During an update, browsers get
the maintenance page; `/_peepal/status` stays up so the page can reload when the
app is healthy again.

### Uninstall

```bash
sudo peepal-setup --uninstall
# or
sudo peepal-installer --uninstall
```

Use `--keep-data` if you want to retain `data/` (database, uploads, env). Fresh
installs use the new default paths; older installs that already wrote an absolute
`install_root` in `config.json` keep that path.

---

## Raspberry Pi (`raspberrypi.local`)

Use this when Peepal runs on a Raspberry Pi and other devices on the LAN should
open it at **`http://raspberrypi.local`** (the default mDNS name Raspberry Pi OS
advertises via Avahi).

### Why a special flag?

Without `RPI_LOCAL_ENABLE`:

- Production sets the auth cookie **`Secure`**, which browsers drop on plain HTTP.
- `.local` is a **public suffix**, so a non-empty `COOKIE_DOMAIN` is rejected and
  login appears to succeed then bounce back to the login page.

Enabling the flag fixes cookies, CORS, and public URLs for mDNS / LAN use.

### What `RPI_LOCAL_ENABLE=true` does

| Setting | Effect |
| --- | --- |
| Cookie `Secure` | Off (so HTTP login works) |
| `COOKIE_DOMAIN` | Cleared (host-only cookie) |
| `CORS_ORIGINS` | Allows `http://raspberrypi.local` (and port variants); also accepts other `*.local` hosts and private LAN IPs at runtime |
| `APP_BASE_URL` | Rewritten from localhost → `http://raspberrypi.local` (keeps a non-80 port if set) |
| `WEBAUTHN_RP_ID` | Rewritten from localhost → `raspberrypi.local` when it was loopback |

Restart the backend / `peepal-agent` after changing the flag.

### Install on the Pi

The client only needs the ARM64 `.deb` and an internet connection. `apt`
installs PostgreSQL and Avahi, then the wizard asks for an admin email and
password. On a Raspberry Pi, LAN login at `http://raspberrypi.local` (and the
Pi’s IP) is turned on automatically.

1. Use **64-bit Raspberry Pi OS**.
2. Download **`peepal_<version>_arm64.deb`** from
   [Releases](https://github.com/workvar/peepal-rp/releases).
3. Install:

```bash
sudo apt update
sudo apt install -y ./peepal_*_arm64.deb
```

4. Answer the prompts (admin email/password, optional AI, updates).
5. From another device on the same Wi‑Fi, open:

```text
http://raspberrypi.local
```

or `http://<pi-ip>` (`hostname -I` on the Pi).

If the HTTP port is not 80, include it (e.g. `http://raspberrypi.local:8080`).
The installer summary prints the LAN URL.

To run setup again later (without `apt`):

```bash
sudo peepal-setup
```

### Enable `raspberrypi.local` after an existing install

If the Pi was installed without the flag:

```bash
sudo nano /opt/apps/peepal-rp/data/backend.env
# set:
#   RPI_LOCAL_ENABLE=true
#   COOKIE_DOMAIN=          (leave empty)
# ensure CORS_ORIGINS includes http://raspberrypi.local if you manage it by hand

sudo systemctl restart peepal
```

Or re-run:

```bash
sudo peepal-installer --dir /opt/apps/peepal-rp --rpi-local
```

Existing env values are kept; the installer applies RPi cookie/CORS/public URL
rules when the flag is set.

### Development on a Pi (or pointing a laptop at a Pi)

In `backend/.env`:

```bash
RPI_LOCAL_ENABLE=true
COOKIE_DOMAIN=
# CORS_ORIGINS is expanded automatically for raspberrypi.local when the flag is on
```

Restart the backend. Open `http://raspberrypi.local` (or the Pi’s LAN IP) from
another machine. Passkeys use `WEBAUTHN_RP_ID=raspberrypi.local` when the flag
rewrites a loopback RP ID.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| `raspberrypi.local` does not resolve | Avahi running; client and Pi on same LAN; try the Pi’s IP instead |
| Login succeeds then returns to login | `RPI_LOCAL_ENABLE=true`, `COOKIE_DOMAIN` empty, agent/backend restarted |
| CORS / API errors from the browser | Flag on; origin is `*.local` or a private IP; hard-refresh the tab |
| Wrong CPU package | Use `arm64` debs/rpms and `peepal-backend_linux_arm64.tar.gz`, not amd64 |
| Hostname is not `raspberrypi` | mDNS becomes `<hostname>.local`; the flag still allows other `*.local` origins, but set `APP_BASE_URL` to that name if you renamed the Pi |

---

## Configuration reference

Source of truth for backend keys: [`backend/.env.example`](./backend/.env.example).

On installed machines, the live file is `<root>/data/backend.env` (copied into the
backend app dir for the process). Installer-managed keys include:

- `PEEPAL_AGENT_URL` — default `http://127.0.0.1:9080`
- `PEEPAL_AGENT_TOKEN` — shared secret for the loopback control API
- `RPI_LOCAL_ENABLE` — `true` for `http://raspberrypi.local` (see [Raspberry Pi](#raspberry-pi-raspberrypilocal)); also `--rpi-local` at install time

Do not commit real `.env` files.
