# Peepal Companion Mobile App: Plan

Status: **Phase 0 complete** (backend prerequisites built and verified).
Phase 1 (the Expo app shell) is the next thing to start.

Scope decision for v1: **healthcare tenants first**, **read plus light actions**,
**cached reads only** (no offline write queue).

---

## 1. What the codebase gives us for free

The mobile app is a new client on an existing platform, not a new product. What
already exists and is reusable as-is:

| Asset | Location | Reuse |
|---|---|---|
| GraphQL API, ~7000 line schema | `backend/graph/schema.graphqls`, `POST /api/v1/graphql` | The app's only data API |
| Role model (`admin`, `teacher`, `staff`, `student`, `patient`, `super_admin`) | `backend/models`, `graph/authz.go` | Role ids are stable, reuse verbatim |
| Per-module access matrix with role ceilings and custom role overlays | `graph/access_logic.go`, `access_enforce.go`, `MyAccess` query | Drives the mobile nav, same as web |
| Industry scoping (education / healthcare / corporate / nonprofit) | `models/access_industries.go`, `lib/access.ts` | Decides which role screens exist per tenant |
| Terminology bundles | `models/terminology_defaults.go`, `constants/terminology/` | Mobile must never hardcode "Student"/"Teacher" either |
| Multi-workspace switching | `handlers/workspaces.go`, `graph/workspaces.resolvers.go`, `MyWorkspaces` | Powers an in-app role switcher |
| Identity modes (email vs Employee ID vs Roll Number) | `docs/product/identity-modes.md` | Login form adapts, same three-step resolver |
| Patient portal resolvers | `graph/patient_portal.resolvers.go` | Whole patient role is already served |
| Clinician calendar | `graph/my_schedule.resolvers.go` | Whole clinician "today" screen is already served |
| Nursing, triage, IPD, lab, appointments resolvers | `graph/nursing|triage|ipd|lab|appointments.resolvers.go` | Backing for the ward and desk roles |
| Signed QR / Code-128 payloads | `backend/qrcode/` (HMAC in `payload.go`) | Mobile camera scanning, wristband and sample label lookup |
| Notifications | `handlers/notifications.go` (REST) | In-app inbox; needs a push layer, see gap 3 |

**The important conclusion: v1 needs very few new resolvers.** The bulk of the
work is client side plus four platform gaps below.

---

## 2. Platform prerequisites: done

An earlier draft of this section listed five gaps. Three of them were wrong:
refresh tokens and the notification GraphQL surface already existed, and login
already echoed the access token in its body. What was actually missing is now
built. Phase 0 is complete.

### Session transport for native clients (done)

Login already returned the access token in the response body, but the refresh
token was cookie-only, so a native client could authenticate once and then had
no way to stay signed in.

A client now identifies itself with `X-Client: mobile` (also `native` or `api`)
and receives `refresh_token` and `refresh_expires_in` alongside the access
token, on both login and refresh. The header is the trigger rather than the
User-Agent because a browser cannot set it cross-origin without CORS approval,
so a browser session can never be talked into exposing its refresh token to
JavaScript.

Rotation made one detail load-bearing: `/auth/refresh` had to return the *new*
refresh token to body-token clients. Without that, a native client's second
refresh would replay a spent token, trip the reuse detector, and revoke the very
session it was renewing.

`presentedRefreshToken` now accepts the token from the cookie, an
`X-Refresh-Token` header, or the JSON body, in that order, so refresh and logout
both work without a cookie jar.

Files: `backend/handlers/session.go`, `auth.go`, `workspaces.go`,
`super_admin.go`.

### Push notifications (done)

There was no device-token storage and no delivery path. Now:

- `models.DeviceToken` — one row per app install, keyed on the push token
  because the token *is* the device identity. Registering a token that already
  exists reassigns it to the new user, which is what stops a shared ward tablet
  from delivering the previous nurse's alerts to the next one.
- `push.Client` — Expo push delivery, chunked to the service's 100-message
  limit. The service answers HTTP 200 with per-message errors, so the response
  body is parsed properly; `DeviceNotRegistered` tokens come back to the caller
  and are disabled, which is the only mechanism that keeps the table from
  filling with dead tokens.
- `push.NotifyRecord` — the single entry point. Delivery runs on its own
  goroutine and errors are logged, never returned: the notification row is the
  durable record and the push is a courtesy copy, so a push outage must not fail
  the mutation that triggered it.
- Lock-screen redaction. Notification bodies here can name a patient or a
  result, and a push renders on a locked phone in a public corridor, so only a
  short summary and a deep link are sent. The full text is read in the app,
  behind auth.
- GraphQL: `registerDeviceToken`, `revokeDeviceToken`, `myDeviceTokens`. All
  self-service and scoped to the caller, so deliberately absent from `opAccess`
  like the other `my*` operations. The push token itself is never returned by
  the API: it is a delivery credential, and the device list has no use for it.
- Cleanup: tokens are disabled on password change (they follow the revoked
  sessions) and deleted with the user account.

Off by default. Set `PUSH_ENABLED=true` and, if the Expo account has push
security on, `EXPO_ACCESS_TOKEN`. With it unset, `push.NewClient()` returns nil
and delivery is skipped silently, so no dev environment can page a real phone.

Files: `backend/models/device_token.go`, `backend/push/`,
`backend/graph/device_tokens.resolvers.go`, plus fan-out at the three
notification creation sites.

### GraphQL codegen (done)

`frontend/codegen.ts` generates `frontend/types/graphql.ts` from
`backend/graph/schema.graphqls` and every document under `graphql/`. Schema is
read from the repo, not by introspecting a running server, so generation works
in CI and the mobile client can consume the same committed types without a Go
toolchain.

- `npm run gen:graphql` regenerates.
- `npm run gen:graphql:check` fails on stale output. Wire this into CI.

Run `pnpm install` first: the three `@graphql-codegen/*` devDependencies are in
`package.json` but not yet installed (this repo uses pnpm).

### Three real bugs codegen surfaced

Validating every document against the schema found problems that were invisible
before, because Apollo never checks a document against the schema client-side:

1. **`upsertCalendarDay` selected `weekday` on `Holiday`.** That field belongs
   to `CalendarDay`; `Holiday` has never had it. The server rejects the whole
   operation at validation, so this mutation could not have worked. The caller
   in `calendarSlice.ts` discards the result, so the fix was to select fields
   that exist.
2. **Two different `ListCourses` queries.** `academic.ts` (plain list) and
   `students.ts` (with batches) shared one operation name. Renamed the second to
   `ListCoursesWithBatches`; the exported constant is unchanged, so no import
   site moved.
3. **`GetAttendanceSettings` defined twice**, identically, in `attendance.ts`
   and `calendar.ts`. `calendar.ts` now re-exports the one definition.

Name collisions like 2 and 3 are tolerated by Apollo today but break persisted
queries and server-side operation allowlisting, both of which are worth having
once a mobile client is in the field.

### Still open, and not blocking

- **Session listing and remote sign-out.** `RefreshToken` records `UserAgent`
  and `IP` per session, and `DeviceToken` now lists installs, but there is no
  "your active sessions" screen or admin-side remote revoke. Worth having before
  a clinical app is on personal phones.
- **Account deactivation does not revoke sessions.** `deactivateUser` marks the
  user inactive but leaves refresh tokens live. `middleware.Authenticate`
  catches it on the next access token, so the window is one access-token
  lifetime rather than indefinite, but it should call `RevokeUserSessions` and
  `DisableUserDeviceTokens` outright. Pre-existing, unrelated to mobile.
- **`backend/` and `frontend/` are not versioned by this repo.** Both are
  recorded in git as gitlinks (mode 160000) with no `.gitmodules` and no `.git`
  directory of their own, so `git status` at the root reports nothing when their
  files change. Everything described here is therefore unversioned on disk. This
  should be fixed before any further work lands.

## 3. Role model on mobile

Mobile is not a smaller web app. Each role gets a purpose-built home screen, and
everything else is reachable but secondary.

### Healthcare v1 roles

| Role (stored id) | Terminology label | Mobile home screen | Light actions in v1 |
|---|---|---|---|
| `patient` | Patient | My Health: next appointment, active prescriptions, lab and radiology results, referrals, tele-consult join | Book / cancel appointment, join tele-consult |
| `teacher` (clinician) | Clinician | My Day: `myClinicianCalendar`, patient queue, today's OT list | Start / close encounter, record vitals, order lab, mark no-show |
| `staff` (nurse) | Nurse / Support | My Ward: assigned admissions, due medication rounds, vitals due | `recordVitals`, `recordMedicationAdministration`, triage acuity update |
| `staff` (front desk) | Support | Desk: today's appointments, walk-in registration, pending bills | Register patient, check in, take payment, print / share OPD slip |
| `admin` | Admin | Ops: census, bed occupancy, revenue today, approvals inbox | Approve or reject requests, publish a notice |

Note that nurse and front desk are the **same stored role** (`staff`). Do not
invent new role ids. Differentiate them from the custom role overlay
(`CustomRole` / `AccessRule`) plus `MyAccess`, which already returns per-module
view/create/edit/delete flags. The mobile home screen is chosen by a small
resolver function over `MyAccess`, not by a hardcoded role switch.

### Role resolution order on the client

1. Read `/auth/me` for `role`, `baseRole`, `tenantId`, `tenantType`.
2. Read `MyAccess` for the effective module flags.
3. Read `terminology` for the label bundle.
4. Pick the home screen persona from (tenantType, activeRole, access flags).
5. Build the nav from modules where `canView` is true, filtered to the modules
   that have a mobile screen. Anything without one is not shown at all, rather
   than shown and dead.

### Workspace switching

`MyWorkspaces` plus `POST /auth/workspace` already exist. On mobile this is an
avatar-menu switcher that re-mints the token and resets the Apollo store. A
person who is both a clinician and a department admin switches without logging
out. This must be built in v1, not retrofitted, because it changes how the
navigator root is mounted.

---

## 4. Proposed app architecture

React Native with **Expo (managed workflow, dev client)**. Justification: OTA
updates matter for a product that ships to hospitals, `expo-secure-store`,
`expo-notifications`, `expo-camera` and `expo-local-authentication` cover the
whole native surface v1 needs, and EAS Build removes the Xcode/Gradle burden.
Eject later only if a native SDK forces it.

```
mobile/
  app/                       # expo-router, file based
    (auth)/                  # login, tenant lookup, biometric unlock
    (patient)/               # patient tab navigator
    (clinician)/
    (nurse)/
    (desk)/
    (admin)/
    _layout.tsx              # picks the role group at mount
  src/
    api/
      client.ts              # Apollo client, auth link, error link
      auth.ts                # login, refresh, workspace switch
      cache.ts               # apollo3-cache-persist config
    auth/
      session.tsx            # session context, secure token storage
      useSession.ts
    access/
      useAccess.ts           # MyAccess flags, mirrors frontend/lib/useAccess.ts
      moduleRegistry.ts      # module id -> mobile route, mirrors BASE_MODULES
      persona.ts             # (tenantType, role, access) -> home screen
    terminology/
      useTerminology.ts      # mirrors frontend/constants/terminology
    features/
      patient/               # one folder per role feature, screens + hooks
      clinician/
      nursing/
      desk/
      admin/
      notifications/
      scanner/               # QR / Code-128 camera, verifies HMAC payload
    ui/                      # design system primitives
    lib/
```

Keep every file small and single-purpose: one screen per file, hooks separated
from presentation, GraphQL documents in colocated `.graphql` files fed through
codegen. No file should mix data fetching, business rules and layout.

### Key technical choices

- **Data**: Apollo Client, same as web. `apollo3-cache-persist` over AsyncStorage
  gives the cached-reads offline behaviour with almost no custom code.
  `fetchPolicy: cache-and-network` on list screens.
- **Auth transport**: `Authorization: Bearer` header from an Apollo auth link
  that reads the in-memory token, with a queued refresh on `UNAUTHORIZED`.
- **Navigation**: `expo-router`, one route group per persona, mounted by
  `persona.ts`. Switching workspace remounts the group.
- **State**: React Query is not needed; Apollo cache plus a small session
  context is enough. No Redux (the web app's Redux slices do not need porting).
- **Design system**: rebuild the primitives natively rather than porting the
  Tailwind components. Share tokens (colors, spacing, type scale) as a JSON
  package so web and mobile stay visually consistent.
- **Sensitive data**: healthcare tenants mean the cache holds PHI. Encrypt the
  persisted cache, require biometric unlock on resume, purge cache on logout and
  on workspace switch, and disable screenshots on clinical screens where the
  platform allows.

---

## 5. Phasing

**Phase 0: platform prerequisites (backend). DONE** — see section 2. Native
session transport, device tokens and push delivery, and GraphQL codegen are all
in place; `go build`, `go vet` and `go test ./...` pass.

**Phase 1: shell.** Expo app, tenant lookup, login for all three identity modes,
secure token storage, refresh, session context, `MyAccess` and terminology
wiring, persona routing, workspace switcher, notification inbox, profile. No
clinical features yet. This is the skeleton everything else hangs on.

**Phase 2: patient role.** Entirely served by existing resolvers, so it proves
the shell end to end at low risk and is the role with the largest user count.
Book and cancel appointment, tele-consult join.

**Phase 3: clinician and nurse.** My Day, patient queue, vitals, medication
administration, triage acuity. The highest value screens and the ones with real
write paths, so they come after the shell is proven.

**Phase 4: desk and admin.** Registration, check-in, payment capture, OPD slip
share, approvals inbox, ops summary. QR scanner lands here.

**Phase 5: hardening.** Push fan-out tuning, biometric lock, cache encryption
audit, accessibility pass, EAS release channels, store submission.

Education roles (student, teacher, parent) reuse the entire shell from Phase 1
and become Phase 6 and beyond. Building the persona layer generically in Phase 1
is what makes that a feature addition rather than a second app.

---

## 6. Things to decide before Phase 1 starts

1. **Parent role.** Education phases will want one, and there is no `parent` role
   id today. Deciding now whether it is a new stored role or a `patient`-style
   linked-account pattern avoids a migration later.
2. **Tenant discovery on mobile.** Web uses a subdomain in the URL. Mobile needs
   either an org-code entry screen or a deep link. Org code is simpler and works
   offline-first; it needs `/api/v1/tenants/lookup/:subdomain` to accept a short
   code too.
3. **Subscription gating.** `models/subscription_modules.go` gates modules per
   tenant plan. Confirm whether mobile access is included in existing plans or
   is its own SKU, because it changes what `MyAccess` should return.
4. **Compliance.** `docs/compliance/` covers DPDP, GDPR and HIPAA for the web
   product. A mobile client holding a cached PHI store on a personal device is a
   new surface for all three and needs its own review before Phase 3.
5. **Tele-consult video.** `telemedicine.resolvers.go` exists; confirm which
   provider backs it and whether that provider has a React Native SDK, since it
   is the one thing that could force ejecting from managed Expo.
