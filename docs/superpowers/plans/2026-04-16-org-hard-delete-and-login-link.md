# Org Hard Delete & Login Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent hard-delete action (password-confirmed) and a tenant login page shortcut to the super admin Tenant Management UI.

**Architecture:** The hard delete adds a new `DELETE /api/v1/super/tenants/:id` backend endpoint that verifies the superadmin's password, then wipes all tenant data in a single GORM transaction (30+ model tables). The frontend adds a confirmation modal with password input in the existing details panel, plus a `LogIn` icon button in each table row that opens `/<subdomain>/login` in a new tab. No new files are created — all changes are additive edits to existing files.

**Tech Stack:** Go + Fiber + GORM (backend), Next.js 14 + Redux Toolkit + Axios (frontend), lucide-react icons, react-hot-toast

---

## File Map

| File | Change |
|------|--------|
| `backend/handlers/super_admin.go` | Add `HardDeleteTenantRequest` struct + `HardDeleteTenant` handler |
| `backend/routes/routes.go` | Add `DELETE /super/tenants/:id` route |
| `frontend/lib/api.ts` | Add `deleteTenant` method to `superAdminAPI` |
| `frontend/store/slices/tenantSlice.ts` | Add `hardDeleteTenant` thunk + 3 reducer cases |
| `frontend/app/(super-admin)/super/tenants/page.tsx` | Add login link button, delete button, delete confirmation modal |

---

## Task 1: Backend — HardDeleteTenant Handler

**Files:**
- Modify: `backend/handlers/super_admin.go`

### Context

The existing response utilities are `utils.OK`, `utils.BadRequest`, `utils.Unauthorized`, `utils.NotFound`, `utils.InternalError`. The password helper is `utils.CheckPassword(plain, hash string) bool`. The caller's user ID is retrieved with `middleware.UserID(c)`. The platform tenant guard constant is `models.PlatformTenantID`.

- [ ] **Step 1: Add the request struct and handler to `super_admin.go`**

Append the following to the bottom of `backend/handlers/super_admin.go` (after `LookupTenant`):

```go
// HardDeleteTenantRequest is the request body for HardDeleteTenant.
type HardDeleteTenantRequest struct {
	Password string `json:"password"`
}

// HardDeleteTenant permanently deletes a tenant and all associated data (super admin only).
// The caller must supply their current password for confirmation.
func HardDeleteTenant(c *fiber.Ctx) error {
	id := c.Params("id")

	var req HardDeleteTenantRequest
	if err := c.BodyParser(&req); err != nil || req.Password == "" {
		return utils.BadRequest(c, "Password is required")
	}

	// Verify caller's password.
	callerID := middleware.UserID(c)
	var caller models.User
	if err := database.DB.First(&caller, "id = ?", callerID).Error; err != nil {
		return utils.NotFound(c, "Caller not found")
	}
	if !utils.CheckPassword(req.Password, caller.Password) {
		return utils.Unauthorized(c, "Incorrect password")
	}

	// Guard: never delete the platform tenant.
	if id == models.PlatformTenantID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Cannot delete platform tenant"})
	}

	// Confirm tenant exists.
	var tenant models.Tenant
	if err := database.DB.First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	// Hard delete everything in a single transaction.
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		tables := []interface{}{
			&models.Mark{},
			&models.Attendance{},
			&models.AttendanceSettings{},
			&models.Holiday{},
			&models.FeeDue{},
			&models.FeePayment{},
			&models.FeeStructure{},
			&models.FeeCategory{},
			&models.PayrollDeduction{},
			&models.Payroll{},
			&models.SalaryStructure{},
			&models.Leave{},
			&models.LeaveBalance{},
			&models.LeaveTypeConfig{},
			&models.LibraryIssue{},
			&models.LibraryBook{},
			&models.HostelAllocation{},
			&models.HostelRoom{},
			&models.HostelBlock{},
			&models.TransportAllocation{},
			&models.TransportVehicle{},
			&models.TransportRoute{},
			&models.TimetableSlot{},
			&models.Event{},
			&models.Announcement{},
			&models.Notification{},
			&models.ExamSchedule{},
			&models.Student{},
			&models.Course{},
			&models.Subject{},
			&models.Semester{},
			&models.AcademicYear{},
			&models.User{},
			&models.CustomRole{},
			&models.OrgProfile{},
			&models.TenantSubscription{},
		}
		for _, model := range tables {
			if err := tx.Where("tenant_id = ?", id).Delete(model).Error; err != nil {
				return err
			}
		}
		// Delete the tenant record itself last.
		return tx.Delete(&models.Tenant{}, "id = ?", id).Error
	})

	if err != nil {
		return utils.InternalError(c, "Failed to delete tenant")
	}

	return utils.OK(c, nil, "Tenant permanently deleted")
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

Expected: no output (clean build). If a model name doesn't exist (e.g. `models.FeeDue` not exported), check `backend/models/fee.go` and use the correct struct name.

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/handlers/super_admin.go
git commit -m "feat(backend): add HardDeleteTenant handler with password verification"
```

---

## Task 2: Backend — Register the Route

**Files:**
- Modify: `backend/routes/routes.go`

- [ ] **Step 1: Add the DELETE route to the super group**

In `backend/routes/routes.go`, find this block (around line 31-32):

```go
	super.Patch("/tenants/:id/status", handlers.UpdateTenantStatus)
	super.Post("/tenants/:id/impersonate", handlers.ImpersonateTenant)
```

Add one line after `ImpersonateTenant`:

```go
	super.Patch("/tenants/:id/status", handlers.UpdateTenantStatus)
	super.Post("/tenants/:id/impersonate", handlers.ImpersonateTenant)
	super.Delete("/tenants/:id", handlers.HardDeleteTenant)
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/routes/routes.go
git commit -m "feat(backend): register DELETE /super/tenants/:id route"
```

---

## Task 3: Frontend — API Method

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add `deleteTenant` to `superAdminAPI`**

In `frontend/lib/api.ts`, find the `superAdminAPI` object. Locate this line:

```ts
  impersonateTenant: (id: string) => api.post(`/super/tenants/${id}/impersonate`),
```

Add `deleteTenant` after it:

```ts
  impersonateTenant: (id: string) => api.post(`/super/tenants/${id}/impersonate`),
  deleteTenant: (id: string, password: string) =>
    api.delete(`/super/tenants/${id}`, { data: { password } }),
```

Note: axios DELETE requests pass a body via the `data` key inside the config object, not as the second argument.

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/lib/api.ts
git commit -m "feat(frontend): add deleteTenant API method"
```

---

## Task 4: Frontend — Redux Thunk

**Files:**
- Modify: `frontend/store/slices/tenantSlice.ts`

- [ ] **Step 1: Add the `hardDeleteTenant` async thunk**

In `frontend/store/slices/tenantSlice.ts`, add the following thunk after the `updateTenantStatus` thunk (before the `TenantState` interface, around line 60):

```ts
export const hardDeleteTenant = createAsyncThunk(
  "tenant/hardDelete",
  async ({ id, password }: { id: string; password: string }, { rejectWithValue }) => {
    try {
      await superAdminAPI.deleteTenant(id, password);
      return id;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to delete tenant");
    }
  }
);
```

- [ ] **Step 2: Add reducer cases in `extraReducers`**

In the same file, inside the `extraReducers` builder chain, append after the last `updateTenantStatus.rejected` case (before the closing `);`):

```ts
      // hardDeleteTenant
      .addCase(hardDeleteTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(hardDeleteTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = state.tenants.filter((t) => t.id !== action.payload);
        if (state.selected?.id === action.payload) {
          state.selected = null;
        }
      })
      .addCase(hardDeleteTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
```

Note: the `hardDeleteTenant.rejected` case replaces the existing trailing `;` on the `updateTenantStatus.rejected` chain — make sure the last `.addCase` before `hardDeleteTenant` ends with `.addCase(updateTenantStatus.rejected, ...)` without a semicolon, and the new block ends the chain.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/store/slices/tenantSlice.ts
git commit -m "feat(frontend): add hardDeleteTenant thunk and reducer cases"
```

---

## Task 5: Frontend — UI (Login Link + Delete Button + Confirmation Modal)

**Files:**
- Modify: `frontend/app/(super-admin)/super/tenants/page.tsx`

This task has three sub-changes: (A) login link button in table rows, (B) delete button in details panel footer, (C) the confirmation modal.

### 5A — Add `LogIn` to imports and state

- [ ] **Step 1: Update lucide-react import to include `LogIn` and `AlertTriangle`**

Find the existing import line:

```ts
import { Plus, Eye, Zap } from "lucide-react";
```

Replace with:

```ts
import { Plus, Eye, Zap, LogIn, AlertTriangle } from "lucide-react";
```

- [ ] **Step 2: Add delete modal state variables**

Find the existing state declarations (around line 33-35):

```ts
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
```

Add three new state variables after them:

```ts
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
```

- [ ] **Step 3: Add the `hardDeleteTenant` import to the Redux imports**

Find:

```ts
import {
  fetchTenants,
  createTenant,
  updateTenantStatus,
  selectTenant,
  clearTenantError,
} from "@/store/slices/tenantSlice";
```

Replace with:

```ts
import {
  fetchTenants,
  createTenant,
  updateTenantStatus,
  hardDeleteTenant,
  selectTenant,
  clearTenantError,
} from "@/store/slices/tenantSlice";
```

### 5B — Add `handleHardDelete` handler

- [ ] **Step 4: Add the handler function after `handleImpersonate`**

Find the closing of `handleImpersonate` (around line 104):

```ts
  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await superAdminAPI.impersonateTenant(tenantId);
      const { token } = res.data.data;
      localStorage.setItem("impersonation_token", token);
      localStorage.setItem("impersonation_tenant", tenantId);
      toast.success(`Impersonating ${selected?.name}`);
      // In a real app, you might redirect or update auth state
    } catch {
      toast.error("Failed to impersonate tenant");
    }
  };
```

Add after it:

```ts
  const handleHardDelete = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    const result = await dispatch(hardDeleteTenant({ id: selected.id, password: deletePassword }));
    setDeleteLoading(false);
    if (hardDeleteTenant.fulfilled.match(result)) {
      toast.success("Organization permanently deleted");
      setIsDeleteModalOpen(false);
      setIsDetailsPanelOpen(false);
      setDeletePassword("");
    } else {
      toast.error((result.payload as string) || "Failed to delete organization");
    }
  };
```

### 5C — Add login link button to table row actions

- [ ] **Step 5: Add the `LogIn` icon button in the table row actions cell**

Find the existing action buttons in the `<tbody>` rows (around line 181-196):

```tsx
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleViewDetails(tenant.id)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title={tenant.status === "active" ? "Suspend" : "Activate"}
                        >
                          <Zap size={18} className="text-yellow-600" />
                        </button>
                      </div>
```

Replace with:

```tsx
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleViewDetails(tenant.id)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title={tenant.status === "active" ? "Suspend" : "Activate"}
                        >
                          <Zap size={18} className="text-yellow-600" />
                        </button>
                        <button
                          onClick={() => window.open(`/${tenant.subdomain}/login`, "_blank")}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Go to Login Page"
                        >
                          <LogIn size={18} className="text-green-600" />
                        </button>
                      </div>
```

### 5D — Add delete button to details panel footer

- [ ] **Step 6: Add "Delete Organization" button in the details panel footer**

Find the details panel footer (around line 353-370):

```tsx
            {/* Footer Actions */}
            <div className="border-t p-6 space-y-2">
              <button
                onClick={() => handleStatusToggle(selected.id, selected.status)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  selected.status === "active"
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    : "bg-green-100 text-green-800 hover:bg-green-200"
                }`}
              >
                {selected.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
              </button>
              <button
                onClick={() => handleImpersonate(selected.id)}
                className="w-full py-2 px-4 rounded-lg font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                Impersonate
              </button>
            </div>
```

Replace with:

```tsx
            {/* Footer Actions */}
            <div className="border-t p-6 space-y-2">
              <button
                onClick={() => handleStatusToggle(selected.id, selected.status)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  selected.status === "active"
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    : "bg-green-100 text-green-800 hover:bg-green-200"
                }`}
              >
                {selected.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
              </button>
              <button
                onClick={() => handleImpersonate(selected.id)}
                className="w-full py-2 px-4 rounded-lg font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                Impersonate
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-2 px-4 rounded-lg font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
              >
                Delete Organization
              </button>
            </div>
```

### 5E — Add the confirmation modal

- [ ] **Step 7: Add the delete confirmation modal**

Find the closing `</div>` at the very end of the component return (after the `{/* Details Panel */}` closing tag and before the final `</div>`):

```tsx
    </div>
  );
}
```

Insert the delete confirmation `<Modal>` before the final `</div>`:

```tsx
      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Organization Permanently"
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePassword("");
        }}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-800">
              This will permanently delete <strong>{selected?.name}</strong> and all associated
              data — users, students, employees, and every ERP record. This cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletePassword("");
              }}
              className="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleHardDelete}
              disabled={deletePassword.trim() === "" || deleteLoading}
              className="flex-1 py-2 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteLoading ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 9: Verify Next.js build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` or `Route (app)` table with no errors.

- [ ] **Step 10: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/app/\(super-admin\)/super/tenants/page.tsx
git commit -m "feat(frontend): add org login link, hard-delete button, and password confirmation modal"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec sections covered — password in DELETE body (Task 1), platform tenant guard (Task 1), cascade deletion of all 30+ model tables (Task 1), route registration (Task 2), `deleteTenant` API method (Task 3), `hardDeleteTenant` thunk + reducer (Task 4), `LogIn` row button (Task 5C), delete footer button (Task 5D), confirmation modal with warning + password + disabled-until-filled button (Task 5E).
- [x] **Placeholder scan:** No TBDs. All code blocks are complete.
- [x] **Type consistency:** `hardDeleteTenant` is named consistently across Tasks 4 and 5. `deletePassword` and `deleteLoading` state names match between Steps 2, 4, 6, 7. `selected` (from existing Redux state) used correctly throughout.
- [x] **Model names verified:** All struct names (`Mark`, `Attendance`, `AttendanceSettings`, `Holiday`, `FeeDue`, `FeePayment`, `FeeStructure`, `FeeCategory`, `PayrollDeduction`, `Payroll`, `SalaryStructure`, `Leave`, `LeaveBalance`, `LeaveTypeConfig`, `LibraryIssue`, `LibraryBook`, `HostelAllocation`, `HostelRoom`, `HostelBlock`, `TransportAllocation`, `TransportVehicle`, `TransportRoute`, `TimetableSlot`, `Event`, `Announcement`, `Notification`, `ExamSchedule`, `Student`, `Course`, `Subject`, `Semester`, `AcademicYear`, `User`, `CustomRole`, `OrgProfile`, `TenantSubscription`) confirmed from `backend/models/*.go`.
- [x] **Deletion order:** `TenantSubscription` deleted before `Tenant` (FK dependency). Leaf data deleted before parent records within the tenant scope.
