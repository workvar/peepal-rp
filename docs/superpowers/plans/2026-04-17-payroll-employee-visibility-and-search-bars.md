# Payroll Employee Visibility Fix + Search Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the payroll page so employee name and custom ID (e.g. "EMP001") are visible, then add a client-side text search bar to every list page in the app.

**Architecture:** The employee visibility bug is a backend `json:"-"` tag blocking serialization of the GORM preloaded `EmployeeModel`; fix the tag and deepen the preload chain. Search bars are all pure client-side: a `useState` query filtered over the already-loaded Redux data using the fields visible in each table/list.

**Tech Stack:** Go/GORM (backend), Next.js 13 / React / Redux Toolkit (frontend), TypeScript, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `backend/models/payroll.go` | `json:"-"` → `json:"employee"` on `EmployeeModel` |
| `backend/handlers/salary.go` | Deep preload employee.User + employee.Department in 3 handlers |
| `frontend/app/[tenant]/(dashboard)/payroll/page.tsx` | Add employee_id sub-line + search bar |
| `frontend/app/[tenant]/(dashboard)/salary-structures/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/employees/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/leaves/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/users/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/students/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/attendance/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/fees/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/hostel/page.tsx` | Add search bar (rooms + allocations tabs) |
| `frontend/app/[tenant]/(dashboard)/library/page.tsx` | Extend existing search to ISBN/category/issues/overdue |
| `frontend/app/[tenant]/(dashboard)/marks/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/results/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/transport/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/announcements/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/leave-types/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/org/roles/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/org/departments/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/org/holidays/page.tsx` | Add search bar |
| `frontend/app/[tenant]/(dashboard)/academic/subjects/page.tsx` | Add search bar (on top of existing dept filter) |
| `frontend/app/[tenant]/(dashboard)/academic/exams/page.tsx` | Add search bar |

---

### Task 1: Fix Payroll Employee Data Serialization (Backend)

**Files:**
- Modify: `backend/models/payroll.go`
- Modify: `backend/handlers/salary.go`

**Root cause:** `EmployeeModel` in the Payroll model has `json:"-"` which prevents the preloaded employee from appearing in API responses. Also `GetMyPayrolls` never preloads employee data at all.

- [ ] **Step 1: Fix the Payroll model JSON tag**

In `backend/models/payroll.go`, find the `Payroll` struct and change line:
```go
EmployeeModel    Employee  `gorm:"foreignKey:EmployeeID" json:"-"`
```
to:
```go
EmployeeModel    Employee  `gorm:"foreignKey:EmployeeID" json:"employee"`
```

> There is a second identical field on the `SalaryStructure` struct (line ~45). Leave that one as `json:"-"` — salary structures already resolve employee names from a separate Redux store.

- [ ] **Step 2: Deepen preloads in ListPayrolls**

In `backend/handlers/salary.go`, find `ListPayrolls` (around line 152). The current query is:
```go
q := database.DB.Where("tenant_id = ?", tenantID).Preload("EmployeeModel")
```
Change it to:
```go
q := database.DB.Where("tenant_id = ?", tenantID).
    Preload("EmployeeModel").
    Preload("EmployeeModel.User").
    Preload("EmployeeModel.Department")
```

- [ ] **Step 3: Deepen preloads in GetPayrollSummary**

In the same file, find `GetPayrollSummary` (around line 347). Change:
```go
q := database.DB.Where("tenant_id = ?", tenantID).Preload("EmployeeModel")
```
to:
```go
q := database.DB.Where("tenant_id = ?", tenantID).
    Preload("EmployeeModel").
    Preload("EmployeeModel.User").
    Preload("EmployeeModel.Department")
```

- [ ] **Step 4: Add preloads to GetMyPayrolls**

In the same file, find `GetMyPayrolls` (around line 168). The current query is:
```go
database.DB.Where("tenant_id = ? AND employee_id = ?", tenantID, employee.ID).
    Order("year desc, month desc").Find(&payrolls)
```
Change it to:
```go
database.DB.Where("tenant_id = ? AND employee_id = ?", tenantID, employee.ID).
    Preload("EmployeeModel").
    Preload("EmployeeModel.User").
    Preload("EmployeeModel.Department").
    Order("year desc, month desc").Find(&payrolls)
```

- [ ] **Step 5: Build and verify**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```
Expected: no output (clean build).

- [ ] **Step 6: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/models/payroll.go backend/handlers/salary.go
git commit -m "fix: serialize employee data in payroll API responses"
```

---

### Task 2: Payroll Page — Show Employee ID + Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/payroll/page.tsx`

The `employee_id` field (custom string like "EMP001") on the Employee model is never shown. After the backend fix, `p.employee?.employee_id` will be populated. We also add a search bar that filters the displayed payroll list.

- [ ] **Step 1: Add search state**

In `PayrollPage`, after the existing state declarations (around line 54), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered payrolls derived variable**

After `const displayPayrolls = canManagePayroll ? payrolls : myPayrolls` (line 67), add:
```tsx
const filteredPayrolls = search
  ? displayPayrolls.filter(p => {
      const period = `${MONTHS[p.month - 1]} ${p.year}`
      return [
        p.employee?.user?.name,
        p.employee?.employee_id,
        p.employee?.department?.name,
        p.status,
        period,
      ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
    })
  : displayPayrolls
```

- [ ] **Step 3: Add search input to the filters row**

Find the filters `<div className="flex gap-3">` (around line 152). Add a search input as the first element inside it:
```tsx
<input
  className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
  placeholder="Search employee, status…"
  value={search}
  onChange={e => setSearch(e.target.value)}
/>
```

For non-admin users the filters row is not rendered. Wrap the search input in its own div above the table for non-admin users — add this block just before the Payroll Table comment (line ~196):
```tsx
{!canManagePayroll && (
  <div>
    <input
      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      placeholder="Search period, status…"
      value={search}
      onChange={e => setSearch(e.target.value)}
    />
  </div>
)}
```

- [ ] **Step 4: Use filteredPayrolls in the table**

Change:
```tsx
{displayPayrolls.length === 0 ? (
```
to:
```tsx
{filteredPayrolls.length === 0 ? (
```

Change:
```tsx
{displayPayrolls.map(p => (
```
to:
```tsx
{filteredPayrolls.map(p => (
```

- [ ] **Step 5: Add employee_id sub-line in the Employee column**

Find the Employee `<td>` (around line 219–224):
```tsx
{canManagePayroll && (
  <td className="px-4 py-3 font-medium text-foreground">
    {p.employee?.user?.name || '—'}
    <div className="text-xs text-muted-foreground/70">{p.employee?.department?.name || ''}</div>
  </td>
)}
```
Change it to:
```tsx
{canManagePayroll && (
  <td className="px-4 py-3 font-medium text-foreground">
    {p.employee?.user?.name || '—'}
    <div className="text-xs text-muted-foreground/70">
      {p.employee?.employee_id ? `${p.employee.employee_id} · ` : ''}{p.employee?.department?.name || ''}
    </div>
  </td>
)}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/payroll/page.tsx"
git commit -m "feat: show employee ID in payroll table and add search bar"
```

---

### Task 3: Salary Structures — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/salary-structures/page.tsx`

- [ ] **Step 1: Add search state**

After the existing state declarations (around line 30), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Replace the `displayed` variable with a search-filtered version**

Find the existing line (around line 76):
```tsx
const displayed = salaryStructures
```
Replace it with:
```tsx
const displayed = search
  ? salaryStructures.filter(s => {
      const empName = getEmployeeName(s.employee_id)
      return [
        empName,
        s.is_active ? 'active' : 'inactive',
        new Date(s.effective_from).toLocaleDateString(),
      ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
    })
  : salaryStructures
```

- [ ] **Step 3: Add search input to the filter row**

Find the filter `<div>` containing the employee select (around line 92):
```tsx
<div>
  <select value={filterEmployee} ...
```
Wrap it and add a search input:
```tsx
<div className="flex gap-3 items-center flex-wrap">
  <input
    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
    placeholder="Search employee, status…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
  <select value={filterEmployee} onChange={(e: any) => handleFilterChange(e.target.value)}
    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
    <option value="">All Employees</option>
    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}
  </select>
</div>
```
Remove the original bare `<div>` wrapper around the select.

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/salary-structures/page.tsx"
git commit -m "feat: add search bar to salary structures page"
```

---

### Task 4: Employees Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/employees/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 19), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered employees derived variable**

Before the `return (` statement, add:
```tsx
const filteredEmployees = search
  ? employees.filter(emp => [
      emp.user?.name,
      emp.user?.email,
      emp.department?.name,
      emp.designation,
      emp.phone,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : employees
```

- [ ] **Step 3: Add search input above the table**

Find the block that renders the table (starts with `{loading ? (`). Add a search input between the `<Header />` component and the loading check:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search name, email, department…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredEmployees in the table**

Change:
```tsx
{employees.map((emp) => (
```
to:
```tsx
{filteredEmployees.map((emp) => (
```

Change the empty-state `colSpan={7}` row to check `filteredEmployees.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/employees/page.tsx"
git commit -m "feat: add search bar to employees page"
```

---

### Task 5: Leaves Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/leaves/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 25), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered leaves derived variable**

Before the `return (` statement, add:
```tsx
const filteredLeaves = search
  ? leaves.filter(l => [
      l.applicant?.name,
      l.leave_type,
      l.reason,
      l.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : leaves
```

- [ ] **Step 3: Add search input above the table**

After `<Header ... />` and the leave balance summary block, add before the `{loading ?` check:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search leave type, reason, status…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredLeaves in the table**

Change:
```tsx
{leaves.map((l) => (
```
to:
```tsx
{filteredLeaves.map((l) => (
```

Change the empty-state row from checking `leaves.length === 0` to `filteredLeaves.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/leaves/page.tsx"
git commit -m "feat: add search bar to leaves page"
```

---

### Task 6: Users Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/users/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 30), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered users derived variable**

Before the `return (` statement, add:
```tsx
const filteredUsers = search
  ? users.filter(u => [
      u.name,
      u.email,
      u.role,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : users
```

- [ ] **Step 3: Add search input above the table**

After `<PageHeader ... />`, add before the `{loading ?` check:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search name, email, role…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredUsers in the table**

Find `{users.map((user) => (` and change to `{filteredUsers.map((user) => (`.

Change any empty-state check from `users.length === 0` to `filteredUsers.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/users/page.tsx"
git commit -m "feat: add search bar to users page"
```

---

### Task 7: Students Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/students/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 21), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered students derived variable**

Before the `return (` statement, add:
```tsx
const filteredStudents = search
  ? students.filter(s => [
      s.user?.name,
      s.roll_number,
      s.course?.name,
      s.section,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : students
```

- [ ] **Step 3: Add search input above the table**

After `<Header ... />`, add before the `{loading ?` check:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search name, roll number, course…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredStudents in the table**

Change `{students.map((s) => (` to `{filteredStudents.map((s) => (`.

Change the empty-state `colSpan={7}` row to check `filteredStudents.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/students/page.tsx"
git commit -m "feat: add search bar to students page"
```

---

### Task 8: Attendance Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/attendance/page.tsx`

The attendance table shows: Date, Type (student/employee), Status, Remarks. Search is over those fields.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 26), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered records derived variable**

Before the `return (` statement, add:
```tsx
const filteredRecords = search
  ? records.filter(r => [
      r.date,
      r.status,
      r.remarks,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : records
```

- [ ] **Step 3: Add search input above the table**

After `<Header ... />`, add before the table/loading section:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search date, status, remarks…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredRecords in the table**

Change `{records.map((r) => (` to `{filteredRecords.map((r) => (`.

Change the empty-state row to check `filteredRecords.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/attendance/page.tsx"
git commit -m "feat: add search bar to attendance page"
```

---

### Task 9: Fees Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/fees/page.tsx`

The payments table shows: Receipt #, Student name (admin only), Fee Category, Amount, Mode, Date. Search covers these fields.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations, add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered payments derived variable**

After `const displayPayments = isStudent ? myPayments : feePayments`, add:
```tsx
const filteredPayments = search
  ? displayPayments.filter(p => [
      p.receipt_number,
      p.student?.user?.name,
      p.student?.roll_number,
      p.fee_structure?.fee_category?.name,
      p.payment_mode,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : displayPayments
```

- [ ] **Step 3: Add search input above the payments table**

Find the section that renders the payments table (the `displayPayments.length === 0` block). Just above it, add:
```tsx
<div className="mb-3">
  <input
    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
    placeholder="Search receipt, student, category…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredPayments in the table**

Change `displayPayments.length === 0` (for empty state check) to `filteredPayments.length === 0`.

Change `{displayPayments.map(p => (` to `{filteredPayments.map(p => (`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/fees/page.tsx"
git commit -m "feat: add search bar to fees page"
```

---

### Task 10: Hostel Page — Add Search Bar (Rooms + Allocations)

**File:** `frontend/app/[tenant]/(dashboard)/hostel/page.tsx`

The page has tabs: blocks, rooms, allocations, overview. Add search to the rooms tab (block, room number, type, status) and allocations tab (student name, room number, block name, status).

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 21), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered rooms and allocations**

Before the `return (` statement, add:
```tsx
const filteredRooms = search
  ? rooms.filter(r => [
      r.block,
      r.room_number,
      r.type,
      r.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : rooms

const filteredAllocations = search
  ? allocations.filter(a => [
      a.student?.user?.name,
      a.room?.room_number,
      a.room?.block?.name,
      a.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : allocations
```

- [ ] **Step 3: Add search input above the tabs**

Find the tabs row in the JSX. Add a search input just above the tabs container:
```tsx
<div className="mb-3">
  <input
    className="input-field max-w-sm"
    placeholder="Search rooms or allocations…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredRooms in the rooms tab**

Find `{rooms.map((room) => (` (around line 243) and change to `{filteredRooms.map((room) => (`.

- [ ] **Step 5: Use filteredAllocations in the allocations tab**

Find `{allocations.map((alloc) => (` (around line 283) and change to `{filteredAllocations.map((alloc) => (`.

- [ ] **Step 6: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/hostel/page.tsx"
git commit -m "feat: add search bar to hostel page"
```

---

### Task 11: Library Page — Extend Search to ISBN, Category, Issues, Overdue

**File:** `frontend/app/[tenant]/(dashboard)/library/page.tsx`

The books tab already has a `search` state wired to the server and a `filteredBooks` client filter (title + author only). Extend `filteredBooks` to also match ISBN and category. Add filtering of the `issues` and `overdue` tabs using the same `search` state.

- [ ] **Step 1: Extend filteredBooks to include ISBN and category**

Find (around line 88):
```tsx
const filteredBooks = books.filter((b) =>
  b.title.toLowerCase().includes(search.toLowerCase()) ||
  b.author.toLowerCase().includes(search.toLowerCase())
);
```
Replace with:
```tsx
const filteredBooks = books.filter((b) =>
  [b.title, b.author, b.isbn, b.category].some(v =>
    String(v ?? '').toLowerCase().includes(search.toLowerCase())
  )
);
```

- [ ] **Step 2: Add filtered issues and overdue derived variables**

After the `filteredBooks` declaration, add:
```tsx
const filteredIssues = search
  ? issues.filter(issue => [
      issue.book?.title,
      issue.user?.name,
      issue.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : issues

const filteredOverdue = search
  ? overdue.filter(issue => [
      issue.book?.title,
      issue.user?.name,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : overdue
```

- [ ] **Step 3: Use filteredIssues in the issued tab**

Find `{issues.map((issue) => {` (around line 196) and change to `{filteredIssues.map((issue) => {`.

- [ ] **Step 4: Use filteredOverdue in the overdue tab**

Find `overdue.map((issue) => (` (around line 247) and change to `filteredOverdue.map((issue) => (`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/library/page.tsx"
git commit -m "feat: extend library search to ISBN, category, issues, and overdue"
```

---

### Task 12: Marks Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/marks/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations, add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered marks derived variable**

Before the `return (` statement, add:
```tsx
const filteredMarks = search
  ? marks.filter(m => [
      m.student?.user?.name,
      m.subject?.name,
      m.exam_type,
      m.grade,
      m.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : marks
```

- [ ] **Step 3: Add search input in the filter row**

The marks page has filter controls (student, subject, exam type selectors). Add a search input at the start of that filter row:
```tsx
<input
  className="input-field min-w-[200px]"
  placeholder="Search student, subject, grade…"
  value={search}
  onChange={e => setSearch(e.target.value)}
/>
```

- [ ] **Step 4: Use filteredMarks in the table**

Find `{marks.map((m) => (` (around line 106) and change to `{filteredMarks.map((m) => (`.

Change the empty-state row to check `filteredMarks.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/marks/page.tsx"
git commit -m "feat: add search bar to marks page"
```

---

### Task 13: Results Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/results/page.tsx`

The admin view shows a table. The student view shows score cards. `results` state is used in both. The fields in the admin table include status; student cards show subject_id (note: this field currently shows raw IDs, which is a pre-existing issue, not in scope here).

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 18), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered results derived variable**

Before the `return (` statement, add:
```tsx
const filteredResults = search
  ? results.filter(r => [
      r.subject_id,
      r.status,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : results
```

- [ ] **Step 3: Add search input above the results display**

After `<Header ... />`, add before the results content section:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search subject, status…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredResults in both admin table and student cards**

Find both occurrences of `{results.map((r) => (` and `results.map((result) => (` and change to use `filteredResults`.

Also change the empty-state `results.length === 0` checks to `filteredResults.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/results/page.tsx"
git commit -m "feat: add search bar to results page"
```

---

### Task 14: Transport Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/transport/page.tsx`

The transport page has routes, vehicles, and allocations tabs. Add one search bar above the tabs that filters the currently visible tab's data.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 21), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Reset search when switching tabs**

Find the tab click handler. If tabs are switched via `setActiveTab`, wrap it to also reset search:
```tsx
// Wherever setActiveTab is called (tab onClick), also call setSearch(''):
onClick={() => { setActiveTab(tab); setSearch('') }}
```

- [ ] **Step 3: Add filtered routes and vehicles**

Before the `return (` statement, add:
```tsx
const filteredRoutes = search
  ? routes.filter(r => [
      r.name,
      r.start_point,
      r.end_point,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : routes

const filteredVehicles = search
  ? vehicles.filter(v => [
      v.vehicle_number,
      v.type,
    ].some(v2 => String(v2 ?? '').toLowerCase().includes(search.toLowerCase())))
  : vehicles
```

- [ ] **Step 4: Add search input above the tabs**

Just above the tabs row, add:
```tsx
<div className="mb-3">
  <input
    className="input-field max-w-sm"
    placeholder={activeTab === 'routes' ? 'Search routes…' : 'Search vehicles…'}
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 5: Use filtered arrays in tabs**

Change `{routes.map((route) => (` to `{filteredRoutes.map((route) => (`.

Change `{vehicles.map((vehicle) => (` to `{filteredVehicles.map((vehicle) => (`.

- [ ] **Step 6: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/transport/page.tsx"
git commit -m "feat: add search bar to transport page"
```

---

### Task 15: Announcements Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/announcements/page.tsx`

Announcements are rendered as cards (not a table). The `displayList` variable is the final list to render. Search over title, priority, and target_roles.

- [ ] **Step 1: Add search state**

After the `displayList` declaration (around line 74), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered display list**

After the `const displayList = ...` line, add:
```tsx
const filteredList = search
  ? displayList.filter(a => [
      a.title,
      a.content,
      a.priority,
      a.target_roles,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : displayList
```

- [ ] **Step 3: Add search input above the announcement cards**

Find the area just before `displayList.length === 0` check. Add a search input:
```tsx
<div className="mb-4">
  <input
    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
    placeholder="Search announcements…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredList in the card render**

Change:
```tsx
) : displayList.length === 0 ? (
```
to:
```tsx
) : filteredList.length === 0 ? (
```

Change:
```tsx
{displayList.map(a => (
```
to:
```tsx
{filteredList.map(a => (
```

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/announcements/page.tsx"
git commit -m "feat: add search bar to announcements page"
```

---

### Task 16: Leave Types Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/leave-types/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 25), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered leave types**

Before the `return (` statement, add:
```tsx
const filteredLeaveTypes = search
  ? leaveTypes.filter(lt => [
      lt.name,
      lt.code,
      lt.applicable_to,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : leaveTypes
```

- [ ] **Step 3: Add search input above the table**

Find the table wrapper div. Just before it, add:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search leave type, code…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredLeaveTypes in the table**

Change `{leaveTypes.map((lt) => (` to `{filteredLeaveTypes.map((lt) => (`.

Change the empty-state check from `leaveTypes.length === 0` to `filteredLeaveTypes.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/leave-types/page.tsx"
git commit -m "feat: add search bar to leave types page"
```

---

### Task 17: Org Roles Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/org/roles/page.tsx`

The roles page has system roles (read-only cards) and custom roles (editable list). Add search to filter the custom `roles` list only. The `roles` state variable is from `useAppSelector((s) => s.org)`.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 251), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered roles**

Before the `return (` statement, add:
```tsx
const filteredRoles = search
  ? roles.filter(r => String(r.name ?? '').toLowerCase().includes(search.toLowerCase()))
  : roles
```

- [ ] **Step 3: Add search input above the custom roles section**

Find the custom roles section (the `{loading && !roles.length ?` block around line 352). Just above it, add:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search custom roles…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredRoles in the roles list**

Change `{roles.map((role) => {` (around line 364) to `{filteredRoles.map((role) => {`.

Change the `roles.length === 0` empty-state check to `filteredRoles.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/org/roles/page.tsx"
git commit -m "feat: add search bar to org roles page"
```

---

### Task 18: Org Departments Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/org/departments/page.tsx`

- [ ] **Step 1: Add search state**

After the existing `useState` declarations, add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered departments**

Before the `return (` statement, add:
```tsx
const filteredDepartments = search
  ? departments.filter(d => [
      d.name,
      d.code,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : departments
```
(The `departments` variable name — confirm in the file: it's from `useAppSelector((s) => s.org)` or similar.)

- [ ] **Step 3: Add search input above the table**

Just before the departments table, add:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search department name, code…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredDepartments in the table**

Find `{departments.map((dept) => (` or similar and change to use `filteredDepartments`.

Change any empty-state check to use `filteredDepartments`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/org/departments/page.tsx"
git commit -m "feat: add search bar to departments page"
```

---

### Task 19: Org Holidays Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/org/holidays/page.tsx`

Holidays are grouped by month in a `byMonth` object. Add search that filters `holidays` flat array, then re-groups by month so the grouping UI still works.

- [ ] **Step 1: Add search state**

After the `byMonth` computation (around line 87), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Compute filtered byMonth**

After the existing `byMonth` declaration, add:
```tsx
const displayedHolidays = search
  ? holidays.filter(h => [
      h.name,
      h.type,
      new Date(h.date).toLocaleDateString(),
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : holidays

const displayedByMonth = displayedHolidays.reduce<Record<string, typeof holidays>>((acc, h) => {
  const month = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' })
  if (!acc[month]) acc[month] = []
  acc[month].push(h)
  return acc
}, {})
```

- [ ] **Step 3: Add search input above the holiday groups**

Find the area just before `{Object.keys(byMonth).length === 0 &&`. Add:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search holiday name, type…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use displayedByMonth in the render**

Change:
```tsx
{Object.keys(byMonth).length === 0 && (
```
to:
```tsx
{Object.keys(displayedByMonth).length === 0 && (
```

Change:
```tsx
{Object.entries(byMonth).map(([month, items]) => (
```
to:
```tsx
{Object.entries(displayedByMonth).map(([month, items]) => (
```

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/org/holidays/page.tsx"
git commit -m "feat: add search bar to holidays page"
```

---

### Task 20: Academic Subjects Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/academic/subjects/page.tsx`

There is already a `filtered` variable that filters by department. Add text search on top of it.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 25), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add text-search layer on top of dept filter**

Find the existing line (around line 86):
```tsx
const filtered = filterDept ? subjects.filter((s) => s.department_id === filterDept) : subjects;
```

After it, add:
```tsx
const displayed = search
  ? filtered.filter(s => [
      s.name,
      s.code,
      s.department?.name,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : filtered
```

- [ ] **Step 3: Add search input in the filter row**

Find the filter row (the dept dropdown). Add a search input next to it:
```tsx
<input
  className="input-field min-w-[200px]"
  placeholder="Search subject, code…"
  value={search}
  onChange={e => setSearch(e.target.value)}
/>
```

- [ ] **Step 4: Use displayed in the table**

Change `{filtered.map((s) => (` to `{displayed.map((s) => (`.

Change the empty-state `No subjects found` check from `filtered.length === 0` to `displayed.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/academic/subjects/page.tsx"
git commit -m "feat: add search bar to subjects page"
```

---

### Task 21: Academic Exams Page — Add Search Bar

**File:** `frontend/app/[tenant]/(dashboard)/academic/exams/page.tsx`

Exams are rendered as cards (not a table). The `examSchedules` variable holds the list.

- [ ] **Step 1: Add search state**

After the existing `useState` declarations (around line 30), add:
```tsx
const [search, setSearch] = useState('')
```

- [ ] **Step 2: Add filtered exam schedules**

Before the `return (` statement, add:
```tsx
const filteredExams = search
  ? examSchedules.filter(e => [
      e.name,
      e.exam_type,
    ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
  : examSchedules
```

- [ ] **Step 3: Add search input above the exam cards**

Find the exam cards section (the `{examSchedules.map((exam) => (` block, around line 93). Just above it, add:
```tsx
<div className="mb-4">
  <input
    className="input-field max-w-sm"
    placeholder="Search exam name, type…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

- [ ] **Step 4: Use filteredExams in the cards render**

Change `{examSchedules.map((exam) => (` to `{filteredExams.map((exam) => (`.

Change the empty-state check from `examSchedules.length === 0` to `filteredExams.length === 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/academic/exams/page.tsx"
git commit -m "feat: add search bar to exams page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Payroll employee name/ID visibility fix — Task 1 (backend) + Task 2 (frontend)
- ✅ Search bars on all list pages — Tasks 3–21 covering 20 pages
- ✅ Library extended (Task 11) — existing partial search enhanced
- ✅ Subjects page (Task 20) — text search added on top of existing dept filter

**Placeholder scan:** No TBD/TODO items. All steps include complete code.

**Type consistency:**
- `filteredPayrolls`, `filteredLeaveTypes`, `filteredStudents`, etc. — each named uniquely per page
- `displayed` in subjects (Task 20) is distinct from `filtered` (dept filter result) — no conflict
- Backend: `Preload("EmployeeModel.User")` + `Preload("EmployeeModel.Department")` — consistent across all 3 handlers

**Notes for executor:**
- `input-field` is a CSS class already used throughout the project (defined in globals.css or similar). Use it consistently.
- Some pages may have slightly different `useState` import locations — adjust as needed but the logic is the same.
- The `holidays` page search uses a `displayedByMonth` re-grouping to preserve the calendar structure.
