# StepElly Postman Collection — Design Spec

**Date:** 2026-04-19  
**Status:** Approved  
**Scope:** Complete Postman collection for all REST and GraphQL APIs in the StepElly backend.

---

## 1. Overview

A single Postman Collection v2.1 JSON file covering ~180 requests across all StepElly API surfaces, accompanied by three environment files for different user roles. The collection is a static, importable artifact committed to the repo under `postman/`.

---

## 2. Output Files

```
postman/
  CollERP.postman_collection.json        ← single importable collection (~180 requests)
  StepElly.super_admin.postman_env.json   ← super_admin credentials + baseUrl
  StepElly.admin.postman_env.json         ← tenant admin credentials + baseUrl
  StepElly.student.postman_env.json       ← student credentials + baseUrl
```

---

## 3. Environment Variables

Each environment file defines the following variables:

| Variable | Description |
|---|---|
| `baseUrl` | API base URL, e.g. `http://localhost:3001/api/v1` |
| `subdomain` | Tenant subdomain used for tenant lookup |
| `loginEmail` | Role-specific login email |
| `loginPassword` | Role-specific login password |
| `authToken` | Auto-populated by the collection pre-request script |
| `tenantId` | Populated during super admin tenant flows |
| `employeeId` | Populated after POST /employees or createEmployee mutation |
| `studentId` | Populated after POST /students or createStudent mutation |
| `userId` | Populated after POST /users or createUser mutation |
| `departmentId` | Populated after POST /org/departments |
| `courseId` | Populated after POST /courses |
| `subjectId` | Populated after POST /subjects |
| `examScheduleId` | Populated after POST /exams |
| `markId` | Populated after POST /marks |
| `leaveId` | Populated after POST /leaves |
| `leaveTypeId` | Populated after POST /leave-types |
| `salaryStructureId` | Populated after POST /salary-structures |
| `payrollId` | Populated after POST /payroll/generate |
| `feeCategoryId` | Populated after POST /fee-categories |
| `feeStructureId` | Populated after POST /fee-structures |
| `feePaymentId` | Populated after POST /fee-payments |
| `announcementId` | Populated after POST /announcements |
| `notificationId` | Populated after POST /notifications |
| `timetableSlotId` | Populated after POST /timetable |
| `eventId` | Populated after POST /events |
| `hostelBlockId` | Populated after POST /hostels/blocks |
| `hostelRoomId` | Populated after POST /hostels/rooms |
| `hostelAllocationId` | Populated after POST /hostels/allocations |
| `transportRouteId` | Populated after POST /transport/routes |
| `vehicleId` | Populated after POST /transport/vehicles |
| `bookId` | Populated after POST /library/books |
| `planId` | Populated after POST /super/plans |
| `academicYearId` | Populated after POST /org/academic-years |
| `semesterId` | Populated after POST /org/semesters |
| `roleId` | Populated after POST /org/roles |

---

## 4. Collection-Level Pre-Request Script

Runs before every request. Logic:

1. Read `authToken` from the current environment.
2. If present, decode the JWT payload (base64 split on `.`) and check the `exp` claim against `Date.now() / 1000`.
3. If missing or expired, fire a synchronous `pm.sendRequest` to `POST {{baseUrl}}/auth/login` with `{"email": "{{loginEmail}}", "password": "{{loginPassword}}"}`.
4. On success, write `response.token` to `pm.environment.set("authToken", token)`.
5. All requests use `Authorization: Bearer {{authToken}}` — set as a collection-level header.

---

## 5. Collection Structure

```
StepElly API
├── REST
│   ├── Auth
│   │   ├── POST   Login
│   │   ├── GET    Me
│   │   ├── PUT    Update My Profile
│   │   └── PUT    Change Password
│   ├── Tenant
│   │   └── GET    Lookup Tenant by Subdomain (public)
│   ├── Super Admin
│   │   ├── GET    Platform Stats
│   │   ├── Tenants
│   │   │   ├── GET    List Tenants
│   │   │   ├── POST   Create Tenant
│   │   │   ├── GET    Get Tenant
│   │   │   ├── PUT    Update Tenant
│   │   │   ├── PATCH  Update Tenant Status
│   │   │   ├── POST   Impersonate Tenant
│   │   │   └── DELETE Hard Delete Tenant
│   │   ├── Admins
│   │   │   ├── GET    List Super Admins
│   │   │   ├── POST   Create Super Admin
│   │   │   ├── PUT    Update Super Admin
│   │   │   └── DELETE Delete Super Admin
│   │   ├── Plans
│   │   │   ├── GET    List Plans
│   │   │   ├── POST   Create Plan
│   │   │   ├── PUT    Update Plan
│   │   │   └── DELETE Delete Plan
│   │   └── Subscriptions
│   │       ├── GET    List Subscriptions
│   │       ├── GET    Get Tenant Subscription
│   │       ├── POST   Assign Subscription
│   │       └── PATCH  Update Subscription Status
│   ├── Org Admin
│   │   ├── GET    Org Profile
│   │   ├── PUT    Update Org Profile
│   │   ├── GET    Setup Status
│   │   ├── GET    My Subscription
│   │   ├── Departments
│   │   │   ├── GET    List Departments
│   │   │   ├── POST   Create Department
│   │   │   ├── PUT    Update Department
│   │   │   └── DELETE Delete Department
│   │   ├── Academic Years
│   │   │   ├── GET    List Academic Years
│   │   │   ├── POST   Create Academic Year
│   │   │   ├── PUT    Update Academic Year
│   │   │   └── PATCH  Set Current Academic Year
│   │   ├── Semesters
│   │   │   ├── GET    List Semesters
│   │   │   └── POST   Create Semester
│   │   └── Roles
│   │       ├── GET    List Custom Roles
│   │       ├── POST   Create Custom Role
│   │       ├── PUT    Update Custom Role
│   │       └── DELETE Delete Custom Role
│   ├── Users
│   │   ├── GET    List Users
│   │   ├── POST   Create User
│   │   ├── PUT    Update User
│   │   └── DELETE Delete User
│   ├── Employees
│   │   ├── GET    List Employees
│   │   ├── GET    Get Employee
│   │   ├── POST   Create Employee
│   │   ├── PUT    Update Employee
│   │   └── DELETE Delete Employee
│   ├── Students
│   │   ├── GET    List Students
│   │   ├── GET    Get Student
│   │   ├── GET    My Student Profile
│   │   ├── POST   Create Student
│   │   ├── PUT    Update Student
│   │   ├── DELETE Delete Student
│   │   └── POST   Bulk Import Students
│   ├── Courses
│   │   ├── GET    List Courses
│   │   └── POST   Create Course
│   ├── Attendance
│   │   ├── GET    List Attendance
│   │   ├── GET    Attendance Summary
│   │   ├── GET    Shortage List
│   │   ├── GET    Attendance Settings
│   │   ├── PUT    Update Attendance Settings
│   │   ├── POST   Mark Attendance
│   │   ├── POST   Bulk Mark Attendance
│   │   └── POST   Export Attendance CSV
│   ├── Holidays
│   │   ├── GET    List Holidays
│   │   ├── POST   Create Holiday
│   │   └── DELETE Delete Holiday
│   ├── Marks & Results
│   │   ├── GET    List Marks
│   │   ├── POST   Create Mark
│   │   ├── PUT    Update Mark
│   │   ├── PATCH  Publish Results
│   │   ├── GET    Published Results
│   │   └── GET    Result Summary
│   ├── Subjects
│   │   ├── GET    List Subjects
│   │   ├── POST   Create Subject
│   │   ├── PUT    Update Subject
│   │   └── DELETE Delete Subject
│   ├── Exam Schedules
│   │   ├── GET    List Exam Schedules
│   │   ├── POST   Create Exam Schedule
│   │   ├── PUT    Update Exam Schedule
│   │   ├── PATCH  Publish Exam Schedule
│   │   └── DELETE Delete Exam Schedule
│   ├── Leaves
│   │   ├── Leave Types
│   │   │   ├── GET    List Leave Types
│   │   │   ├── POST   Create Leave Type
│   │   │   ├── PUT    Update Leave Type
│   │   │   └── DELETE Delete Leave Type
│   │   ├── Leave Balances
│   │   │   ├── GET    List Leave Balances (admin)
│   │   │   └── GET    My Leave Balance
│   │   └── Leave Applications
│   │       ├── GET    List Leaves
│   │       ├── POST   Apply Leave
│   │       └── PUT    Review Leave
│   ├── Salary & Payroll
│   │   ├── Salary Structures
│   │   │   ├── GET    List Salary Structures
│   │   │   ├── POST   Create Salary Structure
│   │   │   ├── PUT    Update Salary Structure
│   │   │   └── DELETE Delete Salary Structure
│   │   └── Payroll
│   │       ├── GET    List Payrolls (admin)
│   │       ├── GET    My Payrolls
│   │       ├── GET    Payroll Summary
│   │       ├── POST   Generate Payroll
│   │       ├── PATCH  Update Payroll Status
│   │       └── DELETE Delete Payroll
│   ├── Fees
│   │   ├── Fee Categories
│   │   │   ├── GET    List Fee Categories
│   │   │   ├── POST   Create Fee Category
│   │   │   ├── PUT    Update Fee Category
│   │   │   └── DELETE Delete Fee Category
│   │   ├── Fee Structures
│   │   │   ├── GET    List Fee Structures
│   │   │   ├── POST   Create Fee Structure
│   │   │   ├── PUT    Update Fee Structure
│   │   │   └── DELETE Delete Fee Structure
│   │   └── Fee Payments
│   │       ├── GET    List Fee Payments
│   │       ├── GET    My Fee Payments
│   │       ├── POST   Record Fee Payment
│   │       ├── PATCH  Update Payment Status
│   │       ├── GET    Outstanding Dues
│   │       └── GET    Fee Collection Summary
│   ├── Announcements
│   │   ├── GET    List Announcements (role-filtered)
│   │   ├── GET    List All Announcements (admin)
│   │   ├── POST   Create Announcement
│   │   ├── PUT    Update Announcement
│   │   └── DELETE Delete Announcement
│   ├── Notifications
│   │   ├── GET    My Notifications
│   │   ├── GET    Unread Count
│   │   ├── POST   Send Notification (admin)
│   │   ├── PATCH  Mark All Read
│   │   ├── PATCH  Mark One Read
│   │   └── DELETE Delete Notification
│   ├── Reports
│   │   ├── GET    Dashboard Stats
│   │   ├── GET    Dashboard Charts
│   │   ├── GET    Attendance Report
│   │   ├── GET    Marks Report
│   │   ├── GET    Leave Report
│   │   ├── GET    Fee Report
│   │   └── GET    Payroll Report
│   ├── Timetable
│   │   ├── GET    List Timetable
│   │   ├── POST   Create Timetable Slot
│   │   ├── POST   Bulk Create Timetable Slots
│   │   ├── PUT    Update Timetable Slot
│   │   └── DELETE Delete Timetable Slot
│   ├── Events
│   │   ├── GET    List Events
│   │   ├── POST   Create Event
│   │   ├── GET    Get Event
│   │   ├── PUT    Update Event
│   │   └── DELETE Delete Event
│   ├── Hostel
│   │   ├── Blocks
│   │   │   ├── GET    List Hostel Blocks
│   │   │   └── POST   Create Hostel Block
│   │   ├── Rooms
│   │   │   ├── GET    List Hostel Rooms
│   │   │   ├── POST   Create Hostel Room
│   │   │   └── PUT    Update Hostel Room
│   │   └── Allocations
│   │       ├── GET    List Hostel Allocations
│   │       ├── POST   Allocate Hostel Room
│   │       └── PUT    Vacate Hostel Room
│   ├── Transport
│   │   ├── Routes
│   │   │   ├── GET    List Routes
│   │   │   ├── POST   Create Route
│   │   │   ├── PUT    Update Route
│   │   │   └── DELETE Delete Route
│   │   ├── Vehicles
│   │   │   ├── GET    List Vehicles
│   │   │   ├── POST   Create Vehicle
│   │   │   ├── PUT    Update Vehicle
│   │   │   └── DELETE Delete Vehicle
│   │   └── Allocations
│   │       ├── GET    List Transport Allocations
│   │       ├── POST   Allocate Transport
│   │       └── PUT    Remove Transport Allocation
│   └── Library
│       ├── Books
│       │   ├── GET    List Books
│       │   ├── POST   Create Book
│       │   ├── PUT    Update Book
│       │   └── DELETE Delete Book
│       └── Issues
│           ├── GET    List Issues
│           ├── POST   Issue Book
│           ├── PUT    Return Book
│           └── GET    Overdue Books
└── GraphQL
    ├── Queries
    │   ├── GET    health
    │   ├── Employees & Departments
    │   │   ├── Query: employees
    │   │   ├── Query: employee (by ID)
    │   │   ├── Query: departments
    │   │   └── Query: users
    │   ├── Payroll
    │   │   ├── Query: salaryStructures
    │   │   ├── Query: payrolls
    │   │   ├── Query: myPayrolls
    │   │   └── Query: payrollSummary
    │   ├── Students & Courses
    │   │   ├── Query: students
    │   │   ├── Query: student (by ID)
    │   │   └── Query: courses
    │   ├── Subjects & Academic
    │   │   ├── Query: subjects
    │   │   ├── Query: subject (by ID)
    │   │   ├── Query: academicYears
    │   │   └── Query: examSchedules
    │   ├── Marks & Results
    │   │   ├── Query: marks
    │   │   ├── Query: publishedResults
    │   │   └── Query: resultSummary
    │   ├── Attendance
    │   │   ├── Query: attendance
    │   │   ├── Query: attendanceSummary
    │   │   └── Query: attendanceShortage
    │   ├── Leaves
    │   │   ├── Query: leaves
    │   │   ├── Query: leaveTypes
    │   │   ├── Query: myLeaveBalance
    │   │   └── Query: leaveBalances
    │   ├── Fees
    │   │   ├── Query: feeCategories
    │   │   ├── Query: feeStructures
    │   │   ├── Query: feePayments
    │   │   ├── Query: myFeePayments
    │   │   ├── Query: feeDues
    │   │   └── Query: feeCollectionSummary
    │   ├── Dashboard & Reports
    │   │   ├── Query: dashboardStats
    │   │   ├── Query: attendanceReport
    │   │   ├── Query: marksReport
    │   │   ├── Query: leaveReport
    │   │   ├── Query: feeReport
    │   │   └── Query: payrollReport
    │   ├── Timetable
    │   │   └── Query: timetable
    │   └── Events & Comms
    │       ├── Query: events
    │       ├── Query: announcements
    │       ├── Query: allAnnouncements
    │       ├── Query: myNotifications
    │       └── Query: unreadNotificationCount
    └── Mutations
        ├── Employees & Departments
        │   ├── Mutation: createEmployee
        │   ├── Mutation: deleteEmployee
        │   ├── Mutation: createDepartment
        │   ├── Mutation: createUser
        │   └── Mutation: deactivateUser
        ├── Payroll
        │   ├── Mutation: createSalaryStructure
        │   ├── Mutation: updateSalaryStructure
        │   ├── Mutation: deleteSalaryStructure
        │   ├── Mutation: generatePayroll
        │   ├── Mutation: updatePayrollStatus
        │   └── Mutation: deletePayroll
        ├── Students & Subjects
        │   ├── Mutation: createStudent
        │   ├── Mutation: deleteStudent
        │   ├── Mutation: createSubject
        │   ├── Mutation: updateSubject
        │   └── Mutation: deleteSubject
        ├── Exam Schedules
        │   ├── Mutation: createExamSchedule
        │   ├── Mutation: updateExamSchedule
        │   ├── Mutation: publishExamSchedule
        │   └── Mutation: deleteExamSchedule
        ├── Marks & Results
        │   ├── Mutation: createMark
        │   └── Mutation: publishResults
        ├── Attendance
        │   ├── Mutation: markAttendance
        │   └── Mutation: bulkMarkAttendance
        ├── Leaves
        │   ├── Mutation: applyLeave
        │   ├── Mutation: reviewLeave
        │   ├── Mutation: createLeaveType
        │   ├── Mutation: updateLeaveType
        │   └── Mutation: deleteLeaveType
        ├── Fees
        │   ├── Mutation: createFeeCategory
        │   ├── Mutation: updateFeeCategory
        │   ├── Mutation: deleteFeeCategory
        │   ├── Mutation: createFeeStructure
        │   ├── Mutation: updateFeeStructure
        │   ├── Mutation: deleteFeeStructure
        │   ├── Mutation: recordFeePayment
        │   └── Mutation: updateFeePaymentStatus
        ├── Timetable
        │   ├── Mutation: createTimetableSlot
        │   ├── Mutation: updateTimetableSlot
        │   ├── Mutation: deleteTimetableSlot
        │   └── Mutation: bulkCreateTimetableSlots
        └── Events & Comms
            ├── Mutation: createEvent
            ├── Mutation: updateEvent
            ├── Mutation: deleteEvent
            ├── Mutation: createAnnouncement
            ├── Mutation: updateAnnouncement
            ├── Mutation: deleteAnnouncement
            ├── Mutation: markNotificationRead
            ├── Mutation: markAllNotificationsRead
            ├── Mutation: deleteNotification
            └── Mutation: sendNotification
```

**Total: ~87 REST requests + ~96 GraphQL requests = ~183 requests**

---

## 6. Test Script Pattern (per request)

Three layers applied to every request:

### Layer 1 — Status Code
```js
pm.test("Status is 200", () => pm.response.to.have.status(200));
```

### Layer 2 — Response Shape
```js
pm.test("Response has required fields", () => {
  const body = pm.response.json();
  pm.expect(body).to.have.property("id");
  pm.expect(body.id).to.be.a("string");
});
```

### Layer 3 — Business Logic + Variable Capture
```js
pm.test("Employment type is valid", () => {
  const valid = ["full_time", "part_time", "contract", "visiting"];
  pm.expect(valid).to.include(pm.response.json().employmentType);
});
pm.environment.set("employeeId", pm.response.json().id);
```

Chaining order within each domain folder: CREATE → GET → UPDATE → DELETE.

### GraphQL Error Guard (all GraphQL requests)
```js
pm.test("No GraphQL errors", () => {
  const body = pm.response.json();
  pm.expect(body).to.not.have.property("errors");
  pm.expect(body.data).to.not.be.null;
});
```

---

## 7. GraphQL Request Format

- Method: `POST {{baseUrl}}/graphql`
- Headers: `Content-Type: application/json`, `Authorization: Bearer {{authToken}}`
- Body: `{"query": "...", "variables": {...}}`
- Variables reference environment variables (e.g. `"id": "{{employeeId}}"`)
- All optional arguments are shown in the query with a comment marking them optional

---

## 8. Implementation Approach

Handwritten Postman Collection v2.1 JSON — single static file, no generator scripts, no external dependencies. Importable directly into Postman desktop or usable with Newman for CI.

---

## 9. Auth Folder Exception

The `REST > Auth > Login` request does **not** use the collection-level pre-request script (it would cause infinite recursion). The pre-request script must check `pm.info.requestName !== "Login"` before firing the auto-auth logic. Other Auth requests (Me, Update Profile, Change Password) do use the script normally.

---

## 10. Out of Scope

- Newman CI integration script (separate task)
- Mock server setup
- OAuth2 flows (StepElly uses JWT bearer only)
- WebSocket or SSE endpoints
