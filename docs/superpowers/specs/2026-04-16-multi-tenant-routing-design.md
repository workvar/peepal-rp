# Multi-Tenant Path-Based Routing — Design Spec

**Date:** 2026-04-16  
**Status:** Approved  

---

## Overview

StepElly is a multi-tenant ERP platform. Currently all org users share a single `/login` page and flat routes like `/dashboard`, `/students`. This spec introduces per-org URL namespacing so each organisation lives under its own path prefix (`/[tenant]/...`), giving clear data and route isolation at the browser level. Backend data isolation via `X-Tenant-ID` header is already implemented and unchanged.

---

## URL Structure

| Actor | Login URL | App URL |
|---|---|---|
| Super admin | `/super/login` | `/super/dashboard`, `/super/tenants`, ... (unchanged) |
| Org user (direct link) | `/[tenant]/login` | `/[tenant]/dashboard`, `/[tenant]/students`, ... |
| Org user (generic) | `/login` (+ org name field) | redirects to `/[tenant]/dashboard` after auth |

`[tenant]` is the org's **subdomain** slug stored in the `tenants` table (e.g. `acme` → `/acme/login`).

---

## Backend Changes

### New public endpoint

```
GET /api/v1/tenants/lookup/:subdomain
```

- **Auth:** none (public)
- **Response 200:**
  ```json
  { "id": "uuid", "name": "Acme College", "subdomain": "acme", "status": "active" }
  ```
- **Response 404:** subdomain not found
- **Response 403:** tenant exists but is suspended

Used by all login pages to resolve a slug to a tenant ID before calling `/auth/login`.

No other backend changes are required.

---

## Frontend Changes

### Directory restructure

```
app/
  super/
    login/
      page.tsx                  ← NEW: super admin login
  [tenant]/
    login/
      page.tsx                  ← NEW: tenant login (org pre-filled from URL)
    (dashboard)/
      layout.tsx                ← MOVED from app/(dashboard)/layout.tsx
      dashboard/page.tsx        ← MOVED
      students/page.tsx         ← MOVED
      employees/page.tsx        ← MOVED
      ... (all existing dashboard pages moved here)
  login/
    page.tsx                    ← UPDATED: adds org name field
  (super-admin)/                ← UNCHANGED
    layout.tsx
    super/...
  layout.tsx                    ← UNCHANGED
  page.tsx                      ← UNCHANGED
```

### `localStorage` keys (additions)

| Key | Value |
|---|---|
| `token` | JWT (existing) |
| `tenantId` | UUID (existing) |
| `tenantSlug` | subdomain string (new) |

---

## Auth Flows

### `/[tenant]/login`

1. Page load: call `GET /tenants/lookup/[tenant]`
   - If 404 → show "Organisation not found" error, block form
   - If 403 → show "Organisation suspended" error, block form
   - If 200 → store `resolvedTenantId` in component state, show form
2. User submits email + password
3. `POST /auth/login` with `{ email, password }`
4. Validate `response.user.tenant_id === resolvedTenantId` (prevents cross-tenant token acceptance)
5. On success: store `token`, `tenantId`, `tenantSlug` in localStorage
6. Redirect to `/[tenant]/dashboard`

### `/login` (generic)

1. User fills: **Org identifier** (subdomain slug, e.g. `acme`) + email + password. Field is labelled "Organisation" with placeholder "your-org-name".
2. On submit:
   a. `GET /tenants/lookup/:orgName` — resolve org (show inline error if not found/suspended)
   b. `POST /auth/login`
   c. Same validation and storage as above
3. Redirect to `/[resolvedSlug]/dashboard`

### `/super/login`

1. User fills email + password only (no org field)
2. `POST /auth/login`
3. Validate `response.user.role === "super_admin"` (show error if not super admin)
4. Redirect to `/super/dashboard`

---

## Dashboard Layout (`[tenant]/(dashboard)/layout.tsx`)

On mount:
1. Read `params.tenant` from URL
2. Read `tenantSlug` from localStorage
3. If `tenantSlug !== params.tenant` → redirect to `/${tenantSlug}/dashboard` (user is in the wrong org URL)
4. If no token → redirect to `/[tenant]/login`
5. If `user.role === "super_admin"` → redirect to `/super/dashboard`
6. Otherwise render children as before

---

## Super Admin Layout (`(super-admin)/layout.tsx`)

Unchanged. Already validates `role === "super_admin"`.

---

## Redirect Helpers

- `app/page.tsx` (root `/`): if token + tenantSlug in localStorage → redirect to `/${tenantSlug}/dashboard`; else → `/login`
- `app/login/page.tsx`: if user is already logged in as super admin → `/super/dashboard`; if already logged in as org user → `/${tenantSlug}/dashboard`

---

## Error States

| Scenario | Behaviour |
|---|---|
| `/unknown-org/login` | "Organisation not found" banner, form disabled |
| `/suspended-org/login` | "Organisation suspended" banner, form disabled |
| User hits `/${wrongOrg}/dashboard` | Redirected to `/${correctOrg}/dashboard` |
| Super admin hits `/[tenant]/...` | Redirected to `/super/dashboard` |
| Org user hits `/super/login` | After login attempt, "Access denied" error shown |

---

## Out of Scope

- Subdomain-based routing (e.g. `acme.roserp.workvar.com`) — path-based only
- Org-specific branding on login page (future)
- The `[tenant]` segment is purely frontend routing; all data isolation is already handled server-side via `X-Tenant-ID`
