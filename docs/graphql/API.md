# Peepal GraphQL API

**Endpoint:** `POST http://localhost:3001/api/v1/graphql`  
**Playground:** `GET  http://localhost:3001/api/v1/graphql` *(dev only)*

---

## Authentication

All queries and mutations (except health) require a Bearer token obtained from the REST login endpoint.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@college.edu",
  "password": "yourpassword"
}
```

Use the returned token in every GraphQL request:

```http
POST /api/v1/graphql
Content-Type: application/json
Authorization: Bearer <token>
```

### Postman setup

1. Set the request URL to `http://localhost:3001/api/v1/graphql`
2. Method: **POST**
3. Body tab → **GraphQL** → click **Refresh Schema** (no token needed for schema loading)
4. Headers tab → add `Authorization: Bearer <token>` before running queries

---

## Request format

Every request is a JSON body with a `query` string and an optional `variables` map.

```json
{
  "query": "query { employees { id employeeId user { name email } } }",
  "variables": {}
}
```

Mutations follow the same shape:

```json
{
  "query": "mutation CreateEmployee($input: CreateEmployeeInput!) { createEmployee(input: $input) { id } }",
  "variables": {
    "input": { "userId": "...", "employeeId": "EMP001" }
  }
}
```

---

## Domains

- [Health](#health)
- [Employees](#employees)
- [Departments](#departments)
- [Users](#users)
- [Payroll](#payroll)
- [Students](#students)
- [Subjects](#subjects)
- [Academic Years](#academic-years)
- [Exam Schedules](#exam-schedules)
- [Marks & Results](#marks--results)
- [Attendance](#attendance)
- [Leaves](#leaves)
- [Fees](#fees)
- [Timetable](#timetable)
- [Events](#events)
- [Announcements](#announcements)
- [Notifications](#notifications)
- [Dashboard & Reports](#dashboard--reports)

---

## Health

```graphql
query {
  health
}
```

**Response**
```json
{ "data": { "health": true } }
```

---

## Employees

### List all employees

```graphql
query {
  employees {
    id
    employeeId
    designation
    employmentType
    joinDate
    user {
      name
      email
      role
    }
    department {
      id
      name
    }
    paymentDetails {
      bankName
      accountNumber
      pfNumber
    }
  }
}
```

### Get a single employee

```graphql
query GetEmployee($id: ID!) {
  employee(id: $id) {
    id
    employeeId
    designation
    phone
    gender
    joinDate
    user { name email }
    department { name }
  }
}
```

**Variables**
```json
{ "id": "emp-uuid-here" }
```

### Create an employee

> Requires an existing user account. Create the user first if needed.

```graphql
mutation CreateEmployee($input: CreateEmployeeInput!) {
  createEmployee(input: $input) {
    id
    employeeId
    user { name email }
  }
}
```

**Variables**
```json
{
  "input": {
    "userId": "user-uuid",
    "employeeId": "EMP001",
    "departmentId": "dept-uuid",
    "designation": "Associate Professor",
    "phone": "9876543210",
    "joinDate": "2024-07-01",
    "dateOfBirth": "1985-03-15",
    "gender": "Male",
    "employmentType": "full_time",
    "gradeLevel": "L3",
    "paymentDetails": {
      "bankName": "HDFC Bank",
      "accountNumber": "123456789",
      "accountType": "savings",
      "ifscCode": "HDFC0001234",
      "pfNumber": "PF12345",
      "uanNumber": "UAN98765",
      "panNumber": "ABCDE1234F",
      "taxRegime": "new"
    }
  }
}
```

### Delete an employee

```graphql
mutation DeleteEmployee($id: ID!) {
  deleteEmployee(id: $id)
}
```

**Variables**
```json
{ "id": "emp-uuid" }
```

---

## Departments

### List departments

```graphql
query {
  departments {
    id
    name
  }
}
```

### Create a department

```graphql
mutation CreateDepartment($input: CreateDepartmentInput!) {
  createDepartment(input: $input) {
    id
    name
  }
}
```

**Variables**
```json
{ "input": { "name": "Computer Science" } }
```

---

## Users

### List users

```graphql
query {
  users {
    id
    name
    email
    role
    isActive
  }
}
```

### Create a user

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    role
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Priya Sharma",
    "email": "priya@college.edu",
    "password": "SecurePass@123",
    "role": "teacher"
  }
}
```

> **Roles:** `admin` | `teacher` | `staff` | `student`

### Deactivate a user

```graphql
mutation DeactivateUser($id: ID!) {
  deactivateUser(id: $id)
}
```

**Variables**
```json
{ "id": "user-uuid" }
```

---

## Payroll

### Salary structures

#### List salary structures

```graphql
query SalaryStructures($employeeId: ID) {
  salaryStructures(employeeId: $employeeId) {
    id
    basicSalary
    hra
    da
    ta
    grossSalary: basicSalary
    pf
    esi
    tds
    effectiveFrom
    isActive
    employee { user { name } }
  }
}
```

**Variables** *(optional — omit to list all)*
```json
{ "employeeId": "emp-uuid" }
```

#### Create a salary structure

```graphql
mutation CreateSalaryStructure($input: CreateSalaryStructureInput!) {
  createSalaryStructure(input: $input) {
    id
    basicSalary
    effectiveFrom
    isActive
  }
}
```

**Variables**
```json
{
  "input": {
    "employeeId": "emp-uuid",
    "basicSalary": 60000,
    "hra": 15000,
    "da": 3000,
    "ta": 2000,
    "medicalAllowance": 1250,
    "pf": 7200,
    "esi": 1125,
    "tds": 5000,
    "effectiveFrom": "2025-01-01"
  }
}
```

#### Update a salary structure

```graphql
mutation UpdateSalaryStructure($id: ID!, $input: UpdateSalaryStructureInput!) {
  updateSalaryStructure(id: $id, input: $input) {
    id
    basicSalary
  }
}
```

**Variables**
```json
{
  "id": "structure-uuid",
  "input": { "basicSalary": 65000, "hra": 16250 }
}
```

#### Delete a salary structure

```graphql
mutation DeleteSalaryStructure($id: ID!) {
  deleteSalaryStructure(id: $id)
}
```

---

### Payroll records

#### List payrolls

```graphql
query Payrolls($month: Int, $year: Int, $status: String) {
  payrolls(month: $month, year: $year, status: $status) {
    id
    month
    year
    basicSalary
    grossSalary
    totalDeductions
    netSalary
    status
    paymentDate
    employee { user { name } employeeId }
  }
}
```

**Variables**
```json
{ "month": 4, "year": 2025, "status": "draft" }
```

> **Status values:** `draft` | `approved` | `paid`

#### My payrolls (for authenticated employee)

```graphql
query {
  myPayrolls {
    id
    month
    year
    netSalary
    status
    paymentDate
  }
}
```

#### Payroll summary

```graphql
query PayrollSummary($month: Int, $year: Int) {
  payrollSummary(month: $month, year: $year) {
    totalEmployees
    totalGross
    totalDeductions
    totalNet
    draftCount
    approvedCount
    paidCount
  }
}
```

**Variables**
```json
{ "month": 4, "year": 2025 }
```

#### Generate payroll

```graphql
mutation GeneratePayroll($input: GeneratePayrollInput!) {
  generatePayroll(input: $input) {
    id
    month
    year
    grossSalary
    netSalary
    status
  }
}
```

**Variables**
```json
{
  "input": {
    "employeeId": "emp-uuid",
    "month": 4,
    "year": 2025,
    "workingDays": 26,
    "presentDays": 24,
    "leaveDays": 2
  }
}
```

#### Update payroll status

```graphql
mutation UpdatePayrollStatus($id: ID!, $input: UpdatePayrollStatusInput!) {
  updatePayrollStatus(id: $id, input: $input) {
    id
    status
    paymentDate
    paymentMode
  }
}
```

**Variables — approve**
```json
{
  "id": "payroll-uuid",
  "input": { "status": "approved" }
}
```

**Variables — mark paid**
```json
{
  "id": "payroll-uuid",
  "input": {
    "status": "paid",
    "paymentDate": "2025-04-30",
    "paymentMode": "bank_transfer"
  }
}
```

---

## Students

### List students

```graphql
query Students($courseId: String, $semester: Int) {
  students(courseId: $courseId, semester: $semester) {
    id
    rollNumber
    section
    semester
    batch
    admissionStatus
    user { name email }
    course { name code }
  }
}
```

**Variables** *(all optional)*
```json
{ "courseId": "course-uuid", "semester": 3 }
```

### Get a single student

```graphql
query GetStudent($id: ID!) {
  student(id: $id) {
    id
    rollNumber
    section
    semester
    phone
    dateOfBirth
    fatherName
    motherName
    user { name email }
    course { name }
  }
}
```

### Create a student

```graphql
mutation CreateStudent($input: CreateStudentInput!) {
  createStudent(input: $input) {
    id
    rollNumber
    user { name }
    course { name }
  }
}
```

**Variables**
```json
{
  "input": {
    "userId": "user-uuid",
    "courseId": "course-uuid",
    "rollNumber": "CS2024001",
    "section": "A",
    "semester": 1,
    "batch": "2024-2028",
    "enrollDate": "2024-07-15",
    "admissionStatus": "active"
  }
}
```

### List courses

```graphql
query {
  courses {
    id
    name
    code
  }
}
```

---

## Subjects

### List subjects

```graphql
query Subjects($departmentId: String, $search: String) {
  subjects(departmentId: $departmentId, search: $search) {
    id
    name
    code
    credits
    semesterNumber
    teachingHours
    department { name }
  }
}
```

### Create a subject

```graphql
mutation CreateSubject($input: CreateSubjectInput!) {
  createSubject(input: $input) {
    id
    name
    code
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Data Structures and Algorithms",
    "code": "CS301",
    "departmentId": "dept-uuid",
    "credits": 4,
    "teachingHours": 4,
    "labHours": 2,
    "semesterNumber": 3
  }
}
```

### Update a subject

```graphql
mutation UpdateSubject($id: ID!, $input: UpdateSubjectInput!) {
  updateSubject(id: $id, input: $input) {
    id
    name
    credits
  }
}
```

**Variables**
```json
{
  "id": "subject-uuid",
  "input": { "credits": 5, "teachingHours": 5 }
}
```

---

## Academic Years

### List academic years

```graphql
query {
  academicYears {
    id
    name
    startDate
    endDate
    isCurrent
  }
}
```

---

## Exam Schedules

### List exam schedules

```graphql
query ExamSchedules($semesterNumber: Int, $examType: String) {
  examSchedules(semesterNumber: $semesterNumber, examType: $examType) {
    id
    name
    examType
    semesterNumber
    startDate
    endDate
    published
    instructions
  }
}
```

**Variables** *(all optional)*
```json
{ "semesterNumber": 3, "examType": "internal" }
```

> **Exam types:** `internal` | `external` | `practical`

### Create an exam schedule

```graphql
mutation CreateExamSchedule($input: CreateExamScheduleInput!) {
  createExamSchedule(input: $input) {
    id
    name
    examType
    published
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Mid-Semester Nov 2025",
    "examType": "internal",
    "semesterNumber": 3,
    "startDate": "2025-11-10",
    "endDate": "2025-11-20",
    "instructions": "Bring hall ticket and college ID.",
    "academicYearId": "ay-uuid"
  }
}
```

### Publish / unpublish a schedule

```graphql
mutation PublishExamSchedule($id: ID!, $published: Boolean!) {
  publishExamSchedule(id: $id, published: $published) {
    id
    published
  }
}
```

**Variables**
```json
{ "id": "schedule-uuid", "published": true }
```

---

## Marks & Results

### Query marks

```graphql
query Marks($studentId: String, $examType: String, $semester: Int) {
  marks(studentId: $studentId, examType: $examType, semester: $semester) {
    id
    subject
    examType
    semester
    marksObtained
    maxMarks
    grade
    status
    isPublished
    student { rollNumber user { name } }
  }
}
```

### Create a mark entry

```graphql
mutation CreateMark($input: CreateMarkInput!) {
  createMark(input: $input) {
    id
    subject
    marksObtained
    grade
  }
}
```

**Variables**
```json
{
  "input": {
    "studentId": "student-uuid",
    "subject": "Data Structures",
    "subjectId": "subject-uuid",
    "examType": "internal",
    "semester": 3,
    "marksObtained": 42,
    "maxMarks": 50,
    "assessmentType": "internal",
    "academicYearId": "ay-uuid"
  }
}
```

### Published results (student-facing)

```graphql
query PublishedResults($examType: String, $semester: Int, $courseId: String) {
  publishedResults(examType: $examType, semester: $semester, courseId: $courseId) {
    subject
    marksObtained
    maxMarks
    grade
    status
    student { rollNumber user { name } }
  }
}
```

### Result summary

```graphql
query ResultSummary($courseId: String!, $semester: Int!) {
  resultSummary(courseId: $courseId, semester: $semester) {
    totalStudents
    passCount
    failCount
  }
}
```

**Variables**
```json
{ "courseId": "course-uuid", "semester": 3 }
```

### Publish results

```graphql
mutation PublishResults($input: PublishResultsInput!) {
  publishResults(input: $input)
}
```

**Variables** *(all optional — omit to publish all)*
```json
{
  "input": {
    "examType": "internal",
    "semester": 3,
    "courseId": "course-uuid"
  }
}
```

Returns the count of records published.

---

## Attendance

### Query attendance records

```graphql
query Attendance($entityType: String, $date: String) {
  attendance(entityType: $entityType, date: $date) {
    id
    entityId
    entityType
    date
    status
    markedBy
    remarks
  }
}
```

**Variables**
```json
{ "entityType": "student", "date": "2025-04-19" }
```

> **Status values:** `present` | `absent` | `late`

### Attendance summary

```graphql
query AttendanceSummary($entityType: String) {
  attendanceSummary(entityType: $entityType) {
    entityId
    total
    present
    absent
    late
    attendancePct
  }
}
```

### Attendance shortage list

```graphql
query {
  attendanceShortage {
    threshold
    count
    students {
      attendancePct
      total
      present
      student {
        rollNumber
        user { name }
        course { name }
      }
    }
  }
}
```

### Mark attendance (single)

```graphql
mutation MarkAttendance($input: MarkAttendanceInput!) {
  markAttendance(input: $input) {
    id
    entityId
    date
    status
  }
}
```

**Variables**
```json
{
  "input": {
    "entityId": "student-uuid",
    "entityType": "student",
    "date": "2025-04-19",
    "status": "present",
    "subjectId": "subject-uuid"
  }
}
```

### Bulk mark attendance

```graphql
mutation BulkMarkAttendance($inputs: [MarkAttendanceInput!]!) {
  bulkMarkAttendance(inputs: $inputs) {
    id
    entityId
    status
  }
}
```

**Variables**
```json
{
  "inputs": [
    { "entityId": "student-1", "entityType": "student", "date": "2025-04-19", "status": "present" },
    { "entityId": "student-2", "entityType": "student", "date": "2025-04-19", "status": "absent" },
    { "entityId": "student-3", "entityType": "student", "date": "2025-04-19", "status": "late" }
  ]
}
```

---

## Leaves

### Leave types

#### List leave types

```graphql
query {
  leaveTypes {
    id
    name
    code
    daysPerYear
    carryForward
    maxCarryForward
    applicableTo
    isActive
  }
}
```

#### Create a leave type

```graphql
mutation CreateLeaveType($input: CreateLeaveTypeInput!) {
  createLeaveType(input: $input) {
    id
    name
    code
    daysPerYear
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Casual Leave",
    "code": "CL",
    "daysPerYear": 12,
    "carryForward": false,
    "maxCarryForward": 0,
    "applicableTo": "employee"
  }
}
```

> **applicableTo values:** `all` | `employee` | `student`

---

### Leave applications

#### List leave applications

```graphql
query Leaves($status: String) {
  leaves(status: $status) {
    id
    leaveTypeName
    fromDate
    toDate
    reason
    status
    reviewNote
    applicant { name email role }
  }
}
```

**Variables** *(optional — omit for all)*
```json
{ "status": "pending" }
```

#### Apply for leave

```graphql
mutation ApplyLeave($input: ApplyLeaveInput!) {
  applyLeave(input: $input) {
    id
    leaveTypeName
    fromDate
    toDate
    status
  }
}
```

**Variables**
```json
{
  "input": {
    "leaveTypeId": "leave-type-uuid",
    "leaveType": "Casual Leave",
    "fromDate": "2025-04-25",
    "toDate": "2025-04-26",
    "reason": "Family function"
  }
}
```

#### Review a leave application (admin)

```graphql
mutation ReviewLeave($id: ID!, $input: ReviewLeaveInput!) {
  reviewLeave(id: $id, input: $input) {
    id
    status
    reviewNote
  }
}
```

**Variables — approve**
```json
{
  "id": "leave-uuid",
  "input": { "status": "approved", "reviewNote": "Approved." }
}
```

**Variables — reject**
```json
{
  "id": "leave-uuid",
  "input": { "status": "rejected", "reviewNote": "Insufficient balance." }
}
```

#### Leave balances

```graphql
# Own balance (any authenticated user)
query {
  myLeaveBalance {
    total
    used
    pending
    leaveType { name code }
  }
}

# All balances (admin only)
query LeaveBalances($year: Int, $userId: String) {
  leaveBalances(year: $year, userId: $userId) {
    userId
    year
    total
    used
    pending
    leaveType { name }
  }
}
```

---

## Fees

### Fee categories

```graphql
query {
  feeCategories {
    id
    name
    code
    description
    isActive
  }
}
```

```graphql
mutation CreateFeeCategory($input: CreateFeeCategoryInput!) {
  createFeeCategory(input: $input) {
    id
    name
    code
  }
}
```

**Variables**
```json
{
  "input": {
    "name": "Tuition Fee",
    "code": "TF",
    "description": "Semester tuition charges"
  }
}
```

---

### Fee structures

#### List fee structures

```graphql
query FeeStructures($academicYearId: String, $courseId: String) {
  feeStructures(academicYearId: $academicYearId, courseId: $courseId) {
    id
    semesterNumber
    amount
    dueDate
    lateFeePerDay
    maxLateFee
    isActive
    academicYear { name }
    course { name }
    feeCategory { name }
  }
}
```

#### Create a fee structure

```graphql
mutation CreateFeeStructure($input: CreateFeeStructureInput!) {
  createFeeStructure(input: $input) {
    id
    amount
    semesterNumber
  }
}
```

**Variables**
```json
{
  "input": {
    "academicYearId": "ay-uuid",
    "courseId": "course-uuid",
    "feeCategoryId": "category-uuid",
    "semesterNumber": 1,
    "amount": 45000,
    "dueDate": "2025-08-31",
    "lateFeePerDay": 50,
    "maxLateFee": 2000
  }
}
```

---

### Fee payments

#### List payments

```graphql
query FeePayments($studentId: String, $status: String) {
  feePayments(studentId: $studentId, status: $status) {
    id
    amount
    lateFee
    totalAmount
    paymentDate
    paymentMode
    receiptNumber
    status
    student { rollNumber user { name } }
    feeStructure { semesterNumber feeCategory { name } }
  }
}
```

#### Record a payment

```graphql
mutation RecordFeePayment($input: RecordFeePaymentInput!) {
  recordFeePayment(input: $input) {
    id
    receiptNumber
    totalAmount
    status
  }
}
```

**Variables**
```json
{
  "input": {
    "studentId": "student-uuid",
    "feeStructureId": "structure-uuid",
    "amount": 45000,
    "lateFee": 0,
    "paymentDate": "2025-04-19",
    "paymentMode": "online",
    "transactionRef": "TXN20250419001"
  }
}
```

> **paymentMode values:** `cash` | `online` | `cheque` | `dd`

#### Outstanding dues

```graphql
query FeeDues($academicYearId: String, $courseId: String) {
  feeDues(academicYearId: $academicYearId, courseId: $courseId) {
    studentName
    rollNumber
    courseName
    categoryName
    totalDue
    totalPaid
    outstanding
    dueDate
    isOverdue
  }
}
```

#### Fee collection summary

```graphql
query FeeCollectionSummary($academicYearId: String) {
  feeCollectionSummary(academicYearId: $academicYearId) {
    totalCollected
    paymentCount
    pendingDues
    totalExpected
  }
}
```

---

## Timetable

### Query timetable

```graphql
query Timetable($courseId: String, $semester: Int, $dayOfWeek: String) {
  timetable(courseId: $courseId, semester: $semester, dayOfWeek: $dayOfWeek) {
    id
    dayOfWeek
    periodNumber
    startTime
    endTime
    semester
    section
    room
    course { name }
    subject { name code }
  }
}
```

**Variables**
```json
{ "courseId": "course-uuid", "semester": 3 }
```

### Create a timetable slot

```graphql
mutation CreateTimetableSlot($input: CreateTimetableSlotInput!) {
  createTimetableSlot(input: $input) {
    id
    dayOfWeek
    startTime
    endTime
  }
}
```

**Variables**
```json
{
  "input": {
    "courseId": "course-uuid",
    "subjectId": "subject-uuid",
    "employeeId": "teacher-emp-uuid",
    "academicYearId": "ay-uuid",
    "dayOfWeek": "Monday",
    "periodNumber": 1,
    "startTime": "09:00",
    "endTime": "10:00",
    "semester": 3,
    "section": "A",
    "room": "C-101"
  }
}
```

> **dayOfWeek values:** `Monday` | `Tuesday` | `Wednesday` | `Thursday` | `Friday` | `Saturday`

### Bulk create timetable slots

Replaces all existing slots for the given course/semester atomically.

```graphql
mutation BulkCreateTimetableSlots($input: BulkCreateTimetableSlotsInput!) {
  bulkCreateTimetableSlots(input: $input) {
    id
    dayOfWeek
    periodNumber
    startTime
    subject { name }
  }
}
```

**Variables**
```json
{
  "input": {
    "courseId": "course-uuid",
    "academicYearId": "ay-uuid",
    "semester": 3,
    "section": "A",
    "slots": [
      {
        "courseId": "course-uuid",
        "subjectId": "sub-1",
        "employeeId": "emp-1",
        "dayOfWeek": "Monday",
        "periodNumber": 1,
        "startTime": "09:00",
        "endTime": "10:00",
        "semester": 3
      },
      {
        "courseId": "course-uuid",
        "subjectId": "sub-2",
        "employeeId": "emp-2",
        "dayOfWeek": "Monday",
        "periodNumber": 2,
        "startTime": "10:00",
        "endTime": "11:00",
        "semester": 3
      }
    ]
  }
}
```

---

## Events

### List events

```graphql
query Events($category: String) {
  events(category: $category) {
    id
    title
    description
    eventDate
    endDate
    location
    category
    color
    isPublic
  }
}
```

**Variables** *(optional)*
```json
{ "category": "holiday" }
```

> **category values:** `holiday` | `exam` | `cultural` | `sports` | `other`

### Create an event

```graphql
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    title
    eventDate
    category
  }
}
```

**Variables**
```json
{
  "input": {
    "title": "Annual Sports Day",
    "description": "Inter-department sports competition.",
    "eventDate": "2025-12-10",
    "endDate": "2025-12-11",
    "location": "Sports Ground",
    "category": "sports",
    "color": "#FF5733",
    "isPublic": true
  }
}
```

---

## Announcements

### List announcements (role-filtered)

```graphql
query {
  announcements {
    id
    title
    body
    priority
    targetRoles
    isPublished
    expiresAt
    author { name }
  }
}
```

### List all announcements (admin)

```graphql
query {
  allAnnouncements {
    id
    title
    body
    priority
    isPublished
    targetRoles
    expiresAt
  }
}
```

### Create an announcement

```graphql
mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
  createAnnouncement(input: $input) {
    id
    title
    isPublished
  }
}
```

**Variables**
```json
{
  "input": {
    "title": "Exam Schedule Released",
    "body": "The mid-semester examination schedule is now available. Please check the exam section.",
    "targetRoles": "student,teacher",
    "priority": "high",
    "isPublished": true,
    "expiresAt": "2025-11-15T00:00:00Z"
  }
}
```

> **priority values:** `low` | `normal` | `high` | `urgent`  
> **targetRoles:** comma-separated, e.g. `student`, `teacher`, `student,teacher,staff`

---

## Notifications

### My notifications

```graphql
query {
  myNotifications {
    id
    title
    body
    type
    category
    isRead
    createdAt
    refId
    refType
  }
}
```

### Unread count

```graphql
query {
  unreadNotificationCount {
    count
  }
}
```

### Mark as read

```graphql
mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id)
}
```

### Mark all as read

```graphql
mutation {
  markAllNotificationsRead
}
```

### Send a notification (admin)

```graphql
mutation SendNotification($input: SendNotificationInput!) {
  sendNotification(input: $input) {
    id
    title
    isRead
    createdAt
  }
}
```

**Variables**
```json
{
  "input": {
    "userId": "user-uuid",
    "title": "Fee Payment Reminder",
    "body": "Your semester fee is due on 31 Aug 2025.",
    "type": "reminder",
    "category": "fee",
    "refId": "fee-structure-uuid",
    "refType": "fee_structure"
  }
}
```

---

## Dashboard & Reports

### Dashboard stats

```graphql
query {
  dashboardStats {
    students
    employees
    teachers
    users
    pendingLeaves
    pendingPayrolls
    todayPresent
    todayAbsent
  }
}
```

### Attendance report

```graphql
query AttendanceReport($fromDate: String, $toDate: String, $entityType: String) {
  attendanceReport(fromDate: $fromDate, toDate: $toDate, entityType: $entityType) {
    fromDate
    toDate
    entityType
    daily {
      date
      present
      absent
      late
      total
    }
  }
}
```

**Variables**
```json
{
  "fromDate": "2025-04-01",
  "toDate": "2025-04-30",
  "entityType": "student"
}
```

### Marks report

```graphql
query MarksReport($courseId: String, $semesterNumber: String, $academicYearId: String) {
  marksReport(
    courseId: $courseId,
    semesterNumber: $semesterNumber,
    academicYearId: $academicYearId
  ) {
    gradeDistribution {
      grade
      count
    }
    subjectAverages {
      subjectName
      avgMarks
      maxMarks
      passCount
      failCount
      totalCount
    }
  }
}
```

### Leave report

```graphql
query LeaveReport($year: String, $department: String) {
  leaveReport(year: $year, department: $department) {
    year
    total
    approved
    statusBreakdown { status count }
    monthlyTrend { month count }
    byDepartment { department count }
  }
}
```

**Variables**
```json
{ "year": "2025" }
```

### Fee report

```graphql
query FeeReport($academicYearId: String) {
  feeReport(academicYearId: $academicYearId) {
    totalCollected
    paymentCount
    monthlyTrend { month amount count }
    byPaymentMode { mode amount count }
    byCategory { category amount count }
  }
}
```

### Payroll report

```graphql
query PayrollReport($year: String) {
  payrollReport(year: $year) {
    year
    totalGross
    totalNet
    totalEmployees
    monthlyTrend {
      month
      grossSalary
      netSalary
      totalDeductions
      employeeCount
    }
  }
}
```

**Variables**
```json
{ "year": "2025" }
```

---

## Error format

All errors are returned in the standard GraphQL errors array:

```json
{
  "errors": [
    {
      "message": "not authenticated",
      "path": ["employees"]
    }
  ],
  "data": null
}
```

Common messages:

| Message | Cause |
|---|---|
| `not authenticated` | Missing or invalid Bearer token |
| `forbidden` | Token valid but role lacks permission |
| `not found` | Resource with given ID does not exist |
| `internal server error` | Unexpected server-side failure |
