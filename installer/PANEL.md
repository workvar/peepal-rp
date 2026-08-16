# Control panel

A graphical installer that stays on as a management console. It reads one
YAML file, installs whatever that file describes, then supervises it, ships
logs and metrics to the developer, and applies updates on its own.

```
peepal-panel   the window: setup wizard, then dashboard, services, logs,
               updates, configuration, monitoring
peepal-panel -headless   the same controller with no window; this is what the
               OS service runs
peepal-hub     the developer's collector: heartbeats in, commands out
```

The panel is deliberately generic. `peepal.yml` is the Peepal definition;
another product only has to supply its own file.

## Installing

**Windows**

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**Linux**

```bash
sudo ./install.sh              # opens the panel
sudo ./install.sh --headless   # a server with no desktop
```

Both scripts copy the panel and `app.yml` into place and hand over. Everything
after that happens in the panel.

## What the panel does when you press Install

1. **Machine** — administrator rights, free disk, free ports, and which of
   git/Go/Node are already present.
2. **Prerequisites** — the missing ones, via winget/choco (Windows),
   apt/dnf/pacman/zypper/apk (Linux) or brew (macOS). If no package manager
   answers, Go and Node are downloaded from go.dev and nodejs.org into
   `<root>/runtime` and put ahead of the system copies on PATH. Only Git has
   no portable fallback.
3. **Source** — `git clone --depth 1 --branch main` for each repository, then
   checkout of the newest published release tag. Re-running fetches instead of
   re-cloning. A private repository is authenticated first; see below.
4. **Database** — either a local PostgreSQL the panel installs, initialises
   and supervises, or a cloud URI you paste, validated and dialled before it
   is written anywhere.
5. **Access** — local (`http://localhost` plus the LAN address) or a domain,
   which sets the public URL and cookie domain in the environment.
6. **Configuration** — every variable the definition declares is written to
   `<data>/env/<service>.env`. Secrets are generated once and reused on every
   later update, so nobody is logged out by a rebuild.
7. **Build** — the definition's build steps, streamed line by line into the
   window.
8. **Service** — systemd unit, launchd daemon or a SYSTEM scheduled task
   running `peepal-panel -headless`.

## Layout on the machine

```
/opt/peepal            C:\Program Files\Peepal
├── bin/peepal-panel
├── src/peepal-rp/     the checkout, replaced by git, never by hand
├── runtime/{go,node,pgsql}
└── data/
    ├── app.yml        the definition plus the operator's answers
    ├── env/*.env      one file per service
    ├── pgdata/        the database
    ├── uploads/       outside src/, so a rebuild cannot delete it
    ├── state.json     installed release and commit, last update, last error
    ├── install-id     the random identifier the hub knows this machine by
    └── logs/agent.log rotated at 8 MiB
```

`data/` sits outside the checkouts on purpose: an update can reset `src/`
wholesale without touching anything a customer cares about.

## Private repositories

`auth.method: token` makes the panel send an `Authorization: Basic` header on
every git invocation, built from `-c http.extraheader=...`. That is
deliberate: a credential embedded in the remote URL ends up in `.git/config`
in plain text, in `git remote -v` and in half the lines git prints, where a
backup or a support engineer picks it up. The header form exists only in the
argument list of one process, and the token is masked in anything the panel
logs or ships to the hub.

The token can arrive three ways, highest precedence first:

1. **Typed into the wizard.** The Repository step asks for it and checks it
   against the GitHub API before the install starts, so a wrong or expired
   token fails in two seconds rather than ten minutes in, after Go and Node
   are already installed.
2. **From the environment**, named by `auth.token_env` — for a scripted or
   headless install.
3. **Compiled into the panel** at build time:

   ```bash
   go build -ldflags "-X github.com/peepal/installer/internal/setup.BuiltInToken=github_pat_..."
   ```

   The customer then double-clicks an installer that already has read access
   and is never handed a credential. Treat that build as a secret and rotate
   the token when a customer relationship ends.

Use a **fine-grained** PAT scoped to the one repository with `Contents: read`
and nothing else. A classic PAT with `repo` grants write access to everything
the account can see, which is not what belongs on a customer's machine.

For an SSH deploy key instead, set the remote to
`git@github.com:owner/repo.git` and `auth.method: ssh`. The key has to be on
the machine and in the service account's `~/.ssh` before setup runs, which is
why the token route is the default: it survives a customer machine being
rebuilt.

## Updates

`updates.track` decides what counts as an update:

| Value | Meaning |
| --- | --- |
| `release` (default) | only a newer semver tag ships |
| `branch` | every commit on the tracked branch ships |
| `prerelease` | as `release`, but `v2.0.0-rc1` counts too |

Tracking releases, the agent asks the remote for its tag list on a timer,
takes the highest semver tag and compares it with what is checked out. A
commit pushed to `main` reaches customers when it is tagged, not before.

When there is something to apply it flips the shared state to `updating` —
from that moment the front door answers **HTTP 503** with a self-refreshing
maintenance page instead of a dead connection — then fetches the branch,
checks out the tag, rebuilds, migrates, restarts and waits for health. Any
failure resets every checkout to the commit that was running, rebuilds that,
and brings it back: a bad release costs a few minutes of maintenance page
rather than a support visit.

`updates.window_start_hour`/`window_end_hour` restrict installs to quiet
hours. Equal values mean any time. `auto_apply: false` reports the update in
the panel and waits for a person.

The running version is read from the checkout itself — the tag when one is
checked out, `git describe` otherwise — and shown in the sidebar, on Overview,
on Updates and on Configuration. Nothing writes a version string to a file
that could drift from what is actually deployed.

### Publishing a release

```bash
git tag -a v1.2.0 -m "Peepal ERP 1.2.0"
git push origin v1.2.0
```

Machines pick it up within `check_every_minutes`, or immediately from the
panel's **Check now** button or an `update` command from the hub.

## Monitoring

Everything is outbound HTTPS. No port is opened on the customer's network.

- **Heartbeat** every `heartbeat_seconds`: mode, uptime, CPU, memory, free
  disk, per-service health, installed commits.
- **Errors** as they happen: any log line containing ERROR, FATAL, PANIC or
  an unexpected exit is posted immediately.
- **Logs**: only with `ship_logs: true`, batched.

The hub's reply to a heartbeat carries the commands the developer queued, so
remote control works without an inbound connection. The delay is at most one
heartbeat.

| Command | Effect |
| --- | --- |
| `restart` | one service (`args.service`) or the whole application |
| `stop` / `start` | take the stack down or bring it back |
| `status` | the current metrics payload |
| `logs` | the tail of the agent log (`args.lines`) |
| `update` | pull, rebuild, migrate, restart now |
| `rebuild` | rebuild the current checkouts |
| `env` | every variable, secrets masked |
| `panel_info` | versions, paths, uptime, telemetry stats |
| `exec` | one command, only if it matches `monitoring.exec_allow` |

`remote_control: false` refuses all of them. `allow_exec` is off by default
and the allow-list is the entire security boundary: whatever is listed there
can be run by whoever controls the hub. Entries match exactly, or as a prefix
when they end in `*`.

Setting the hub up and switching heartbeats on across a fleet is covered in
detail in [HUB.md](HUB.md).

### Running the hub

```bash
HUB_TOKEN=... HUB_ADMIN_TOKEN=... ./peepal-hub -addr :9000 -data ./hub-data
```

Put it behind a TLS terminator. `/` is the developer console (append
`?token=<admin token>`), which lists every installation with its health and
queues commands. Events are appended as line-delimited JSON per install, so
`grep` works.

Point an installation at it with `monitoring.hub_url` and `monitoring.token`,
or by filling those fields in during setup.

## Writing a definition for a different product

`peepal.yml` is the worked example. The parts that matter:

```yaml
toolchain:   what must exist before building
repos:       what to clone (name, url, branch, dir, subdir for a monorepo)
auth:        how a private host is reached (token, ssh or none)
database:    postgres or none; url_var names the variable that receives the DSN
env:         every variable, with secret / prompt / target per entry
build:       shell commands, per repo directory, with an OS filter
services:    command, port, health path and the route prefixes it serves
routing:     the front-door port and which variables carry the public URL
updates:     what counts as an update (track), interval, quiet hours, auto-apply
monitoring:  hub, heartbeat, log shipping, remote control, exec allow-list
```

Templates use `{{.Var}}`: `Root`, `Data`, `Src`, `Uploads`, `DatabaseURL`,
`PublicURL`, `Domain`, `HTTPPort`, `AppName`, `Platform`, `NodeBin`, `GoBin`,
`ServiceUser`, `Exe`. An unknown name is an error rather than an empty
string, because a silently empty JWT secret is worse than a failed install.

Exactly one service must claim the `/` route; it is the fallback. Longer
prefixes win, so `/api/v1/graphql` can go somewhere other than `/api/`.

## Building

```bash
VERSION=1.0.0 ./packaging/panel/build.sh    # Linux, macOS
$env:VERSION="1.0.0"; .\packaging\panel\build.ps1   # Windows
```

The panel is a Wails v2 application: building it needs the WebKit/GTK
development packages on Linux and WebView2 on Windows (the build script
embeds the bootstrapper, so target machines need nothing). The frontend is
plain HTML, CSS and JavaScript with no build step, so `wails build` has
nothing to install first.

## Known constraints

- **Code signing.** Unsigned builds trigger SmartScreen and Gatekeeper. Sign
  before shipping to customers.
- **Windows service model.** The headless panel runs as a SYSTEM scheduled
  task, not a true Windows service, because it never reports to the Service
  Control Manager.
- **Rollback depth.** Checkouts are shallow, so a rollback can only reach the
  commit that was running before this update. That is the case that matters;
  older ones need a fresh clone.
- **Git has no portable fallback.** Every other prerequisite can be installed
  without a package manager; Git cannot.
