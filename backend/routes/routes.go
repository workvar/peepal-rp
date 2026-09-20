package routes

import (
	"collegeerp/config"
	"collegeerp/graph"
	"collegeerp/handlers"
	"collegeerp/handlers/bulk"
	"collegeerp/middleware"

	"github.com/gofiber/fiber/v2"
)

// Register sets up all API routes.
func Register(app *fiber.App) {
	api := app.Group("/api/v1")

	// Public tenant lookup — no auth required
	api.Get("/tenants/lookup/:subdomain", handlers.LookupTenant)

	// ── Invites (public) ────────────────────────────────────────
	// A newly-created user follows an e-mailed link to set their own
	// password. Unauthenticated by nature, so these live alongside login.
	invites := api.Group("/invites")
	invites.Get("/:token", handlers.ValidateInvite)
	invites.Post("/accept", handlers.AcceptInvite)

	// ── Auth ────────────────────────────────────────────────────
	auth := api.Group("/auth")
	auth.Post("/login", middleware.LoginRateLimiter(), handlers.Login)
	auth.Post("/logout", handlers.Logout)
	// Token exchange: swaps a valid refresh cookie for a new short-lived access
	// token. Unauthenticated by design — the access token it replaces has
	// usually just expired.
	auth.Post("/refresh", middleware.RefreshRateLimiter(), handlers.Refresh)
	auth.Get("/me", middleware.Authenticate, handlers.Me)
	// Workspace switching re-mints the auth cookie, so it belongs with the other
	// session endpoints. Granting workspaces is GraphQL (setUserWorkspaceRoles).
	auth.Get("/workspaces", middleware.Authenticate, handlers.ListMyWorkspaces)
	auth.Post("/workspace", middleware.Authenticate, handlers.SwitchWorkspace)
	auth.Put("/profile", middleware.Authenticate, handlers.UpdateMyProfile)
	auth.Put("/password", middleware.Authenticate, handlers.ChangePassword)

	// ── Passkeys (WebAuthn) ─────────────────────────────────────
	// Sign-in is a two-request ceremony: begin issues a challenge, finish
	// verifies the signature over it. Both are unauthenticated by nature —
	// they are how a session starts — and both are throttled, because a
	// challenge is cheap for us to mint and not for an attacker to use.
	auth.Post("/passkey/login/begin", middleware.LoginRateLimiter(), handlers.BeginPasskeyLogin)
	auth.Post("/passkey/login/finish", middleware.LoginRateLimiter(), handlers.FinishPasskeyLogin)
	// The PIN step of a passkey login. Guessing is already bounded per account
	// by the lockout in the model layer; this caps it per IP as well so one
	// host cannot work through many accounts in parallel.
	auth.Post("/passkey/pin", middleware.PINRateLimiter(), handlers.VerifyLoginPIN)

	// Enrolling a passkey requires an existing session: adding a credential is
	// adding a way to sign in, so it is gated by one that already worked.
	auth.Post("/passkey/register/begin", middleware.Authenticate, handlers.BeginPasskeyRegistration)
	auth.Post("/passkey/register/finish", middleware.Authenticate, handlers.FinishPasskeyRegistration)
	auth.Get("/passkeys", middleware.Authenticate, handlers.ListMyPasskeys)
	auth.Patch("/passkeys/:id", middleware.Authenticate, handlers.RenameMyPasskey)
	auth.Delete("/passkeys/:id", middleware.Authenticate, handlers.DeleteMyPasskey)
	auth.Get("/pin", middleware.Authenticate, handlers.GetMyLoginPIN)
	auth.Put("/pin", middleware.Authenticate, handlers.SetMyLoginPIN)
	auth.Delete("/pin", middleware.Authenticate, handlers.DeleteMyLoginPIN)

	// ── Terminology (any authenticated user) ────────────────────
	// Returns per-tenant label map (Student/Member/Patient/Employee, …)
	// so the frontend can localize copy based on the tenant's vertical.
	api.Get("/terminology", middleware.Authenticate, handlers.GetTerminology)

	// ── Quota status (any authenticated user) ───────────────────
	// Lightweight usage-vs-limits payload that powers the persistent
	// over-quota banner. Readable by every role (no billing details).
	api.Get("/quota", middleware.Authenticate, handlers.GetMyQuotaStatus)

	// ── Super Admin routes (no tenant scope, require super_admin) ────
	super := api.Group("/super", middleware.Authenticate, middleware.RequireSuperAdmin)
	super.Get("/stats", handlers.GetPlatformStats)
	super.Get("/tenants", handlers.ListTenants)
	super.Post("/tenants", handlers.CreateTenant)
	super.Get("/tenants/:id", handlers.GetTenant)
	super.Put("/tenants/:id", handlers.UpdateTenant)
	super.Patch("/tenants/:id/status", handlers.UpdateTenantStatus)
	super.Post("/tenants/:id/impersonate", handlers.ImpersonateTenant)
	super.Delete("/tenants/:id", handlers.HardDeleteTenant)

	// ── Platform email (SMTP) settings (super-admin) ─────────────
	// The shared fallback transport used when a tenant has no own SMTP.
	super.Get("/email-settings", handlers.GetPlatformEmailSettings)
	super.Put("/email-settings", handlers.UpdatePlatformEmailSettings)
	super.Post("/email-settings/test", handlers.TestPlatformEmail)

	// ── Email templates designer (super-admin) ──────────────────
	super.Get("/email-templates", handlers.ListEmailTemplates)
	super.Get("/email-templates/:key", handlers.GetEmailTemplate)
	super.Put("/email-templates/:key", handlers.UpdateEmailTemplate)
	super.Delete("/email-templates/:key", handlers.ResetEmailTemplate)
	super.Post("/email-templates/:key/test", handlers.TestEmailTemplate)

	// ── Super Admin User Management ─────────────────────────────
	// Super admins can create/manage other super admin accounts here.
	superAdmins := super.Group("/admins")
	superAdmins.Get("/", handlers.ListSuperAdmins)
	superAdmins.Post("/", handlers.CreateSuperAdmin)
	superAdmins.Put("/:id", handlers.UpdateSuperAdmin)
	superAdmins.Delete("/:id", handlers.DeleteSuperAdmin)

	// ── Subscription Plans (super-admin) ─────────────────────────
	plans := super.Group("/plans")
	plans.Get("/", handlers.ListPlans)
	plans.Post("/", handlers.CreatePlan)
	plans.Put("/:id", handlers.UpdatePlan)
	plans.Delete("/:id", handlers.DeletePlan)

	// ── Subscriptions (super-admin) ──────────────────────────────
	subs := super.Group("/subscriptions")
	subs.Get("/", handlers.ListSubscriptions)
	subs.Get("/tenant/:tenantId", handlers.GetTenantSubscription)
	subs.Post("/", handlers.AssignSubscription)
	subs.Patch("/:id/status", handlers.UpdateSubscriptionStatus)

	// ── Module configurator (super-admin) ───────────────────────
	// Edit the coarse subscription modules and map each page onto them.
	mc := super.Group("/module-config")
	mc.Get("/", handlers.GetModuleConfig)
	mc.Put("/pages/:id", handlers.SetModulePageMapping)
	mc.Post("/modules", handlers.CreateModuleCatalog)
	mc.Put("/modules/:key", handlers.UpdateModuleCatalog)
	mc.Delete("/modules/:key", handlers.DeleteModuleCatalog)

	// ── Org Admin routes (tenant scoped, require admin) ──────────────
	org := api.Group("/org", middleware.Authenticate, middleware.RequireRole("admin"))
	org.Get("/profile", handlers.GetOrgProfile)
	org.Put("/profile", handlers.UpdateOrgProfile)
	org.Get("/setup-status", handlers.GetOrgSetupStatus)
	org.Get("/subscription", handlers.GetMySubscription)
	org.Get("/departments", handlers.ListDepartments)
	org.Post("/departments", handlers.CreateDepartment)
	org.Put("/departments/:id", handlers.UpdateDepartment)
	org.Delete("/departments/:id", handlers.DeleteDepartment)
	org.Get("/academic-years", handlers.ListAcademicYears)
	org.Post("/academic-years", handlers.CreateAcademicYear)
	org.Put("/academic-years/:id", handlers.UpdateAcademicYear)
	org.Patch("/academic-years/:id/set-current", handlers.SetCurrentAcademicYear)
	org.Get("/semesters", handlers.ListSemesters)
	org.Post("/semesters", handlers.CreateSemester)
	org.Get("/roles", handlers.ListCustomRoles)
	org.Post("/roles", handlers.CreateCustomRole)
	org.Put("/roles/:id", handlers.UpdateCustomRole)
	org.Delete("/roles/:id", handlers.DeleteCustomRole)

	// Link users to custom roles. User CRUD itself is served via GraphQL;
	// these endpoints just attach/detach a role after the user exists.
	org.Get("/users/custom-roles", handlers.ListUsersWithCustomRoles)
	org.Put("/users/:id/custom-role", handlers.AssignUserCustomRole)

	// Manager assignment + organisation hierarchy. Manager assignment is
	// admin-only. The structure endpoints stay open to all authenticated
	// users (also reachable from /api/v1/organization/* below) so any
	// employee can browse the company tree.
	org.Put("/users/:id/manager", handlers.AssignUserManager)

	// ── Approval flow builder (admin only) ───────────────────────
	approvals := org.Group("/approval-flows")
	approvals.Get("/", handlers.ListApprovalFlows)
	approvals.Post("/", handlers.CreateApprovalFlow)
	approvals.Get("/:id", handlers.GetApprovalFlow)
	approvals.Put("/:id", handlers.UpdateApprovalFlow)
	approvals.Delete("/:id", handlers.DeleteApprovalFlow)

	// Process types CRUD — admin only.
	processTypes := org.Group("/approval-process-types")
	processTypes.Get("/", handlers.ListApprovalProcessTypes)
	processTypes.Post("/", handlers.CreateApprovalProcessType)
	processTypes.Put("/:id", handlers.UpdateApprovalProcessType)
	processTypes.Delete("/:id", handlers.DeleteApprovalProcessType)

	// ── Organisation structure (any authenticated user) ──────────
	orgStruct := api.Group("/organization", middleware.Authenticate)
	orgStruct.Get("/users", handlers.ListOrgUsers)
	orgStruct.Get("/structure", handlers.GetOrgStructure)

	// ── Approval requests (any authenticated user) ───────────────
	approvalReqs := api.Group("/approval-requests", middleware.Authenticate)
	approvalReqs.Get("/pending", handlers.ListMyPendingApprovals)
	approvalReqs.Get("/mine", handlers.ListMyApprovalRequests)
	approvalReqs.Get("/active-flows", handlers.ListActiveFlowsForUser)
	// Read-only label lookup. The CRUD copy under /org is admin-only, but
	// every role needs the labels to render their own request list.
	approvalReqs.Get("/process-types", handlers.ListApprovalProcessTypes)
	approvalReqs.Get("/:id", handlers.GetApprovalRequest)
	approvalReqs.Post("/", handlers.RaiseApprovalRequest)
	approvalReqs.Post("/:id/approve", handlers.ApproveApprovalRequest)
	approvalReqs.Post("/:id/reject", handlers.RejectApprovalRequest)

	// ── Users/Employees/Courses/Departments ───────────────────────────
	// CRUD is served entirely by GraphQL — see mutations:
	//   createUser, updateUser, deactivateUser,
	//   createEmployee, updateEmployee, deleteEmployee,
	//   createDepartment, and the `users`/`employees`/`departments` queries.
	// (REST handlers retired.)

	// ── Students ────────────────────────────────────────────────
	// CRUD is served by GraphQL (students/student queries, createStudent,
	// updateStudent, deleteStudent). The two endpoints below remain REST
	// because they don't map cleanly:
	//   • /me — composite student portal payload (profile + attendance% +
	//     recent marks) used by the student self-service page.
	//   • /bulk-import — raw CSV upload (Content-Type: text/plain).
	students := api.Group("/students", middleware.Authenticate)
	students.Get("/me", handlers.GetMyStudentProfile)
	students.Post("/bulk-import", middleware.RequireRole("admin"), handlers.BulkImportStudents)

	// ── Attendance ──────────────────────────────────────────────
	// Listing and marking attendance now go through GraphQL (queries:
	// attendance, attendanceSummary, attendanceShortage; mutations:
	// markAttendance, bulkMarkAttendance). The settings/summary/shortage
	// GETs stay on REST because the holidaySlice (Redux) still consumes
	// them synchronously, and the export-csv endpoint stays because it
	// returns a binary blob. Update-settings stays paired with GET.
	attendance := api.Group("/attendance", middleware.Authenticate)
	attendance.Get("/summary", handlers.GetAttendanceSummary)
	attendance.Get("/shortage", handlers.GetShortageList)
	attendance.Get("/settings", handlers.GetAttendanceSettings)
	attendance.Put("/settings", middleware.RequireRole("admin"), handlers.UpdateAttendanceSettings)

	// ── Holidays ────────────────────────────────────────────────
	holidays := api.Group("/holidays", middleware.Authenticate)
	holidays.Get("/", handlers.ListHolidays)
	holidays.Post("/", middleware.RequireRole("admin"), handlers.CreateHoliday)
	holidays.Delete("/bulk", middleware.RequireRole("admin"), handlers.BulkDeleteHolidays)
	holidays.Post("/copy", middleware.RequireRole("admin"), handlers.CopyHolidaysToAcademicYear)
	holidays.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteHoliday)

	// ── Institutional Calendar ─────────────────────────────────
	// The calendar module sits on top of the Holiday table: it reuses the
	// same rows but adds settings (weekend rules), auto-generation, a
	// month-view endpoint, and a date-keyed upsert for in-place editing.
	calendar := api.Group("/calendar", middleware.Authenticate)
	calendar.Get("/settings", handlers.GetCalendarSettings)
	calendar.Put("/settings", middleware.RequireRole("admin"), handlers.UpdateCalendarSettings)
	calendar.Post("/generate", middleware.RequireRole("admin"), handlers.GenerateCalendar)
	calendar.Get("/month", handlers.GetCalendarMonth)
	calendar.Put("/day", middleware.RequireRole("admin"), handlers.UpsertHoliday)

	// ── Marks / Subjects / Exams ─────────────────────────────────
	// All three are served by GraphQL — see mutations createMark,
	// publishResults, createSubject/updateSubject/deleteSubject,
	// createExamSchedule/updateExamSchedule/publishExamSchedule/
	// deleteExamSchedule, and the matching queries.

	// ── Leaves / Leave Types / Leave Balances ────────────────────
	// Served entirely by GraphQL — see applyLeave, reviewLeave,
	// createLeaveType/updateLeaveType/deleteLeaveType mutations and
	// the leaves, leaveTypes, myLeaveBalance, leaveBalances queries.

	// ── Salary Structures (LEGACY, read-only shim) ───────────────
	// Reads now return data synthesised from templates + assignments.
	// Write endpoints are retired — see /salary-templates and
	// /salary-assignments below.
	salaryStructures := api.Group("/salary-structures", middleware.Authenticate)
	salaryStructures.Get("/", handlers.ListSalaryStructures)
	salaryStructures.Post("/", middleware.RequireRole("admin"), handlers.CreateSalaryStructure)
	salaryStructures.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateSalaryStructure)
	salaryStructures.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteSalaryStructure)

	// ── Salary Templates (named, reusable structures) ────────────
	salaryTemplates := api.Group("/salary-templates", middleware.Authenticate)
	salaryTemplates.Get("/", handlers.ListSalaryTemplates)
	salaryTemplates.Post("/", middleware.RequireRole("admin"), handlers.CreateSalaryTemplate)
	salaryTemplates.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateSalaryTemplate)
	salaryTemplates.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteSalaryTemplate)

	// ── Salary Assignments (employee ↔ template link) ────────────
	salaryAssignments := api.Group("/salary-assignments", middleware.Authenticate)
	salaryAssignments.Get("/", handlers.ListSalaryAssignments)
	salaryAssignments.Post("/", middleware.RequireRole("admin"), handlers.AssignSalaryTemplate)
	salaryAssignments.Post("/bulk", middleware.RequireRole("admin"), handlers.BulkAssignSalaryTemplate)
	salaryAssignments.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateSalaryAssignment)
	salaryAssignments.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteSalaryAssignment)

	// ── Payroll ─────────────────────────────────────────────────
	payroll := api.Group("/payroll", middleware.Authenticate)
	payroll.Get("/", middleware.RequireRole("admin"), handlers.ListPayrolls)
	payroll.Get("/me", handlers.GetMyPayrolls)
	payroll.Get("/summary", middleware.RequireRole("admin"), handlers.GetPayrollSummary)
	payroll.Post("/generate", middleware.RequireRole("admin"), handlers.GeneratePayroll)
	payroll.Patch("/:id/status", middleware.RequireRole("admin"), handlers.UpdatePayrollStatus)
	payroll.Delete("/:id", middleware.RequireRole("admin"), handlers.DeletePayroll)
	// PDF payslip download — authorised for admins (any payroll) or the
	// employee who owns the payroll. Only paid payrolls are downloadable.
	payroll.Get("/:id/pdf", handlers.DownloadPayslipPDF)

	// ── Announcements ────────────────────────
	announcements := api.Group("/announcements", middleware.Authenticate)
	announcements.Get("/", handlers.ListAnnouncements)                              // all authenticated users (filtered by role)
	announcements.Get("/all", middleware.RequireRole("admin"), handlers.ListAllAnnouncements) // admin sees all
	announcements.Post("/", middleware.RequireRole("admin"), handlers.CreateAnnouncement)
	announcements.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateAnnouncement)
	announcements.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteAnnouncement)

	// ── Notifications ────────────────────────
	notifications := api.Group("/notifications", middleware.Authenticate)
	notifications.Get("/", handlers.GetMyNotifications)
	notifications.Get("/unread-count", handlers.GetUnreadCount)
	notifications.Post("/", middleware.RequireRole("admin"), handlers.SendNotification)
	notifications.Patch("/read-all", handlers.MarkAllNotificationsRead)
	notifications.Patch("/:id/read", handlers.MarkNotificationRead)
	notifications.Delete("/:id", handlers.DeleteNotification)

	// ── Reports ─────────────────────────────
	reports := api.Group("/reports", middleware.Authenticate, middleware.RequireRole("admin"))
	reports.Get("/dashboard", handlers.GetDashboardStats)
	reports.Get("/attendance", handlers.GetAttendanceReport)
	reports.Get("/marks", handlers.GetMarksReport)
	reports.Get("/leaves", handlers.GetLeaveReport)
	reports.Get("/payroll", handlers.GetPayrollReport)

	// ── Finance report PDFs (Phase 3) ────────
	finance := api.Group("/finance", middleware.Authenticate, middleware.RequireRole("admin"))
	finance.Get("/reports/pl", handlers.DownloadPLPDF)
	finance.Get("/reports/balance-sheet", handlers.DownloadBalanceSheetPDF)
	finance.Get("/reports/trial-balance", handlers.DownloadTrialBalancePDF)

	// ── Timetable ────────────────────────────
	timetable := api.Group("/timetable", middleware.Authenticate)
	timetable.Get("/", handlers.ListTimetable)
	timetable.Post("/", middleware.RequireRole("admin"), handlers.CreateTimetableSlot)
	timetable.Post("/bulk", middleware.RequireRole("admin"), handlers.BulkCreateTimetableSlots)
	timetable.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateTimetableSlot)
	timetable.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteTimetableSlot)

	// ── Events / College Calendar ────────────────────────────
	events := api.Group("/events", middleware.Authenticate)
	events.Get("/", handlers.ListEvents)
	events.Post("/", middleware.RequireRole("admin"), handlers.CreateEvent)
	events.Get("/:id", handlers.GetEvent)
	events.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateEvent)
	events.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteEvent)

	// ── Hostel Management ────────────────────────────
	hostels := api.Group("/hostels", middleware.Authenticate)

	// Hostel Blocks
	blocks := hostels.Group("/blocks")
	blocks.Get("/", handlers.ListHostelBlocks)
	blocks.Post("/", middleware.RequireRole("admin"), handlers.CreateHostelBlock)
	blocks.Delete("/bulk", middleware.RequireRole("admin"), handlers.BulkDeleteHostelBlocks)

	// Hostel Rooms
	rooms := hostels.Group("/rooms")
	rooms.Get("/", handlers.ListHostelRooms)
	rooms.Post("/", middleware.RequireRole("admin"), handlers.CreateHostelRoom)
	rooms.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateHostelRoom)

	// Hostel Allocations
	allocations := hostels.Group("/allocations")
	allocations.Get("/", handlers.ListHostelAllocations)
	allocations.Post("/", middleware.RequireRole("admin"), handlers.AllocateHostelRoom)
	allocations.Put("/:id/vacate", middleware.RequireRole("admin"), handlers.VacateHostelRoom)

	// ── Transport Management ────────────────────────────
	transport := api.Group("/transport", middleware.Authenticate)

	// Routes
	routes := transport.Group("/routes")
	routes.Get("/", handlers.ListRoutes)
	routes.Post("/", middleware.RequireRole("admin"), handlers.CreateRoute)
	routes.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateRoute)
	routes.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteRoute)

	// Vehicles
	vehicles := transport.Group("/vehicles")
	vehicles.Get("/", handlers.ListVehicles)
	vehicles.Post("/", middleware.RequireRole("admin"), handlers.CreateVehicle)
	vehicles.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateVehicle)
	vehicles.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteVehicle)

	// Allocations
	transAllocations := transport.Group("/allocations")
	transAllocations.Get("/", handlers.ListTransportAllocations)
	transAllocations.Post("/", middleware.RequireRole("admin"), handlers.AllocateTransport)
	transAllocations.Put("/:id/remove", middleware.RequireRole("admin"), handlers.RemoveTransportAllocation)

	// ── Library Management ────────────────────────────
	library := api.Group("/library", middleware.Authenticate)

	// Books
	books := library.Group("/books")
	books.Get("/", handlers.ListBooks)
	books.Post("/", middleware.RequireRole("admin"), handlers.CreateBook)
	books.Put("/:id", middleware.RequireRole("admin"), handlers.UpdateBook)
	books.Delete("/:id", middleware.RequireRole("admin"), handlers.DeleteBook)

	// Issues
	issues := library.Group("/issues")
	issues.Get("/", handlers.ListIssues)
	issues.Post("/", middleware.RequireRole("admin"), handlers.IssueBook)
	issues.Put("/:id/return", middleware.RequireRole("admin"), handlers.ReturnBook)
	issues.Get("/overdue", handlers.GetOverdueBooks)

	// ── Fee PDFs (schedule + receipts) ──────────────────────────
	// Fee CRUD is GraphQL; only the binary PDF downloads are REST because
	// they stream a generated file. Templates live in the pdf-template
	// package. Schedule + "all receipts" are self-service (caller's own);
	// a single receipt is downloadable by its owner or by admins/staff.
	// ── QR / Barcode images (Phase 1 infra) ────────────────────
	// Generic authenticated code renderer; binary streaming, any logged-in
	// user of any tenant may render a code. Content is echoed as-is.
	codes := api.Group("/codes", middleware.Authenticate)
	codes.Get("/qr", handlers.GenerateQR)
	codes.Get("/barcode", handlers.GenerateBarcode)

	feesPDF := api.Group("/fees", middleware.Authenticate)
	feesPDF.Get("/me/schedule/pdf", handlers.DownloadMyFeeSchedulePDF)
	feesPDF.Get("/me/receipts/pdf", handlers.DownloadMyFeeReceiptsPDF)
	feesPDF.Get("/payments/:id/receipt", handlers.DownloadFeeReceiptPDF)

	// ── Clinical invoice PDF ────────────────────────────────────
	// Billing CRUD is GraphQL; the invoice/receipt PDF streams over REST.
	// Staff-side only — patients have no login account.
	clinicalPDF := api.Group("/clinical", middleware.Authenticate)
	clinicalPDF.Get("/invoices/:id/pdf",
		middleware.RequireRole("admin", "staff"), handlers.DownloadInvoicePDF)
	clinicalPDF.Get("/admissions/:id/discharge-summary",
		middleware.RequireRole("admin", "staff"), handlers.DownloadDischargeSummaryPDF)
	// Insurance claim submit reuses the approval engine (CRUD stays GraphQL).
	clinicalPDF.Post("/claims/:id/submit",
		middleware.RequireRole("admin", "staff"), handlers.SubmitInsuranceClaim)

	// ── Purchase order PDF (Phase 2) ────────────────────────────
	// Procurement CRUD is GraphQL; the PO PDF streams over REST for emailing
	// suppliers. Admin/staff only.
	procurementPDF := api.Group("/procurement", middleware.Authenticate)
	procurementPDF.Get("/purchase-orders/:id/pdf",
		middleware.RequireRole("admin", "staff"), handlers.DownloadPurchaseOrderPDF)

	// ── Grade report PDF ────────────────────────────────────────
	// Grading is GraphQL; the transcript PDF streams over REST. Students
	// get their own; admins/teachers pass ?studentId=.
	gradesPDF := api.Group("/grades", middleware.Authenticate)
	gradesPDF.Get("/me/pdf", handlers.DownloadGradeReportPDF)

	// ── Exam cell PDFs (Phase 5) ────────────────────────────────
	// Question bank, paper generation and hall-ticket issuing are all
	// GraphQL; only the printable documents stream over REST. Papers are
	// staff-side; a student may pull their own hall ticket via /me/pdf,
	// which resolves the ticket from the session rather than a URL id.
	examCellPDF := api.Group("/exam-cell", middleware.Authenticate)
	examCellPDF.Get("/papers/:id/pdf",
		middleware.RequireRole("admin", "teacher"), handlers.DownloadQuestionPaperPDF)
	examCellPDF.Get("/hall-tickets/me/pdf", handlers.DownloadMyHallTicketPDF)
	examCellPDF.Get("/hall-tickets/:id/pdf",
		middleware.RequireRole("admin", "staff"), handlers.DownloadHallTicketPDF)

	// ── Results Publishing ────────────────────────────
	// Served by GraphQL — see publishResults mutation and the
	// publishedResults / resultSummary queries.

	// ── Attendance Export ────────────────────────────
	attendance.Get("/export", middleware.RequireRole("admin"), handlers.ExportAttendanceCSV)

	// ── Dashboard Charts ────────────────────────────
	dashboard := reports.Group("/charts")
	dashboard.Get("/", handlers.GetDashboardCharts)

	// ── Learning Matrix (video upload endpoint) ───────────────────
	// The learning module's admin/employee interactions all go through
	// GraphQL. Only file uploads (which don't fit GraphQL well) live here.
	learning := api.Group("/learning", middleware.Authenticate)
	learning.Post("/video-upload", middleware.RequireRole("admin"), handlers.UploadLearningVideo)
	// Serve uploaded videos (tenant-aware auth).
	api.Static("/uploads/learning-videos", "./uploads/learning-videos")

	// ── Profile / entity photos ─────────────────────────────────
	// Single generic upload endpoint used by admin, employee and student
	// forms. Query params: entity=user|employee|student, id=<row-id>.
	// The response { url } is persisted on the target row server-side.
	api.Post("/uploads/photo", middleware.Authenticate, handlers.UploadPhoto)
	// Serve uploaded photos publicly (image bytes are not sensitive).
	api.Static("/uploads/photos", "./uploads/photos")

	// ── Bulk Upload ─────────────────────────────────────────────
	// Generic CSV-driven create pipeline shared by every module that
	// offers the "bulk upload" button. Each resource is declared by a
	// Schema in handlers/bulk/schema_*.go — adding a new resource is
	// just a new file, no route plumbing required.
	bulkGrp := api.Group("/bulk", middleware.Authenticate)
	bulkGrp.Get("/resources", bulk.ListResources)
	// Generic guide-PDF renderer for the GraphQL-loop bulk dialogs whose
	// schemas live on the frontend. They POST the schema; the backend renders
	// the PDF via the shared pdf-template package.
	api.Post("/bulk-guides/pdf", middleware.Authenticate, handlers.BulkGuidePDF)
	bulkGrp.Get("/:resource/schema", bulk.Schemas)
	bulkGrp.Get("/:resource/template", bulk.DownloadTemplate)
	bulkGrp.Get("/:resource/docs", bulk.DownloadDocs)
	bulkGrp.Get("/:resource/starter-kit", bulk.DownloadStarterKit)
	bulkGrp.Post("/:resource/validate", bulk.ValidateRows)
	bulkGrp.Post("/:resource/submit", bulk.SubmitRows)

	// ── GraphQL ─────────────────────────────────────────────────
	// Authentication is mandatory: every operation needs a valid JWT.
	// Login itself happens over REST (/auth/login), so no unauthenticated
	// GraphQL access is required. Introspection is additionally disabled in
	// production inside graph.NewHandler.
	api.Post("/graphql", middleware.Authenticate, graph.NewHandler())
	if config.App.AppEnv != "production" {
		api.Get("/graphql", graph.NewPlayground())
	}
}
