# Developer's guide: the hub and heartbeats

How to stand up the monitoring hub, point every installation at it, and use
what comes back. Written for whoever is on call for the fleet.

The model in one paragraph: every installation posts a heartbeat outward over
HTTPS on a timer. The hub answers each heartbeat with whatever commands you
queued for that machine, and the panel runs them and posts the results back.
Nothing ever connects *into* a customer's network, so there is no port to open,
no VPN, no static IP, and it works from behind NAT and a corporate firewall.
The cost is latency: a command takes effect within one heartbeat interval.

```
customer machine                          your server
┌────────────────────┐                    ┌──────────────────┐
│ peepal-panel       │  POST /api/events  │ peepal-hub       │
│  heartbeat ────────┼───────────────────►│  store + console │
│  errors    ────────┼───────────────────►│                  │
│            ◄───────┼────────────────────┤  queued commands │
│  results   ────────┼───────────────────►│                  │
└────────────────────┘  POST /api/results └──────────────────┘
```

---

## 1. Build the hub

The hub is a plain Go binary with no cgo, no database and no assets. It builds
on anything.

```bash
cd installer
CGO_ENABLED=0 go build -o dist/peepal-hub ./cmd/peepal-hub

# or for a Linux server from a Mac
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o dist/peepal-hub ./cmd/peepal-hub
```

`packaging/panel/build.sh` produces it alongside the panel.

## 2. Generate the two tokens

The hub has two, and they are not interchangeable.

| Token | Held by | Can do |
| --- | --- | --- |
| `HUB_TOKEN` | every installation | post events and results |
| `HUB_ADMIN_TOKEN` | you | list installations, read events, **queue commands** |

The admin token is the dangerous one: it can queue `restart`, `update` and
`exec` against any machine. Keep it out of `app.yml`, out of the installers,
and out of anything a customer touches.

```bash
openssl rand -hex 32   # HUB_TOKEN
openssl rand -hex 32   # HUB_ADMIN_TOKEN
```

## 3. Run it

```bash
HUB_TOKEN=<agent-token> HUB_ADMIN_TOKEN=<admin-token> \
  ./peepal-hub -addr 127.0.0.1:9000 -data /var/lib/peepal-hub
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `-addr` | `:9000` | listen address |
| `-data` | `./hub-data` | where per-install event logs are written |
| `-token` | `$HUB_TOKEN` | the installation token |
| `-admin-token` | `$HUB_ADMIN_TOKEN` | the console token |

It refuses to start without both tokens, on purpose: an unauthenticated hub is
a remote-execution service for whoever finds it.

Bind it to loopback and put TLS in front. **The hub speaks plain HTTP.** Tokens
travel as bearer headers, so terminating TLS is not optional.

### As a systemd service

`/etc/systemd/system/peepal-hub.service`:

```ini
[Unit]
Description=Peepal monitoring hub
After=network-online.target

[Service]
User=peepal-hub
Environment=HUB_TOKEN=<agent-token>
Environment=HUB_ADMIN_TOKEN=<admin-token>
ExecStart=/usr/local/bin/peepal-hub -addr 127.0.0.1:9000 -data /var/lib/peepal-hub
Restart=always
RestartSec=5
# The hub only ever writes under -data.
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/peepal-hub
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system --home /var/lib/peepal-hub --shell /usr/sbin/nologin peepal-hub
sudo install -d -o peepal-hub -g peepal-hub /var/lib/peepal-hub
sudo systemctl enable --now peepal-hub
```

Put the environment lines in a `0600` drop-in (`systemctl edit peepal-hub`)
rather than the unit file itself if the unit is in version control.

### TLS in front

Caddy, which gets a certificate on its own:

```
hub.example.com {
    reverse_proxy 127.0.0.1:9000
}
```

Or nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name hub.example.com;

    ssl_certificate     /etc/letsencrypt/live/hub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        # A logs command can return a few hundred KB.
        proxy_read_timeout 60s;
        client_max_body_size 8m;
    }
}
```

Check it before touching any installation:

```bash
curl -s https://hub.example.com/api/installs -H "Authorization: Bearer <admin-token>"
# []
```

An empty array means the hub is up and nothing has reported yet.

---

## 4. Turn heartbeats on

### New installations

The Settings step of the wizard asks for the hub URL and token. Fill both in
and monitoring is on from first boot — nothing else to do.

To have every installer arrive pre-configured, ship an `app.yml` with the
values already set, next to the panel binary:

```yaml
monitoring:
  enabled: true
  hub_url: https://hub.example.com
  token: <agent-token>
  heartbeat_seconds: 60
  ship_logs: false
  remote_control: true
  allow_exec: false
```

The agent token is not a secret from the customer in any meaningful sense —
it is on their machine — but it is shared across the fleet, so rotating it
means touching every install. See rotation below.

### Installations that are already out there

Monitoring is read from the *data directory* copy of the definition, which is
the one the panel wrote during setup. Editing the file you originally shipped
does nothing.

| Platform | File |
| --- | --- |
| Linux | `/opt/peepal/data/app.yml` |
| Windows | `C:\Program Files\Peepal\data\app.yml` |
| macOS | `/usr/local/peepal/data/app.yml` |

Edit the `monitoring:` block, then restart so the change is read:

```bash
sudo systemctl restart peepal            # Linux
sudo launchctl kickstart -k system/com.peepal.agent   # macOS
schtasks /End /TN PeepalAgent && schtasks /Run /TN PeepalAgent   # Windows
```

The file holds the database password and the repository token, so it is
`0600`. Keep it that way after editing.

If you cannot reach the machine at all, the operator can do it from the panel:
open it, and the values are on the Settings step of a re-run, or hand them the
two lines to paste.

### Verify

Within one heartbeat interval:

```bash
curl -s https://hub.example.com/api/installs \
  -H "Authorization: Bearer <admin-token>" | jq '.[] | {id, app, version, last_seen}'
```

Or open `https://hub.example.com/?token=<admin-token>` in a browser.

On the machine itself, the panel's **Monitoring** screen shows events sent,
events dropped, last send time and the last error, which is the fastest way to
tell "the hub is unreachable" from "monitoring was never switched on".

---

## 5. What each installation sends

**Identity.** A random 16-character hex string generated on first run and kept
in `data/install-id`. It is deliberately not the hostname or a MAC address:
you need to tell machines apart, not to identify hardware. Note it against the
customer in whatever you use for support, because the hub only knows the ID.

**Heartbeat**, every `heartbeat_seconds` (minimum 15, default 60):

```json
{
  "kind": "heartbeat",
  "at": "2026-08-16T09:00:00Z",
  "app": "peepal",
  "install_id": "9f2c1ab47d3e05b8",
  "version": "1.0.0",
  "metrics": {
    "mode": "running",
    "uptime_seconds": 486320,
    "cpu_percent": 7.4,
    "mem_used_bytes": 5417504768,
    "mem_total_bytes": 16777216000,
    "disk_free_bytes": 91234567890,
    "services": [
      {"name": "backend",  "running": true, "healthy": true, "port": 3001},
      {"name": "frontend", "running": true, "healthy": true, "port": 3000}
    ],
    "commits": {"app": "3f1c9d2..."}
  }
}
```

`mode` is `starting`, `running`, `updating` or `failed` — the same state the
front door uses to decide whether to serve the maintenance page.

**Errors**, immediately, one event per line: any log line containing ERROR,
FATAL, PANIC, TRACEBACK or "exited unexpectedly". This is what you want an
alert on.

**Lifecycle**: started, stopped, "update available: app v1.0.0 → v1.1.0",
"update applied: v1.1.0", "update failed: …".

**Logs**: only with `ship_logs: true`, batched every 15 seconds or 200 lines.
Leave it off for a normal deployment and turn it on for one machine you are
debugging; it is a lot of traffic and it is the one setting that ships routine
customer data off-site.

Nothing is sent when `enabled: false` or `hub_url` is empty. Secrets are masked
before they leave: the `env` command replaces any value whose key contains
SECRET, PASSWORD, TOKEN, KEY, DSN, DATABASE_URL or URI with its first two
characters and asterisks, and the repository token is stripped from git output.

### Delivery guarantees

There are none, deliberately. The client holds a 256-event queue; if the hub is
down the queue fills and further events are **dropped** rather than blocking
the ERP. Heartbeats are sent synchronously and simply fail; the next one goes
out on schedule. Errors get one retry after 10 seconds.

The consequence: the hub is a monitoring aid, not an audit log. If you need
every line, `ship_logs` plus a real log pipeline is the answer, not this.

---

## 6. Reading and driving the fleet

### The console

`https://hub.example.com/?token=<admin-token>` lists every installation with a
green dot when a heartbeat arrived in the last five minutes, its app, version,
mode, CPU, memory, error count and last-seen time. **Open** shows the recent
event stream and command results for one machine; the other buttons queue a
command.

The token is in the URL because this is a single-page tool with no login. That
means it lands in browser history and in any proxy log in front of it. Treat
the URL as the credential it is, and put the hub behind an SSO proxy or an IP
allow-list if that is not acceptable.

### The API

```bash
ADMIN=<admin-token>
HUB=https://hub.example.com

# every installation
curl -s $HUB/api/installs -H "Authorization: Bearer $ADMIN"

# one installation with its recent events
curl -s $HUB/api/install/9f2c1ab47d3e05b8 -H "Authorization: Bearer $ADMIN"

# queue a command
curl -s $HUB/api/command -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"install_id":"9f2c1ab47d3e05b8","name":"restart","args":{"service":"backend"}}'
```

The command is delivered on the machine's next heartbeat and its result shows
up under `results` on the install. Nothing is instant; with the default
interval, expect up to a minute.

| Command | `args` | Effect |
| --- | --- | --- |
| `restart` | `service` (optional) | restart one service, or the application |
| `stop` / `start` | – | take the stack down, bring it back |
| `status` | – | return the current metrics payload |
| `logs` | `lines` (default 200, max 2000) | tail of the agent log |
| `update` | – | fetch the newest release, rebuild, migrate, restart |
| `rebuild` | – | rebuild the current checkout |
| `env` | – | every variable, secrets masked |
| `panel_info` | – | versions, paths, uptime, telemetry stats |
| `exec` | `command` | run one allow-listed command |

`remote_control: false` on an installation refuses all of them. `exec` needs
`allow_exec: true` **and** a match in `monitoring.exec_allow`, which is the
whole security boundary — whatever is listed there can be run by whoever holds
the admin token. Entries match exactly, or as a prefix when they end in `*`.
Leave `allow_exec` off unless you are actively debugging a machine, and turn it
back off afterwards.

### On disk

Every event is appended as one JSON line to `<data>/<install-id>.jsonl`, so
ordinary tools work:

```bash
# errors from one machine today
grep '"kind":"error"' /var/lib/peepal-hub/9f2c1ab47d3e05b8.jsonl |
  jq -r 'select(.at > "2026-08-16") | "\(.at) \(.message)"'

# which versions are in the field
for f in /var/lib/peepal-hub/*.jsonl; do tail -1 "$f" | jq -r '.version'; done | sort | uniq -c
```

Nothing rotates these files. Add a logrotate rule or a cron job before the
fleet gets large.

The in-memory view (what `/api/installs` returns) is rebuilt from heartbeats,
so restarting the hub empties the console until each machine checks in again.
The `.jsonl` files are never lost.

---

## 7. Alerting

The hub has no alerting of its own — it is 400 lines and meant to stay that
way. Poll it from whatever you already use:

```bash
#!/usr/bin/env bash
# Anything not seen for 15 minutes, or with a failed mode.
curl -s "$HUB/api/installs" -H "Authorization: Bearer $ADMIN" |
jq -r --argjson cutoff "$(( $(date +%s) - 900 ))" '
  .[] | select((.last_seen | fromdate) < $cutoff or .metrics.mode == "failed")
      | "\(.id) \(.app) \(.metrics.mode // "silent") last seen \(.last_seen)"'
```

Worth alerting on, in rough order of usefulness:

- **silent for more than 3 heartbeat intervals** — the machine, the network or
  the panel is down;
- **`mode == "failed"`** — a service did not come back, or an update rolled
  back;
- **a service with `running: true, healthy: false`** — the process is alive but
  not answering, which is usually a database or migration problem;
- **`disk_free_bytes` under a few GB** — builds need room, and an update will
  fail without it;
- **error events** — rate-limit these, a crash loop produces one per restart.

---

## 8. Rotating tokens

**Agent token.** Shared by the fleet, so a rotation is a fleet-wide edit.
The practical route: run a second hub process on another port with the new
token, move installations over as you touch them, then retire the old one.
There is no support for two valid tokens in one process — deliberately, since
the alternative is a token list that never gets pruned.

**Admin token.** Change the environment variable and restart the hub. No
installation holds it, so nothing else is affected. Do this whenever someone
who had it leaves.

---

## 9. Troubleshooting

**Nothing appears in the console.** Check the panel's Monitoring screen on the
machine first: `enabled: false` shows as disabled; a wrong URL or an expired
certificate shows as the last error. Then `curl` the hub's `/api/installs` with
the admin token to confirm the hub itself is answering.

**Events sent is climbing but the console is empty.** Two hubs, or two data
directories. Check `-data` and that the URL you are opening is the one the
installation posts to.

**`unauthorised` in the hub log.** The installation is using the admin token,
or you are using the agent token on the console. They are not interchangeable.

**Commands are queued but nothing happens.** `remote_control: false` on that
installation, or the panel is not running (a queued command survives; it is
delivered on the next heartbeat whenever that is). Check `results` on the
install for a refusal message.

**`exec` is refused.** `allow_exec: false`, or the command is not in
`exec_allow`. The refusal names which.

**A machine reports but shows no release.** It is running the tip of `main`
rather than a tag — either the repository has no tags yet, or the install
predates release tracking. See PANEL.md.

---

## 10. Checklist for a new deployment

```
[ ] hub built and running behind TLS, bound to loopback
[ ] both tokens generated; admin token stored somewhere the fleet cannot reach
[ ] /api/installs answers with [] over HTTPS
[ ] app.yml shipped with hub_url, token, enabled: true
[ ] first installation appears in the console within a minute
[ ] a restart command round-trips and its result lands under results
[ ] silence and failed-mode alerts wired into on-call
[ ] logrotate (or equivalent) on <data>/*.jsonl
[ ] ship_logs: false and allow_exec: false in the shipped definition
```
