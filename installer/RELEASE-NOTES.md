# Release notes

## v1.1.0 — On-prem installer & tenant update UX

Extends `peepal-installer` / `peepal-agent` so customer machines install to
stable app paths, configure every backend env key interactively, and let
tenant admins apply updates from the ERP UI while optional auto-apply continues
in the background.

### Install & layout

- Default roots: Linux `/opt/apps/peepal-rp`, macOS `/usr/local/apps/peepal-rp`,
  Windows `C:\Program Files\PeepalRP` (data always under `<root>/data`).
- Packaging scripts (deb/rpm, pkg, Inno) updated for the new paths.
- First install walks **every** key in `backend/.env.example` (required vs
  optional called out; secrets can be generated). Updates only prompt for
  **new required** keys and keep existing secrets.
- `PEEPAL_AGENT_URL` / `PEEPAL_AGENT_TOKEN` written for the loopback control API.
- First-time seed recorded as `seeded` in `data/state.json`.

### Agent

- Loopback control API on `127.0.0.1:9080` (Bearer token): status, force check,
  apply now. Same release-asset swap, maintenance page, and rollback as before.
- Auto-apply and quiet hours unchanged; a tenant “Remind later” does not delay
  install-wide auto-apply.

### Product UI

- Presence WebSocket (`GET /api/v1/presence`) counts active users per tenant.
- GraphQL: `systemUpdateStatus`, `snoozeSystemUpdate`, `applySystemUpdate`
  (tenant **admin** only).
- Dashboard modal: “New updates are available…” with active-user count,
  **Update now** / **Remind later** (1 hour per tenant).

### Docs & monorepo

- Root [`INSTALLATION.md`](../INSTALLATION.md) for development and on-prem setup.
- Design/plan under `docs/superpowers/`.
- Backend and frontend absorbed into the monorepo with workspace tooling.

### Upgrade notes

- Existing installs that already store an absolute `install_root` in
  `config.json` keep that path; new defaults apply to fresh installs.
- After upgrading the agent/app, ensure `PEEPAL_AGENT_TOKEN` in
  `data/backend.env` matches `agent_token` in `data/config.json`.
- Run backend migrate (`peepal-backend --migrate` / installer update path) so
  `tenants.update_snoozed_until` is present.

---

## v1.0.0 — Peepal Control Panel

The first release. A single graphical application that installs Peepal ERP on
a customer's Windows or Linux machine, then stays on as the management console
for it: services, logs, updates and a link back to the developer.

### Installing

Windows: `powershell -ExecutionPolicy Bypass -File .\install.ps1`
Linux: `sudo ./install.sh` (or `--headless` on a server with no desktop)

Everything after that happens in the panel window.

### What it does

**Sets the machine up.** Checks administrator rights, free disk and free
ports, then installs Git, Go 1.22+ and Node 20+ if they are missing — via
winget or Chocolatey on Windows, apt/dnf/yum/zypper/pacman/apk on Linux,
Homebrew on macOS. When no package manager answers, Go and Node are
downloaded from go.dev and nodejs.org into the installation's own `runtime/`
directory and put ahead of the system copies on PATH.

**Fetches the source.** Clones `workvar/peepal-rp` and checks out the newest
published release tag.

**Provisions storage.** Either installs, initialises and supervises a local
PostgreSQL 16 cluster, or takes a cloud connection URI, which is validated
and dialled before it is written anywhere.

**Configures access.** Local (`http://localhost` plus the LAN address) or a
domain, which sets the public URL and the cookie domain across both services.

**Writes the environment.** Every variable the definition declares lands in
`data/env/<service>.env`. Secrets are generated once and reused on every later
update, so a rebuild never logs anyone out.

**Builds and runs.** Compiles the Go backend, builds the Next.js frontend, and
supervises both behind one front-door port, with `/api/` routed to the backend
and everything else to the frontend.

**Keeps running.** Registers a systemd unit, launchd daemon or SYSTEM
scheduled task, so the ERP comes back after a power cut without anyone logging
in.

### Updates

The panel follows **published releases**, not commits. A push to `main` reaches
customer machines only once it is tagged, so an unreviewed commit can never
ship by accident. Every hour the panel asks the remote for its tag list, takes
the highest semver tag, and if it is newer than what is running:

1. the front door starts answering HTTP 503 with a self-refreshing maintenance
   page, so nobody sees a dead connection;
2. the tag is fetched and checked out;
3. both services are rebuilt and the backend migration runs;
4. everything restarts and is waited on for health.

If any step fails, every checkout is reset to the commit that was running,
rebuilt and restarted. A bad release costs a few minutes of maintenance page
rather than a support visit.

Quiet hours (`window_start_hour` / `window_end_hour`) restrict when updates
apply. `auto_apply: false` reports the waiting release and leaves the decision
to a person. Prereleases (`v2.0.0-rc1`) are skipped unless `track:
prerelease` is set.

The version running is shown in the sidebar, on the Overview screen, and on
Updates next to what is available — the string comes from what is actually
checked out, not from a file that could drift.

### Private repository access

`workvar/peepal-rp` is private. The panel authenticates with a token supplied
one of three ways, highest precedence first: typed into the Repository step of
the wizard, read from `PEEPAL_REPO_TOKEN`, or compiled into the panel at build
time so the customer double-clicks an installer that already has read access.

The token is sent as an HTTP `Authorization` header on each git invocation
rather than being written into the remote URL, so it never lands in
`.git/config`, in `git remote -v` or in a log line, and it is masked in
anything shipped to the monitoring hub. The wizard checks the token against
the GitHub API before the install starts, so a bad credential fails in two
seconds rather than ten minutes in.

An SSH deploy key works as an alternative: change the URL to
`git@github.com:workvar/peepal-rp.git` and set `auth.method: ssh`.

### Monitoring

With a hub configured, each installation posts a heartbeat carrying mode,
uptime, CPU, memory, free disk, per-service health and the running release.
Error lines — ERROR, FATAL, PANIC, unexpected exits — are posted as they
happen; full logs only with `ship_logs: true`.

The hub's reply to a heartbeat carries queued commands, which is how remote
control works without opening a port on the customer's network: restart, stop,
start, status, logs, update, rebuild, env (secrets masked) and, only against
an explicit allow-list, exec. `remote_control: false` refuses all of them.

`peepal-hub` ships alongside the panel: a single binary with a console listing
every installation, its health and its release.

### Generic by design

Nothing about Peepal is compiled into the panel. `app.yml` names the
repositories, prerequisites, build commands, services, routes, environment and
update policy; a different product only supplies a different file.

### Known constraints

- Unsigned builds trigger SmartScreen on Windows and Gatekeeper on macOS. Sign
  before shipping to customers.
- On Windows the headless panel runs as a SYSTEM scheduled task, not a true
  Windows service, because it never reports to the Service Control Manager.
- Rollback reaches the release that was running before this update; checkouts
  are shallow, so older ones need a fresh clone.
- Git is the one prerequisite with no portable fallback: a machine with no
  package manager needs it installed by hand.

---

## Publishing the first ERP release

The panel installs the newest tag, so `workvar/peepal-rp` needs one. Until it
has a tag, a fresh install falls back to the tip of `main` and the panel shows
the short commit instead of a version.

```bash
git tag -a v1.0.0 -m "Peepal ERP 1.0.0"
git push origin v1.0.0
```

From then on, every release is a tag on `main`. Machines pick it up within an
hour, or immediately from the panel's **Check now** button or a `update`
command from the hub.
