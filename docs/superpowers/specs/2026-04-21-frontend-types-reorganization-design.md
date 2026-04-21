# Frontend Types Reorganization — Design Spec

**Date:** 2026-04-21
**Status:** Approved

## Goal

Consolidate all TypeScript interfaces and types into a structured `/types` folder in the frontend, split by concern: domain entities, page-specific types, and API payload types. The `/types` folder partially exists; this spec covers completing it and splitting the monolithic `entities.ts` by domain.

## Current State

The `/types` folder exists with:
- `types/general/entities.ts` — ~500-line monolithic file with all shared domain types
- `types/general/moduleConfig.ts` — `CategoryColor`, `ModuleDef`
- `types/pages/{employees,fees,payroll,students,learning}/page.ts` — page-specific + GQL types
- `types/index.ts` — re-exports from `types/general/entities`

Types living outside `/types` that need migrating:
- `api/services/bulk.ts` — 7 types/interfaces for bulk upload
- `api/services/finance.ts` — 3 payload interfaces for salary
- `store/slices/timetableSlice.ts` — 3 exported domain types (not Redux state)

## Target Structure

### `types/general/` — domain-split files

Each file replaces a section of the current `entities.ts`:

| File | Types |
|------|-------|
| `auth.ts` | `Role`, `AuthUser`, `AuthState` |
| `users.ts` | `User` |
| `tenants.ts` | `TenantStatus`, `TenantType`, `Tenant`, `TenantStats` |
| `org.ts` | `OrgProfile`, `CustomRole`, `SetupStatus`, `Department` |
| `academic.ts` | `AcademicYear`, `Semester`, `Course`, `Subject`, `ExamType`, `ExamSchedule` |
| `employees.ts` | `EmployeePaymentDetails`, `Employee` |
| `students.ts` | `Student`, `StudentPortalData` |
| `attendance.ts` | `AttendanceStatus`, `Attendance`, `AttendanceSettings`, `AttendanceSummaryRow`, `ShortageItem` |
| `calendar.ts` | `HolidayType`, `Holiday`, `CalendarSettings`, `CalendarDayType`, `CalendarDay`, `CalendarMonth`, `CalendarEvent` |
| `leaves.ts` | `LeaveTypeConfig`, `LeaveBalance`, `LeaveStatus`, `Leave` |
| `marks.ts` | `Mark` |
| `payroll.ts` | `SalaryStructure`, `Payroll`, `PayrollSummary` |
| `fees.ts` | `FeeCategory`, `FeeStructure`, `FeePayment`, `FeeDue`, `FeeCollectionSummary` |
| `communications.ts` | `Announcement`, `Notification` |
| `dashboard.ts` | `DashboardStats`, `DashboardCharts` |
| `reports.ts` | `AttendanceReportRow`, `AttendanceReport`, `GradeDistributionRow`, `SubjectAvgRow`, `MarksReport`, `LeaveReportMonthRow`, `LeaveReport`, `FeeReportMonthRow`, `FeeReport`, `PayrollReportMonthRow`, `PayrollReport` |
| `subscriptions.ts` | `ALL_MODULES`, `ModuleName`, `SubscriptionPlan`, `TenantSubscription`, `SubscriptionUsage` |
| `hostel.ts` | `HostelBlock`, `HostelRoom`, `HostelAllocation` |
| `transport.ts` | `TransportRoute`, `TransportVehicle`, `TransportAllocation` |
| `library.ts` | `LibraryBook`, `LibraryIssue` |
| `results.ts` | `PublishedResult` |
| `common.ts` | `APIResponse` |
| `moduleConfig.ts` | `CategoryColor`, `ModuleDef` (already exists, unchanged) |

A new `types/general/index.ts` barrel re-exports all domain files. `types/index.ts` is updated to re-export from `types/general/index.ts`.

### `types/api/` — new folder

API payload types extracted from service files:

| File | Types | Source |
|------|-------|--------|
| `bulk.ts` | `BulkFieldType`, `BulkField`, `BulkSchema`, `BulkRowError`, `BulkRowResult`, `BulkSubmitResponse`, `BulkValidateResponse` | `api/services/bulk.ts` |
| `finance.ts` | `SalaryTemplatePayload`, `SalaryAssignmentPayload`, `BulkAssignmentPayload` | `api/services/finance.ts` |

### `types/pages/timetable/page.ts` — new

Domain types currently exported from the Redux slice:

| Types | Source |
|-------|--------|
| `DayOfWeek`, `TimetableSlot`, `TimetableFilter` | `store/slices/timetableSlice.ts` |

### What stays put

- **Redux `*State` interfaces** in store slices — tightly coupled to `createSlice`, not moved.
- **`api/services/bulk.ts`** — keeps its API functions; types are extracted but the file re-exports them from `types/api/bulk.ts` so existing consumer imports are unaffected.
- **`api/services/finance.ts`** — same pattern: types extracted, re-exported from the service file.
- **`store/slices/timetableSlice.ts`** — imports `DayOfWeek`, `TimetableSlot`, `TimetableFilter` from `types/pages/timetable/page.ts` after the move.

## Import Strategy

Consumers are not broken. Source files that previously defined types now import from `/types` and re-export:

```ts
// api/services/bulk.ts (after)
export type { BulkFieldType, BulkField, BulkSchema, ... } from "@/types/api/bulk";
```

This means existing imports like `from "@/api/services/bulk"` continue to work without touching every consumer.

The timetable page component already imports `DayOfWeek` from `"@/store/slices/timetableSlice"` — the slice will re-export it from the new types location, so that import also stays valid.

## Cross-file Dependencies

Some domain types reference others (e.g. `Employee` references `User` and `Department`, `Student` references `User` and `Course`). These are handled via imports within the `types/general/` files:

```ts
// types/general/employees.ts
import type { User } from "./users";
import type { Department } from "./org";
```

## Edge Cases

- `types/pages/learning/page.ts` contains helper functions (`flattenItems`, `computeLockedMap`, `progressStats`, `emptyQuestionForm`) alongside types. These stay in the page types file — they are tightly coupled to the learning types and only used in the learning module.
- `types/pages/fees/page.ts` currently only has `FeesTab` — it stays as-is.

## Out of Scope

- GraphQL query/mutation strings in `graphql/` — not types
- Redux slice logic — only the exported domain types are moved
- `constants/`, `functions/`, `lib/` — no standalone type definitions found there
