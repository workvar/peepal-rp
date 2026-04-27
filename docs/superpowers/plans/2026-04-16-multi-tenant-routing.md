# Multi-Tenant Path-Based Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-org URL namespacing (`/[tenant]/dashboard`, `/[tenant]/login`) with a generic `/login` (org field), a dedicated `/super/login`, and update all navigation to be tenant-aware.

**Architecture:** A Next.js dynamic `[tenant]` segment wraps all org dashboard routes. A public backend endpoint resolves subdomain slug → tenant ID. `tenantSlug` is stored in Redux auth state (persisted in localStorage) and used throughout navigation components to build tenant-prefixed hrefs.

**Tech Stack:** Go/Fiber (backend), Next.js 13+ App Router, Redux Toolkit, TypeScript, axios

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/handlers/super_admin.go` |
| Modify | `backend/routes/routes.go` |
| Modify | `frontend/types/index.ts` |
| Modify | `frontend/store/slices/authSlice.ts` |
| Modify | `frontend/lib/api.ts` |
| Modify | `frontend/lib/moduleConfig.ts` |
| Modify | `frontend/components/layout/TopBar.tsx` |
| Modify | `frontend/components/layout/ModuleSwitcher.tsx` |
| Create | `frontend/app/super/login/page.tsx` |
| Modify | `frontend/app/(super-admin)/layout.tsx` |
| Modify | `frontend/app/login/page.tsx` |
| Move   | `frontend/app/(dashboard)/` → `frontend/app/[tenant]/(dashboard)/` |
| Modify | `frontend/app/[tenant]/(dashboard)/layout.tsx` |
| Create | `frontend/app/[tenant]/login/page.tsx` |
| Modify | `frontend/app/page.tsx` |

---

### Task 1: Backend — Public tenant lookup endpoint

**Files:**
- Modify: `backend/handlers/super_admin.go`
- Modify: `backend/routes/routes.go`

- [ ] **Step 1: Add LookupTenant handler to super_admin.go**

Add this function at the bottom of `backend/handlers/super_admin.go`:

```go
// LookupTenant is a public endpoint that resolves a subdomain slug to tenant
// info. Used by login pages to validate the org before authenticating.
func LookupTenant(c *fiber.Ctx) error {
	subdomain := c.Params("subdomain")

	var tenant models.Tenant
	if err := database.DB.Where("subdomain = ?", subdomain).First(&tenant).Error; err != nil {
		return utils.NotFound(c, "Organisation not found")
	}

	if tenant.Status == models.TenantSuspended {
		return utils.Forbidden(c, "Organisation is suspended")
	}

	return utils.OK(c, fiber.Map{
		"id":        tenant.ID,
		"name":      tenant.Name,
		"subdomain": tenant.Subdomain,
		"status":    tenant.Status,
	}, "")
}
```

- [ ] **Step 2: Register the route in routes.go**

In `backend/routes/routes.go`, add this line immediately after `api := app.Group("/api/v1")`:

```go
// Public tenant lookup — no auth required
api.Get("/tenants/lookup/:subdomain", handlers.LookupTenant)
```

- [ ] **Step 3: Restart the backend and verify**

```bash
cd backend && go run main.go
```

Then test (replace `acme` with a real subdomain from your DB):

```bash
curl https://api.roserp.workvar.com/api/v1/tenants/lookup/acme
# Expected: {"success":true,"data":{"id":"...","name":"...","subdomain":"acme","status":"active"}}

curl https://api.roserp.workvar.com/api/v1/tenants/lookup/doesnotexist
# Expected: {"success":false,"error":"Organisation not found"} with HTTP 404
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add handlers/super_admin.go routes/routes.go
git commit -m "feat: add public tenant lookup endpoint GET /tenants/lookup/:subdomain"
```

---

### Task 2: Frontend types — Add tenantSlug to AuthState

**Files:**
- Modify: `frontend/types/index.ts`

- [ ] **Step 1: Add tenantSlug to AuthState**

In `frontend/types/index.ts`, update `AuthState`:

```typescript
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  tenantSlug: string | null;   // ← add this line
  loading: boolean;
  error: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add types/index.ts
git commit -m "feat: add tenantSlug to AuthState type"
```

---

### Task 3: Frontend authSlice — tenantSlug state + setTenantSlug action

**Files:**
- Modify: `frontend/store/slices/authSlice.ts`

- [ ] **Step 1: Replace authSlice.ts with the updated version**

```typescript
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "@/lib/api";
import type { AuthState, AuthUser } from "@/types";

// ── Async thunks ──────────────────────────────────────────────

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login(email, password);
      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", user.tenant_id || "");
      return { token, user } as { token: string; user: AuthUser };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  }
);

export const fetchMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.me();
    return res.data.data as AuthUser;
  } catch {
    return rejectWithValue("Session expired");
  }
});

// ── Slice ─────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  tenantSlug: typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.tenantSlug = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("tenantId");
        localStorage.removeItem("tenantSlug");
        localStorage.removeItem("impersonation_token");
        localStorage.removeItem("impersonation_tenant");
      }
    },
    clearError(state) {
      state.error = null;
    },
    setTenantSlug(state, action: { payload: string }) {
      state.tenantSlug = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("tenantSlug", action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchMe
      .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(fetchMe.rejected, (state) => { state.user = null; state.token = null; });
  },
});

export const { logout, clearError, setTenantSlug } = authSlice.actions;
export default authSlice.reducer;
```

- [ ] **Step 2: Commit**

```bash
git add store/slices/authSlice.ts
git commit -m "feat: add tenantSlug to auth state with setTenantSlug action"
```

---

### Task 4: Frontend api.ts — Add tenant lookup API

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add tenantLookupAPI at the top of the auth section**

After the `authAPI` export block in `frontend/lib/api.ts`, add:

```typescript
// ── Tenant Lookup (public) ─────────────────────────────────
export const tenantLookupAPI = {
  lookup: (subdomain: string) => api.get(`/tenants/lookup/${subdomain}`),
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/api.ts
git commit -m "feat: add tenantLookupAPI for public subdomain resolution"
```

---

### Task 5: moduleConfig — Tenant-aware hrefs

**Files:**
- Modify: `frontend/lib/moduleConfig.ts`

- [ ] **Step 1: Replace moduleConfig.ts with tenant-aware version**

The `modules` array keeps relative hrefs (e.g. `/users`). A new `getModules(tenantSlug)` function prefixes them. `getModuleName` strips the tenant prefix before lookup.

```typescript
/**
 * moduleConfig.ts
 * Central definition of all ERP modules — used by GridMenu and ModuleSwitcher.
 * Each module entry drives both the grid cards and the expandable switcher.
 */

import type { LucideIcon } from "lucide-react";
import {
  Users, UserCog, GraduationCap, CalendarCheck,
  BookOpen, FileText, DollarSign, CreditCard, BarChart2,
  Calendar, Hotel, Bus, Megaphone, Building, Award,
  ClipboardList, LayoutGrid, User, PieChart,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  href: string;         // tenant-prefixed at runtime via getModules()
  baseHref: string;     // relative path e.g. /students
  icon: LucideIcon;
  gradient: string;
  shadow: string;
  roles: string[];
}

// Base module definitions — hrefs are relative (no tenant prefix).
const BASE_MODULES: Omit<ModuleDef, "href">[] = [
  { id: "users",         label: "Users",         description: "Manage system users & access",           baseHref: "/users",             icon: Users,         gradient: "linear-gradient(135deg, #7c3aed, #4f46e5)", shadow: "0 8px 24px rgba(124,58,237,0.35)", roles: ["admin"] },
  { id: "employees",     label: "Employees",     description: "Staff profiles & departments",           baseHref: "/employees",         icon: UserCog,       gradient: "linear-gradient(135deg, #db2777, #9333ea)", shadow: "0 8px 24px rgba(219,39,119,0.35)", roles: ["admin", "staff"] },
  { id: "students",      label: "Students",      description: "Enrollment & student records",          baseHref: "/students",          icon: GraduationCap, gradient: "linear-gradient(135deg, #0891b2, #06b6d4)", shadow: "0 8px 24px rgba(8,145,178,0.35)",   roles: ["admin", "teacher", "student"] },
  { id: "attendance",    label: "Attendance",    description: "Mark & track attendance",               baseHref: "/attendance",        icon: CalendarCheck, gradient: "linear-gradient(135deg, #059669, #10b981)", shadow: "0 8px 24px rgba(5,150,105,0.35)",   roles: ["admin", "teacher", "staff", "student"] },
  { id: "marks",         label: "Marks",         description: "Grade entry & marksheets",              baseHref: "/marks",             icon: BookOpen,      gradient: "linear-gradient(135deg, #d97706, #f59e0b)", shadow: "0 8px 24px rgba(217,119,6,0.35)",   roles: ["admin", "teacher", "student"] },
  { id: "results",       label: "Results",       description: "Exam results & transcripts",            baseHref: "/results",           icon: Award,         gradient: "linear-gradient(135deg, #7c3aed, #06b6d4)", shadow: "0 8px 24px rgba(124,58,237,0.30)", roles: ["admin", "teacher", "student"] },
  { id: "leaves",        label: "Leaves",        description: "Leave requests & approvals",            baseHref: "/leaves",            icon: FileText,      gradient: "linear-gradient(135deg, #dc2626, #f87171)", shadow: "0 8px 24px rgba(220,38,38,0.30)",   roles: ["admin", "teacher", "student", "staff"] },
  { id: "academic",      label: "Academic",      description: "Subjects & exam schedules",             baseHref: "/academic/subjects", icon: ClipboardList, gradient: "linear-gradient(135deg, #16a34a, #22c55e)", shadow: "0 8px 24px rgba(22,163,74,0.35)",   roles: ["admin", "teacher"] },
  { id: "timetable",     label: "Timetable",     description: "Class & session schedules",             baseHref: "/timetable",         icon: LayoutGrid,    gradient: "linear-gradient(135deg, #0891b2, #3b82f6)", shadow: "0 8px 24px rgba(59,130,246,0.35)",  roles: ["admin", "teacher", "student", "staff"] },
  { id: "payroll",       label: "Payroll",       description: "Salary & payroll processing",           baseHref: "/payroll",           icon: DollarSign,    gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)", shadow: "0 8px 24px rgba(79,70,229,0.35)",   roles: ["admin", "teacher", "staff"] },
  { id: "fees",          label: "Fees",          description: "Fee collection & records",              baseHref: "/fees",              icon: CreditCard,    gradient: "linear-gradient(135deg, #059669, #0891b2)", shadow: "0 8px 24px rgba(5,150,105,0.35)",   roles: ["admin", "staff", "student"] },
  { id: "events",        label: "Events",        description: "Campus events & calendar",              baseHref: "/events",            icon: Calendar,      gradient: "linear-gradient(135deg, #9333ea, #db2777)", shadow: "0 8px 24px rgba(147,51,234,0.35)",  roles: ["admin", "teacher", "student", "staff"] },
  { id: "reports",       label: "Reports",       description: "Analytics & data exports",              baseHref: "/reports/attendance",icon: BarChart2,     gradient: "linear-gradient(135deg, #b45309, #d97706)", shadow: "0 8px 24px rgba(180,83,9,0.35)",    roles: ["admin"] },
  { id: "hostel",        label: "Hostel",        description: "Room & hostel management",              baseHref: "/hostel",            icon: Hotel,         gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)", shadow: "0 8px 24px rgba(29,78,216,0.35)",   roles: ["admin", "staff", "student"] },
  { id: "transport",     label: "Transport",     description: "Buses & route management",              baseHref: "/transport",         icon: Bus,           gradient: "linear-gradient(135deg, #0f766e, #14b8a6)", shadow: "0 8px 24px rgba(15,118,110,0.35)",  roles: ["admin", "staff", "student"] },
  { id: "library",       label: "Library",       description: "Books & library records",               baseHref: "/library",           icon: BookOpen,      gradient: "linear-gradient(135deg, #7c3aed, #db2777)", shadow: "0 8px 24px rgba(124,58,237,0.35)",  roles: ["admin", "teacher", "staff", "student"] },
  { id: "announcements", label: "Notices",       description: "Announcements & notices",               baseHref: "/announcements",     icon: Megaphone,     gradient: "linear-gradient(135deg, #dc2626, #9333ea)", shadow: "0 8px 24px rgba(220,38,38,0.30)",   roles: ["admin", "teacher", "student", "staff"] },
  { id: "org",           label: "Organisation",  description: "Settings & configuration",              baseHref: "/org/profile",       icon: Building,      gradient: "linear-gradient(135deg, #374151, #6b7280)", shadow: "0 8px 24px rgba(55,65,81,0.35)",    roles: ["admin"] },
  { id: "portal",        label: "My Portal",     description: "Student self-service portal",           baseHref: "/portal",            icon: PieChart,      gradient: "linear-gradient(135deg, #0891b2, #7c3aed)", shadow: "0 8px 24px rgba(8,145,178,0.35)",   roles: ["student"] },
  { id: "profile",       label: "My Profile",    description: "View & edit your profile",              baseHref: "/profile",           icon: User,          gradient: "linear-gradient(135deg, #4f46e5, #06b6d4)", shadow: "0 8px 24px rgba(79,70,229,0.35)",   roles: ["admin", "teacher", "student", "staff"] },
];

/** Returns module list with hrefs prefixed by the tenant slug. */
export function getModules(tenantSlug: string): ModuleDef[] {
  return BASE_MODULES.map((m) => ({
    ...m,
    href: `/${tenantSlug}${m.baseHref}`,
  }));
}

// ── Pathname → module name lookup ─────────────────────────────────────────────

const PATH_NAMES: Record<string, string> = {
  "/dashboard":           "Home",
  "/users":               "Users",
  "/employees":           "Employees",
  "/students":            "Students",
  "/attendance":          "Attendance",
  "/attendance/summary":  "Attendance Summary",
  "/attendance/shortage": "Shortage List",
  "/attendance/export":   "Attendance Export",
  "/marks":               "Marks",
  "/results":             "Results",
  "/leaves":              "Leaves",
  "/events":              "Events",
  "/portal":              "My Portal",
  "/profile":             "My Profile",
  "/academic/subjects":   "Subjects",
  "/academic/exams":      "Exam Schedules",
  "/timetable":           "Timetable",
  "/payroll":             "Payroll",
  "/salary-structures":   "Salary Structures",
  "/fees":                "Fees",
  "/reports/attendance":  "Attendance Report",
  "/reports/marks":       "Marks Report",
  "/reports/fees":        "Fee Report",
  "/reports/payroll":     "Payroll Report",
  "/reports/leaves":      "Leave Report",
  "/hostel":              "Hostel",
  "/transport":           "Transport",
  "/library":             "Library",
  "/announcements":       "Announcements",
  "/notifications":       "Notifications",
  "/org/profile":         "Org Profile",
  "/org/departments":     "Departments",
  "/org/academic-years":  "Academic Years",
  "/org/roles":           "Roles",
  "/org/holidays":        "Holidays",
  "/leave-types":         "Leave Types",
};

/**
 * Returns a human-readable name for the current pathname.
 * Pass tenantSlug to strip the tenant prefix before lookup.
 */
export function getModuleName(pathname: string, tenantSlug?: string): string {
  const path = tenantSlug ? pathname.replace(`/${tenantSlug}`, "") || "/" : pathname;
  if (PATH_NAMES[path]) return PATH_NAMES[path];
  const match = Object.keys(PATH_NAMES)
    .sort((a, b) => b.length - a.length)
    .find((key) => path.startsWith(key) && key !== "/dashboard");
  return match ? PATH_NAMES[match] : "Dashboard";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/moduleConfig.ts
git commit -m "feat: make moduleConfig tenant-aware with getModules(tenantSlug)"
```

---

### Task 6: TopBar — tenant-aware links

**Files:**
- Modify: `frontend/components/layout/TopBar.tsx`

- [ ] **Step 1: Replace TopBar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useTheme } from "@/context/ThemeContext";
import Switch from "@/components/ui/switch";
import NotificationBell from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { Home, Sun, LogOut, ChevronRight } from "lucide-react";
import { getModuleName } from "@/lib/moduleConfig";

export default function TopBar() {
  const pathname   = usePathname();
  const dispatch   = useAppDispatch();
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const { theme, mounted, toggleTheme } = useTheme();

  const homeHref   = tenantSlug ? `/${tenantSlug}/dashboard` : "/login";
  const isHome     = tenantSlug ? pathname === `/${tenantSlug}/dashboard` : false;
  const modName    = getModuleName(pathname, tenantSlug ?? undefined);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = "/login";
  };

  return (
    <header
      className="shrink-0 flex items-center justify-between px-5 py-3 z-40 transition-colors duration-200 topbar-header"
      style={{ borderBottom: "1px solid rgb(var(--border))" }}
    >
      {/* ── Left: logo + breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href={homeHref} className="shrink-0 flex items-center gap-2">
          <Logo withText size={28} />
        </Link>

        {!isHome && (
          <>
            <ChevronRight
              size={13}
              className="shrink-0"
              style={{ color: "rgb(var(--text-muted))" }}
            />
            <Link
              href={homeHref}
              className="
                shrink-0 flex items-center gap-1.5 text-xs font-semibold
                px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:scale-105
              "
              style={{
                background: "rgba(124,58,237,0.09)",
                color:      "rgb(var(--primary))",
                border:     "1px solid rgba(124,58,237,0.18)",
              }}
            >
              <Home size={12} />
              Home
            </Link>
            <ChevronRight
              size={13}
              className="shrink-0"
              style={{ color: "rgb(var(--text-muted))" }}
            />
            <span
              className="text-xs font-semibold truncate max-w-[160px]"
              style={{ color: "rgb(var(--text-base))" }}
            >
              {modName}
            </span>
          </>
        )}
      </div>

      {/* ── Right: notifications + theme + user + logout ────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />

        {mounted && (
          <div className="flex items-center gap-1.5">
            <Sun size={14} style={{ color: "rgb(var(--text-muted))" }} />
            <Switch checked={theme === "dark"} onChange={toggleTheme} size="sm" />
          </div>
        )}

        {user && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg hidden sm:block"
            style={{
              background: "rgba(124,58,237,0.07)",
              color:      "rgb(var(--text-muted))",
              border:     "1px solid rgba(124,58,237,0.12)",
            }}
          >
            {user.name}
          </span>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:scale-105"
          style={{
            background: "rgba(239,68,68,0.07)",
            color:      "rgb(var(--text-muted))",
            border:     "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/TopBar.tsx
git commit -m "feat: make TopBar use tenant-aware home links"
```

---

### Task 7: ModuleSwitcher — tenant-aware links

**Files:**
- Modify: `frontend/components/layout/ModuleSwitcher.tsx`

- [ ] **Step 1: Update the three tenant-dependent lines**

In `frontend/components/layout/ModuleSwitcher.tsx`, make these targeted changes:

**a) Add `tenantSlug` to the selector and derive `homeHref` and `isHome`:**

Find:
```typescript
  const { user }          = useAppSelector((s) => s.auth);
  const role              = user?.role ?? "";

  // Don't render the switcher on the home/dashboard page
  const isHome = pathname === "/dashboard";

  const visible = modules.filter((m) => m.roles.includes(role));
```

Replace with:
```typescript
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const role                 = user?.role ?? "";
  const homeHref             = tenantSlug ? `/${tenantSlug}/dashboard` : "/login";

  // Don't render the switcher on the dashboard home page
  const isHome = tenantSlug ? pathname === `/${tenantSlug}/dashboard` : false;

  const allMods = tenantSlug ? getModules(tenantSlug) : [];
  const visible = allMods.filter((m) => m.roles.includes(role));
```

**b) Update the import at the top of the file** — change:
```typescript
import { modules } from "@/lib/moduleConfig";
```
to:
```typescript
import { getModules } from "@/lib/moduleConfig";
```

**c) Update the Home link href** — find `href="/dashboard"` (two occurrences inside the component JSX) and replace both with `href={homeHref}`.

**d) Update the `isCurrent` check** — find:
```typescript
const isCurrent = pathname.startsWith(mod.href) && mod.href !== "/dashboard";
```
Replace with:
```typescript
const isCurrent = pathname.startsWith(mod.href) && mod.href !== homeHref;
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/ModuleSwitcher.tsx
git commit -m "feat: make ModuleSwitcher use tenant-aware module hrefs"
```

---

### Task 8: Create /super/login page

**Files:**
- Create: `frontend/app/super/login/page.tsx`

- [ ] **Step 1: Create the super admin login page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError } from "@/store/slices/authSlice";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

const C = {
  bg:          "#F2F2F7",
  surface:     "#FFFFFF",
  blue:        "#007AFF",
  red:         "#FF3B30",
  label:       "#1C1C1E",
  placeholder: "#8E8E93",
  fill:        "#F2F2F7",
  separator:   "#E5E5EA",
};

const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function SuperLoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, token, user } = useAppSelector((s) => s.auth);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);
  const [accessError,  setAccessError]  = useState("");

  useEffect(() => {
    if (token && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else {
        setAccessError("Access denied. This login is for super admins only.");
      }
    }
  }, [token, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError("");
    dispatch(clearError());
    await dispatch(login({ email, password }));
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", fontSize: "16px", fontFamily: FONT,
    color: C.label, backgroundColor: focused ? C.surface : C.fill,
    border: `1.5px solid ${focused ? C.blue : C.separator}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  });

  const displayError = accessError || error;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #1C1C1E, #3C3C43)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label, lineHeight: 1.2 }}>
            Super Admin
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            StepElly Platform Console
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {displayError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="admin@collerp.com"
                autoComplete="email"
                required
                style={inputStyle(emailFocused)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ ...inputStyle(passFocused), paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.placeholder, padding: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: loading ? "#888" : "#1C1C1E",
                border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file created at correct path**

```bash
ls frontend/app/super/login/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git add app/super/login/page.tsx
git commit -m "feat: add /super/login page for super admin authentication"
```

---

### Task 9: Update super-admin layout redirects

**Files:**
- Modify: `frontend/app/(super-admin)/layout.tsx`

- [ ] **Step 1: Update two redirect targets**

**a)** Find:
```typescript
    if (!token) {
      router.replace("/login");
      return;
    }
```
Replace with:
```typescript
    if (!token) {
      router.replace("/super/login");
      return;
    }
```

**b)** Find:
```typescript
  if (user.role !== "super_admin") {
    router.replace("/dashboard");
    return <LoadingSpinner text="Redirecting..." />;
  }
```
Replace with:
```typescript
  if (user.role !== "super_admin") {
    const slug = typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null;
    router.replace(slug ? `/${slug}/dashboard` : "/login");
    return <LoadingSpinner text="Redirecting..." />;
  }
```

**c)** Find the logout button `onClick`:
```typescript
onClick={() => { dispatch(logout()); window.location.href = "/login"; }}
```
Replace with:
```typescript
onClick={() => { dispatch(logout()); window.location.href = "/super/login"; }}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(super-admin)/layout.tsx"
git commit -m "feat: update super-admin layout to redirect to /super/login"
```

---

### Task 10: Update /login page — add org identifier field

**Files:**
- Modify: `frontend/app/login/page.tsx`

- [ ] **Step 1: Replace login/page.tsx with the org-field version**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError, setTenantSlug } from "@/store/slices/authSlice";
import { tenantLookupAPI } from "@/lib/api";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const C = {
  bg:          "#F2F2F7",
  surface:     "#FFFFFF",
  blue:        "#007AFF",
  red:         "#FF3B30",
  label:       "#1C1C1E",
  label2:      "#3C3C43",
  placeholder: "#8E8E93",
  fill:        "#F2F2F7",
  separator:   "#E5E5EA",
};

const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function LoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, token, user, tenantSlug: storedSlug } = useAppSelector((s) => s.auth);

  const [orgId,        setOrgId]        = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgFocused,   setOrgFocused]   = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);
  const [localError,   setLocalError]   = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (token && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else if (storedSlug) {
        router.replace(`/${storedSlug}/dashboard`);
      }
    }
  }, [token, user, storedSlug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    dispatch(clearError());

    if (!orgId.trim()) {
      setLocalError("Please enter your organisation identifier.");
      return;
    }

    // Step 1: Resolve org slug → tenant
    let resolvedSlug = "";
    try {
      const res = await tenantLookupAPI.lookup(orgId.trim().toLowerCase());
      resolvedSlug = res.data.data.subdomain;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number } };
      if (e.response?.status === 403) {
        setLocalError("This organisation is suspended. Contact support.");
      } else {
        setLocalError("Organisation not found. Check the identifier and try again.");
      }
      return;
    }

    // Step 2: Authenticate
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      dispatch(setTenantSlug(resolvedSlug));
      router.replace(`/${resolvedSlug}/dashboard`);
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", fontSize: "16px", fontFamily: FONT,
    color: C.label, backgroundColor: focused ? C.surface : C.fill,
    border: `1.5px solid ${focused ? C.blue : C.separator}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  });

  const displayError = localError || error;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <Logo size={48} variant="gradient" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label, lineHeight: 1.2 }}>
            Sign in to StepElly
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            Enter your organisation and credentials
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {displayError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Organisation
              </label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                onFocus={() => setOrgFocused(true)}
                onBlur={() => setOrgFocused(false)}
                placeholder="your-org-name"
                autoComplete="organization"
                required
                style={inputStyle(orgFocused)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={inputStyle(emailFocused)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ ...inputStyle(passFocused), paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.placeholder, padding: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: loading ? "#aaa" : C.blue,
                border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.placeholder }}>
          Super admin?{" "}
          <a href="/super/login" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/login/page.tsx"
git commit -m "feat: add org identifier field to generic /login page"
```

---

### Task 11: Move dashboard directory to [tenant]/(dashboard)

**Files:**
- Move: `frontend/app/(dashboard)/` → `frontend/app/[tenant]/(dashboard)/`

- [ ] **Step 1: Create the new directory and copy all files**

Run in `frontend/`:

```bash
mkdir -p "app/[tenant]"
cp -r "app/(dashboard)" "app/[tenant]/(dashboard)"
```

- [ ] **Step 2: Verify the copy**

```bash
ls "app/[tenant]/(dashboard)/"
# Expected: layout.tsx  dashboard/  students/  employees/  ... (all existing pages)
```

- [ ] **Step 3: Remove the old directory**

```bash
rm -rf "app/(dashboard)"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: move dashboard routes under [tenant]/(dashboard) dynamic segment"
```

---

### Task 12: Update [tenant]/(dashboard)/layout.tsx

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace the layout with tenant-aware version**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe } from "@/store/slices/authSlice";
import TopBar          from "@/components/layout/TopBar";
import ModuleSwitcher  from "@/components/layout/ModuleSwitcher";
import LoadingSpinner  from "@/components/ui/LoadingSpinner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const params   = useParams();
  const tenant   = params.tenant as string;

  const dispatch = useAppDispatch();
  const { token, user, tenantSlug } = useAppSelector((s) => s.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      router.replace(`/${tenant}/login`);
      return;
    }

    if (user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
        return;
      }
      // Redirect to the correct org if the URL tenant doesn't match
      if (tenantSlug && tenantSlug !== tenant) {
        router.replace(`/${tenantSlug}/dashboard`);
        return;
      }
    } else {
      dispatch(fetchMe());
    }
  }, [mounted, token, user, tenantSlug, tenant, dispatch, router]);

  if (!mounted)  return <LoadingSpinner text="Loading..." />;
  if (!token)    return null;
  if (!user)     return <LoadingSpinner text="Authenticating..." />;

  if (user.role === "super_admin") {
    router.replace("/super/dashboard");
    return null;
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-colors duration-200"
      style={{ background: "rgb(var(--bg-base))" }}
    >
      <TopBar />
      <main
        className="flex-1 overflow-y-auto p-8 transition-colors duration-200"
        style={{ background: "rgb(var(--bg-base))" }}
      >
        {children}
      </main>
      <ModuleSwitcher />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[tenant]/(dashboard)/layout.tsx"
git commit -m "feat: update dashboard layout to validate tenant from URL params"
```

---

### Task 13: Create [tenant]/login page

**Files:**
- Create: `frontend/app/[tenant]/login/page.tsx`

- [ ] **Step 1: Create the tenant-specific login page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError, setTenantSlug } from "@/store/slices/authSlice";
import { tenantLookupAPI } from "@/lib/api";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const C = {
  bg:          "#F2F2F7",
  surface:     "#FFFFFF",
  blue:        "#007AFF",
  red:         "#FF3B30",
  label:       "#1C1C1E",
  placeholder: "#8E8E93",
  fill:        "#F2F2F7",
  separator:   "#E5E5EA",
};

const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
}

export default function TenantLoginPage() {
  const router   = useRouter();
  const params   = useParams();
  const tenant   = params.tenant as string;

  const dispatch = useAppDispatch();
  const { loading, error, token, user } = useAppSelector((s) => s.auth);

  const [tenantInfo,   setTenantInfo]   = useState<TenantInfo | null>(null);
  const [tenantError,  setTenantError]  = useState("");
  const [lookingUp,    setLookingUp]    = useState(true);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);

  // Resolve tenant on mount
  useEffect(() => {
    if (!tenant) return;
    tenantLookupAPI.lookup(tenant)
      .then((res) => {
        setTenantInfo(res.data.data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        if (e.response?.status === 403) {
          setTenantError("This organisation is suspended. Contact support.");
        } else {
          setTenantError("Organisation not found. Check the URL and try again.");
        }
      })
      .finally(() => setLookingUp(false));
  }, [tenant]);

  // Redirect once authenticated
  useEffect(() => {
    if (token && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else {
        router.replace(`/${tenant}/dashboard`);
      }
    }
  }, [token, user, tenant, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      dispatch(setTenantSlug(tenant));
      router.replace(`/${tenant}/dashboard`);
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", fontSize: "16px", fontFamily: FONT,
    color: C.label, backgroundColor: focused ? C.surface : C.fill,
    border: `1.5px solid ${focused ? C.blue : C.separator}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  });

  if (lookingUp) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT, color: C.placeholder }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <Logo size={48} variant="gradient" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label }}>
            {tenantInfo ? tenantInfo.name : "Sign In"}
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            {tenantInfo ? `Sign in to ${tenantInfo.subdomain}.roserp.workvar.com` : ""}
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {/* Org not found / suspended error */}
          {tenantError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{tenantError}</p>
            </div>
          )}

          {/* Auth error */}
          {error && !tenantError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={!!tenantError}
                style={inputStyle(emailFocused)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={!!tenantError}
                  style={{ ...inputStyle(passFocused), paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.placeholder, padding: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!tenantError}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: (loading || !!tenantError) ? "#aaa" : C.blue,
                border: "none", borderRadius: "12px",
                cursor: (loading || !!tenantError) ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.placeholder }}>
          Not from this org?{" "}
          <a href="/login" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>
            Sign in with a different org
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[tenant]/login/page.tsx"
git commit -m "feat: add /[tenant]/login page with org validation on mount"
```

---

### Task 14: Update root page.tsx redirect

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Update useRedirectIfAuthed to use tenantSlug**

Find the `useRedirectIfAuthed` function in `frontend/app/page.tsx`:

```typescript
function useRedirectIfAuthed() {
  const router = useRouter();
  const token = useAppSelector((s) => s.auth.token);
  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);
}
```

Replace with:

```typescript
function useRedirectIfAuthed() {
  const router = useRouter();
  const { token, tenantSlug } = useAppSelector((s) => s.auth);
  useEffect(() => {
    if (token) {
      const slug = tenantSlug || (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null);
      router.replace(slug ? `/${slug}/dashboard` : "/login");
    }
  }, [token, tenantSlug, router]);
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/page.tsx"
git commit -m "feat: update root page redirect to use tenant slug"
```

---

### Task 15: Build and verify

- [ ] **Step 1: Build the frontend**

```bash
cd frontend
pnpm build
```

Expected: no TypeScript errors. If you see errors about `modules` being used in any file (import from moduleConfig), update that import to use `getModules(tenantSlug)` instead.

- [ ] **Step 2: Check for any remaining hardcoded /dashboard hrefs**

```bash
grep -r 'href="/dashboard"' app/ components/ --include="*.tsx" --include="*.ts"
grep -r 'router.replace("/dashboard")' app/ components/ --include="*.tsx" --include="*.ts"
grep -r 'router.push("/dashboard")' app/ components/ --include="*.tsx" --include="*.ts"
```

For each result found, update the href/router call to use `/${tenantSlug}/dashboard`. These are likely in individual dashboard pages. Read each file and replace the hardcoded path with the tenant-aware version using `tenantSlug` from `useAppSelector((s) => s.auth.tenantSlug)`.

- [ ] **Step 3: Start dev server and test**

```bash
pnpm dev
```

Test checklist:
1. Navigate to `http://localhost:3000/` — should show landing page (or redirect to login if no token)
2. Navigate to `http://localhost:3000/login` — should show login page with Organisation field
3. Navigate to `http://localhost:3000/super/login` — should show super admin login (shield icon, no org field)
4. Navigate to `http://localhost:3000/acme/login` — should resolve org and show org name in header
5. Navigate to `http://localhost:3000/doesnotexist/login` — should show "Organisation not found" error, form disabled
6. Log in via `/acme/login` — should redirect to `/acme/dashboard`
7. All navigation links (TopBar logo, ModuleSwitcher modules) should have `/acme/` prefix
8. Log out — should redirect to `/login`
9. Log in via `/super/login` with super admin credentials — should redirect to `/super/dashboard`
10. Super admin navigating to `/acme/dashboard` should redirect to `/super/dashboard`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-tenant path-based routing"
```
