# Peepal on-premise installer

Ships Peepal to a customer's Windows, macOS or Linux machine as a single
double-clickable installer, then keeps it up to date from GitHub without
anyone logging into that machine again.

Two Go programs do all the work; the native packages are thin wrappers.

| Program | Runs | Job |
| --- | --- | --- |
| `peepal-installer` | once, interactively | provisions PostgreSQL and Node, downloads the app, writes config, registers the service |
| `peepal-agent` | forever, as a service | supervises the stack, proxies port 80, polls for new tags, applies updates |

## What the customer gets

```
C:\Program Files\PeepalRP   /opt/apps/peepal-rp   /usr/local/apps/peepal-rp
├── bin/peepal-agent            the background service
├── app/backend                 replaced on every backend release
├── app/frontend                replaced on every frontend release
├── runtime/node                bundled Node.js 20
├── runtime/pgsql               bundled PostgreSQL 16
└── data/                       survives every update
    ├── config.json             ports, repos, update policy
    ├── backend.env             JWT secret, DB password, admin seed
    ├── pgdata/                 the database
    ├── uploads/                linked into app/backend/uploads
    ├── state.json              installed tags
    └── logs/agent.log
```

Everything under `data/` is deliberately outside the release directories, so
an update can replace `app/backend` wholesale without touching customer data.

## Install flow

1. **Preflight** — administrator rights, free disk, free port, RAM floor.
2. **Questions** — admin account, local AI, automatic updates and quiet hours.
3. **Database** — an existing PostgreSQL if there is one, otherwise Homebrew
   (macOS), portable EnterpriseDB binaries (Linux/macOS x64), the vendor's
   unattended installer (Windows), or the distro package manager as a last
   resort. Then `initdb`, an application role and an empty database.
4. **Runtime** — Node.js 20, verified against `SHASUMS256.txt`.
5. **Application** — the latest release from each of the two private repos,
   verified against each release's `checksums.txt`.
6. **Configuration** — `backend.env` with a freshly generated JWT secret and
   database password. CORS, cookies, and `http://raspberrypi.local` are filled
   in by the installer (never typed). `COOKIE_DOMAIN` stays empty on purpose;
   a URL or `.local` Domain is rejected by the browser and silently breaks
   login. A Raspberry Pi turns this on automatically (`--rpi-local` forces it).
7. **AI (optional)** — see below.
8. **Service** — systemd unit, launchd daemon, or a SYSTEM scheduled task.

Re-running the installer over an existing install is safe: the env file and
any downloaded model are reused. If the database already has tables, the
wizard asks whether to keep them, wipe them, or create a new empty database.

## The local AI check

`Ask PeepalAI` needs a Llama model on the machine. The installer measures RAM
and VRAM and picks the largest model that fits, rather than offering one
option and failing:

| Hardware | Model | Note |
| --- | --- | --- |
| ≥ 32 GB RAM, or ≥ 8 GB VRAM | `llama3.1:8b` | best SQL accuracy |
| ≥ 16 GB RAM | `llama3.2:3b` | good for common questions |
| ≥ 8 GB RAM | `llama3.2:1b` | simple questions only |
| below that | none | the feature stays off |

Ollama itself is installed with the vendor's own installer, which registers
its background service. Every failure in this step is a warning: the ERP is
fully usable without the assistant.

## Updates and the maintenance page

The agent polls both release repositories on a timer (hourly by default,
optionally restricted to quiet hours). When either publishes a newer semver
tag it:

1. flips the shared state to `updating` — from this moment the proxy answers
   **HTTP 503** with a self-refreshing maintenance page instead of forwarding
   traffic, so nobody sees a connection error;
2. downloads and unpacks both assets into staging while the app is still up;
3. stops the backend and frontend (PostgreSQL stays running);
4. renames the live directories aside and moves staging into place;
5. restores `uploads` and `.env`, then runs `peepal-backend --migrate`;
6. restarts and waits up to three minutes for `/health`;
7. on failure, puts the previous directories back and restarts them, so a bad
   release costs a few minutes of downtime rather than a support visit.

API callers get JSON during the window (`{"success": false, "error":
"service_unavailable"}`), browsers get the HTML page, and `/_peepal/status`
stays live throughout so the page can reload itself the moment the app
returns.

## Building the installers

```bash
cd installer
VERSION=1.4.0 PEEPAL_TOKEN=github_pat_xxx ./packaging/build.sh   # all platforms
```

Then per platform:

```bash
iscc /DVersion=1.4.0 packaging\windows\peepal.iss     # Windows .exe
VERSION=1.4.0 ARCH=arm64 ./packaging/macos/build-pkg.sh   # macOS .pkg
nfpm package -f /tmp/nfpm.yaml -p deb -t dist/            # Linux .deb/.rpm
```

`.github/workflows/release-installer.yml` does all of this on a tag push.

**The token is baked into the binary.** It should be a fine-grained PAT with
`Contents: read` on the two app repos and nothing else. Treat the built
artifacts as secrets and rotate the token when a customer relationship ends.

## The two app repositories

Copy `packaging/ci/backend-release.yml` and `packaging/ci/frontend-release.yml`
into the backend and frontend repos. They publish exactly the asset names the
agent looks for:

- backend: `peepal-backend_<goos>_<goarch>.tar.gz` + `checksums.txt`
- frontend: `peepal-frontend.tar.gz` + `checksums.txt`

The frontend build sets `NEXT_STANDALONE=1` and leaves `NEXT_PUBLIC_API_URL`
unset, so the browser bundle calls `/api/v1` relatively and reaches the
backend through the agent's proxy.

## Operating an installed machine

```bash
sudo systemctl status peepal          # Linux
sudo launchctl kickstart -k system/com.peepal.agent   # macOS
schtasks /Query /TN PeepalAgent       # Windows

peepal-agent -config <data>/config.json -check-updates   # force an update now
sudo peepal-setup --uninstall                            # remove, keeping data
```

Logs are in `data/logs/agent.log`, rotated at 8 MiB.

## Known constraints

- **Code signing.** Unsigned builds trigger SmartScreen on Windows and
  Gatekeeper on macOS. Both workflows accept a certificate and a notary
  profile; supply them before shipping to customers.
- **Linux arm64 PostgreSQL.** EnterpriseDB publishes no arm64 build. The `.deb`
  depends on the distro `postgresql` package (17 on Debian Trixie / Raspberry Pi
  OS) so `apt` installs it *before* setup, and the wizard never nests `apt`
  inside `dpkg`.
- **macOS Intel PostgreSQL.** Without Homebrew the installer uses the x86_64
  EnterpriseDB archive, which needs Rosetta on Apple Silicon.
- **Windows service model.** The agent runs as a SYSTEM scheduled task rather
  than a true Windows service, because it is a plain console program that
  never reports to the Service Control Manager.
