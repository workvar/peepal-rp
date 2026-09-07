# Passkey sign-in (WebAuthn) and the optional PIN

Passkeys are a second way into the same accounts. Password login is unchanged
and still the default; a user opts in by adding a passkey from **Profile →
Passkeys**, and may add a 6-digit PIN as a second step on top of it.

Two properties are worth stating plainly, because they are the reason to have
this at all:

- **Nothing shared is stored.** The private key never leaves the user's device.
  A dump of the credential table grants nobody a login.
- **It cannot be phished.** The browser only releases a credential to a page
  under the registered domain, so a look-alike site gets nothing, even from a
  user who types everything it asks for.

The PIN adds the other half — something the user knows — for shared or
unattended machines, where "possession of the laptop" is weaker than it sounds.

---

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `WEBAUTHN_RP_ID` | hostname of `APP_BASE_URL` | The domain passkeys are bound to. |
| `WEBAUTHN_RP_NAME` | `Peepal` | The name shown in the browser's passkey prompt. |

**Set `WEBAUTHN_RP_ID` explicitly in any subdomain-per-tenant deployment.** It
must be the shared registrable domain (`roserp.workvar.com`), not one tenant's
host. A credential is only offered back to pages under the RP ID it was created
with, so scoping it to `acme.roserp.workvar.com` would strand that user's
passkey the moment they moved to another workspace — and the key cannot be
migrated afterwards, only replaced.

The permitted **origin** is decided per request rather than listed in config,
because the list of tenant subdomains is open-ended. The request's `Origin`
header is accepted only after it is checked against the RP ID (equal to it, or a
subdomain of it, over HTTPS; plain HTTP for loopback only, so local development
works without a certificate).

WebAuthn requires a secure context. Over plain HTTP on anything other than
`localhost`, the browser will not run the ceremony at all.

---

## Endpoints

All under `/api/v1/auth`. Responses use the standard envelope
(`{ success, message, data, error }`); the `data` field is described below.

### Sign-in (unauthenticated)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/passkey/login/begin` | `{ tenant_subdomain?, identifier? }` | `{ challenge_id, options }` |
| POST | `/passkey/login/finish` | `{ challenge_id, credential }` | session payload, **or** `{ pin_required: true, pin_token, user }` |
| POST | `/passkey/pin` | `{ pin_token, pin }` | session payload |

`options` is passed straight to `navigator.credentials.get({ publicKey })`.

Omitting `identifier` runs the **discoverable** flow: the authenticator picks
the account and returns the user handle. Supplying one runs **identifier-first**,
for authenticators that cannot store a resident key. An unknown identifier still
gets a well-formed challenge — one naming a credential nothing will match — so
this endpoint cannot be used to find out which accounts exist.

`tenant_subdomain` scopes the login exactly as it does for password login.
Omitting it means only a super admin may complete the ceremony, matching
`/super/login`.

The session payload is identical to `/auth/login`: the same cookies are set, and
native clients (those sending `X-Client: mobile|native|api`) get `token` and
`refresh_token` in the body the same way.

### PIN step

`pin_required` means the passkey was verified but no session exists yet.
`pin_token` is opaque, single-use, and expires in 5 minutes; only its hash is
stored server-side.

Response codes from `/passkey/pin` are load-bearing for the client:

| Code | Meaning | What the UI should do |
| --- | --- | --- |
| 200 | PIN accepted | Session established |
| 400 | Wrong PIN, tries remain (`data.attempts_remaining`) | Stay on the PIN field |
| 401 | `pin_token` unknown, spent, or expired | Return to the passkey step |
| 429 | Locked out, or the per-IP throttle tripped | Return to the passkey step |

### Enrolment and management (authenticated)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/passkey/register/begin` | — | `{ challenge_id, options }` for `navigator.credentials.create` |
| POST | `/passkey/register/finish` | `{ challenge_id, credential, name }` | Stores the credential |
| GET | `/passkeys` | — | `{ passkeys: [...], pin_enabled }` |
| PATCH | `/passkeys/:id` | `{ name }` | Rename |
| DELETE | `/passkeys/:id` | — | Removes it; also clears the PIN if it was the last one |
| GET | `/pin` | — | `{ enabled, has_passkeys, locked_until? }` |
| PUT | `/pin` | `{ pin, current_pin? \| password? }` | Set or change |
| DELETE | `/pin` | `{ current_pin? \| password? }` | Turn off |

Enrolment is gated by an existing session because adding a credential is adding
a way to sign in. Setting or removing a PIN re-proves the account on top of
that — with the current PIN where one exists, and the account password
otherwise — so an unlocked, unattended session cannot be turned into a
permanent foothold.

---

## Rules the implementation holds to

- **A challenge is answerable once.** `ConsumeCeremony` deletes the row as it
  reads it, and a registration challenge cannot be redeemed as a login.
- **A credential ID maps to one account, globally.** That mapping is what a
  discoverable login resolves identity from, so the column is uniquely indexed.
- **The user handle must agree with the stored owner.** A credential that
  returns a handle for a different user is refused rather than followed.
- **Every gate that guards password login is re-applied.** Active account,
  matching tenant, live subscription, and the super-admin/tenant split — checked
  after the assertion, and again after the PIN, because the pending token lives
  for minutes and an account can be disabled inside that window.
- **The signature counter is written back on every login.** A counter that goes
  backwards raises a clone warning, which is surfaced in the passkey list and
  logged; it is not treated as a failed login, because the legitimate device is
  as likely to be the one presenting it.
- **PIN guessing is bounded, not hidden.** Six digits is a million values, so
  the throttle is the control: 5 wrong attempts lock the account for 15 minutes,
  the lock refuses even the correct PIN while it lasts, and a per-IP limiter
  stops one host spreading guesses across many accounts. Hashes are bcrypt.
- **User verification is required** on every ceremony. The PIN is optional, so
  without it the device's own biometric or unlock code is the only thing between
  a borrowed laptop and the account.

## Data

| Table | Holds |
| --- | --- |
| `web_authn_credentials` | One row per passkey: public key (as the library's credential record, JSON), counter, transports, owner |
| `web_authn_sessions` | In-flight challenges, 5-minute TTL, deleted on use |
| `login_pins` | One row per user: bcrypt hash, failed-attempt count, lockout deadline |
| `pending_logins` | Logins waiting on their PIN; token hash only, 5-minute TTL |

All four are created by `AutoMigrate`; no manual migration step is needed.

## Recovery

A user who loses every device keeps their password, which is the intended
fallback — passkeys are additive here, not a replacement. An admin resetting a
password revokes all sessions as before; it does not remove passkeys, which stay
valid until the user deletes them from their profile.

## Testing

- `backend/models/login_pin_test.go` — PIN format policy, the lockout (including
  that a correct PIN is refused during it), attempt accounting, pending-login
  lifetime.
- `backend/models/webauthn_test.go` — credential storage and owner scoping,
  global uniqueness of credential IDs, counter write-back, and single-use,
  purpose-bound, expiring ceremonies.

Run with `go test ./models/...` from `backend/`.
