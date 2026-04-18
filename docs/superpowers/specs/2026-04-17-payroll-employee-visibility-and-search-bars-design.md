# Design: Payroll Employee Visibility Fix + Search Bars on List Pages

**Date:** 2026-04-17  
**Status:** Approved

---

## Problem 1 — Payroll Page: Employee Name & ID Not Visible

### Root Cause

`backend/models/payroll.go` — the `EmployeeModel` field has `json:"-"`:

```go
EmployeeModel Employee `gorm:"foreignKey:EmployeeID" json:"-"`
```

GORM preloads the employee but `json:"-"` excludes it from serialization. The frontend always receives `null` for `p.employee`, so both name and department show `—`.

The employee's custom string ID (e.g. "EMP001") is a separate field `employee_id` on the Employee model — never displayed in the payroll table.

### Fix

**Backend — `backend/models/payroll.go`:**
- Change `json:"-"` → `json:"employee"` on `EmployeeModel`

**Backend — `backend/handlers/salary.go`:**
- `ListPayrolls`: Change `Preload("EmployeeModel")` → `Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department")`
- `GetPayrollSummary`: Same deep-preload chain
- `GetMyPayrolls`: Add `Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department")`

**Frontend — `frontend/app/[tenant]/(dashboard)/payroll/page.tsx`:**
- In the Employee `<td>`, add a second sub-line showing `p.employee?.employee_id` (the custom EMP001-style ID) below the name

---

## Problem 2 — Search Bars on All List Pages

### Approach

Client-side filtering. Each page gets a `searchQuery` state, filters its already-loaded data across all visible text fields, and renders an `<input className="input-field">` above the table.

### Pattern

```tsx
const [search, setSearch] = useState('')

const filtered = rawData.filter(item =>
  [field1, field2, field3].some(v =>
    String(v ?? '').toLowerCase().includes(search.toLowerCase())
  )
)

// In JSX — placed in the filters/header row:
<input
  className="input-field"
  placeholder="Search..."
  value={search}
  onChange={e => setSearch(e.target.value)}
/>
```

### Pages & Search Fields

| Page | File | Fields to search |
|------|------|-----------------|
| Payroll | `payroll/page.tsx` | employee name, employee_id, department, status, period (month+year) |
| Salary Structures | `salary-structures/page.tsx` | employee name, status, effective date |
| Employees | `employees/page.tsx` | name, email, department, designation, phone |
| Leaves | `leaves/page.tsx` | applicant name, leave type, reason, status |
| Users | `users/page.tsx` | name, email, role |
| Students | `students/page.tsx` | name, email, roll number, class/section |
| Attendance | `attendance/page.tsx` | employee/student name, status, date |
| Fees | `fees/page.tsx` | student name, fee type, status |
| Hostel | `hostel/page.tsx` | student name, room, block |
| Library | `library/page.tsx` | book title, member name, status |
| Marks | `marks/page.tsx` | student name, subject, exam |
| Results | `results/page.tsx` | student name, grade, exam |
| Events | `events/page.tsx` | title, type, date |
| Transport | `transport/page.tsx` | route, driver, status |
| Timetable | `timetable/page.tsx` | subject, teacher, class |
| Announcements | `announcements/page.tsx` | title, content, author |
| Leave Types | `leave-types/page.tsx` | name, code |
| Org / Roles | `org/roles/page.tsx` | name, description |
| Org / Departments | `org/departments/page.tsx` | name, code |
| Org / Holidays | `org/holidays/page.tsx` | name, date, type |
| Academic / Subjects | `academic/subjects/page.tsx` | name, code |
| Academic / Exams | `academic/exams/page.tsx` | name, type, date |

### UI Notes

- Search input uses existing `input-field` CSS class for consistency
- Placed in the top filter/header area of each page (alongside any existing filters)
- No debounce needed — data is already loaded client-side
- Empty state message unchanged when search produces no results
