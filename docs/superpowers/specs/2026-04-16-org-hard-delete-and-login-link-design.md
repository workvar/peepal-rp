# Org Hard Delete & Login Link — Design Spec
_Date: 2026-04-16_

## Overview

Two additions to the super admin Tenant Management page:

1. **Login Link** — a button in each table row that opens the org's tenant-scoped login page in a new tab.
2. **Hard Delete** — a "Delete Organization" button in the details panel footer that permanently wipes the tenant and all associated data after superadmin password re-confirmation.

---

## Feature 1: Login Link Button

### Placement
A `LogIn` icon button added to the actions column of each tenant row in the table, alongside the existing `Eye` (view details) and `Zap` (suspend/activate) buttons.

### Behaviour
- Calls `window.open(`/${tenant.subdomain}/login`, '_blank')` — opens in a new tab.
- No backend change required.
- Uses the `LogIn` icon from `lucide-react` (already a project dependency).

### UI
- Same styling as existing icon buttons: `p-1.5 hover:bg-gray-200 rounded transition-colors`
- Icon color: `text-green-600`
- Tooltip: `"Go to Login Page"`

---

## Feature 2: Hard Delete Org

### Backend

**New route** (added to the existing `super` group in `routes.go`, already auth-gated):
```
DELETE /api/v1/super/tenants/:id
```

**Request body:**
```json
{ "password": "superadmin_current_password" }
```

**Handler:** `HardDeleteTenant` in `backend/handlers/super_admin.go`

**Steps:**
1. Parse `{ password }` from request body — return `400` if missing.
2. Look up the requesting superadmin's User record by the `userID` in the JWT claims.
3. `bcrypt.CompareHashAndPassword(user.Password, password)` — return `401 Unauthorized` if mismatch.
4. Load the tenant by `:id` — return `404` if not found.
5. Guard: reject if `tenant.ID == models.PlatformTenantID` (never delete the platform tenant).
6. Run a GORM transaction (`db.Transaction(func(tx) error {...})`). Delete in this order to avoid FK violations:
   - `marks` (MarkRecord)
   - `attendance_records`, `attendance_settings`, `attendance_periods`
   - `fee_payments`, `fee_invoices`, `fee_categories`
   - `payroll_items`, `payroll_runs`, `payroll_structures`
   - `leave_requests`, `leave_balances`, `leave_types`
   - `library_issues`, `library_books`
   - `hostel_allocations`, `hostel_rooms`, `hostel_blocks`
   - `transport_assignments`, `transport_vehicles`, `transport_routes`
   - `timetable_periods`
   - `events`
   - `notifications`, `notification_settings`
   - `students`, `courses`
   - `employees`, `departments`
   - `exams`, `subjects`, `academic_years`, `semesters`
   - `users` (all users where `tenant_id = id`)
   - `custom_roles`, `org_profiles`
   - `subscriptions` (has FK → tenants, must precede tenant deletion)
   - `tenants` (the tenant record itself)
7. Return `200 { "message": "Tenant permanently deleted" }` on success.

**Error responses:**
- `400` — password missing
- `401` — password incorrect
- `403` — attempt to delete platform tenant
- `404` — tenant not found
- `500` — transaction failure

---

### Frontend — API Layer (`frontend/lib/api.ts`)

Add to `superAdminAPI`:
```ts
deleteTenant: (id: string, password: string) =>
  api.delete(`/super/tenants/${id}`, { data: { password } }),
```

---

### Frontend — Redux (`tenantSlice`)

New async thunk:
```ts
hardDeleteTenant = createAsyncThunk(
  'tenant/hardDelete',
  async ({ id, password }: { id: string; password: string }, { rejectWithValue }) => {
    const res = await superAdminAPI.deleteTenant(id, password);
    return id; // return deleted id to remove from state
  }
)
```

In `extraReducers`:
- `pending` → set `loading: true`
- `fulfilled` → remove tenant from `tenants` array, clear `selected`, set `loading: false`
- `rejected` → set `error` from payload, set `loading: false`

---

### Frontend — UI (`tenants/page.tsx`)

**New state:**
```ts
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [deletePassword, setDeletePassword] = useState("");
const [deleteLoading, setDeleteLoading] = useState(false);
```

**New handler `handleHardDelete`:**
1. Set `deleteLoading: true`.
2. Dispatch `hardDeleteTenant({ id: selected.id, password: deletePassword })`.
3. On `fulfilled`: `toast.success("Organization permanently deleted")`, close both modal and details panel, clear password state.
4. On `rejected`: `toast.error(error)` (wrong password etc.), keep modal open.
5. Set `deleteLoading: false`.

**Delete confirmation modal** (new `<Modal>` instance, `size="sm"`):
- Red warning icon (`AlertTriangle` from lucide-react) + bold title "Delete Organization Permanently"
- Paragraph: "This will permanently delete **{selected?.name}** and all associated data — users, students, employees, and every ERP record. This cannot be undone."
- Password input: `type="password"`, placeholder "Enter your password to confirm", controlled via `deletePassword` state
- Two buttons:
  - "Cancel" — closes modal, clears password
  - "Delete Permanently" — red, disabled when `deletePassword` is empty or `deleteLoading` is true

**Details panel footer** — add below the Impersonate button:
```tsx
<button
  onClick={() => setIsDeleteModalOpen(true)}
  className="w-full py-2 px-4 rounded-lg font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
>
  Delete Organization
</button>
```

---

## What is NOT changed

- The existing suspend/activate and impersonate flows are untouched.
- The `tenantSlice` pagination/filter state is untouched.
- No changes to any tenant-scoped (non-super-admin) routes.

---

## Security notes

- Password verification is done server-side against bcrypt — no plaintext comparison.
- The platform tenant (`PlatformTenantID`) is guard-rejected before any deletion attempt.
- The `DELETE` endpoint is inside the `super` middleware group (`Authenticate` + `RequireSuperAdmin`) — unauthenticated calls never reach the handler.
- Deletion runs in a single transaction — partial deletes are impossible; a mid-flight error rolls back cleanly.
