package graph

import (
	"context"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/99designs/gqlgen/graphql"
)

// Central matrix enforcement.
//
// opAccess maps a root GraphQL field (query or mutation) to the module + action
// it requires. The accessFieldMiddleware checks every root field against this
// map and denies the request when the caller's effective access (from the role
// access matrix) does not permit it.
//
// Scope & safety:
//   - Admins / super admins are never restricted here.
//   - Existing per-resolver requireRole(...) checks stay in place as a floor, so
//     the matrix can tighten access below the historical defaults but never
//     grants past a resolver's own guard.
//   - Self-service operations (applyLeave, submitQuiz, recordOwn..., mark*Read,
//     my* queries) are intentionally NOT listed — they are governed by their own
//     resolver/owner checks so a view/write default never blocks a user acting
//     on their own data.
//   - A number of list queries double as cross-page lookups or feed
//     self-service forms (employees, students, users, departments, subjects,
//     courses, academicYears, semesters, timetable, leaveTypes, fee
//     categories/structures/allocations, salary templates/assignments). Their
//     VIEW is enforced on the client (nav + route guard via myAccess) but left
//     unenforced here so revoking a page never breaks an unrelated page's
//     dropdown or form. Their writes are still enforced.
var opAccess = map[string]struct {
	Module string
	Action models.AccessAction
}{
	// ── Students ────────────────────────────────────────────────────
	"createStudent":     {"students", models.ActionCreate},
	"updateStudent":     {"students", models.ActionEdit},
	"deleteStudent":     {"students", models.ActionDelete},
	"deleteAllStudents": {"students", models.ActionDelete},

	// ── Employees ───────────────────────────────────────────────────
	"createEmployee": {"employees", models.ActionCreate},
	"updateEmployee": {"employees", models.ActionEdit},
	"deleteEmployee": {"employees", models.ActionDelete},

	// ── Admins (login accounts; profiles are managed via student/employee) ──
	"createUser":     {"admins", models.ActionCreate},
	"updateUser":     {"admins", models.ActionEdit},
	"deactivateUser": {"admins", models.ActionEdit},
	"deleteUser":     {"admins", models.ActionDelete},
	// Granting extra workspaces is an identity change on a user account, so it
	// is gated by the same module as the rest of user administration.
	"setUserWorkspaceRoles": {"admins", models.ActionEdit},
	// Seeing where a user is signed in, and signing them out of it. Viewing is
	// a read of an account's state; revoking withdraws access, which is the
	// same authority as deactivating them. (The self-service mySessions /
	// revokeMy* pair is deliberately absent, like the other my* operations.)
	"userSessions":       {"admins", models.ActionView},
	"revokeUserSessions": {"admins", models.ActionEdit},

	// ── Courses ─────────────────────────────────────────────────────
	// `courses` (the list query) stays an unenforced cross-page lookup, per
	// the note above; only the writes are gated.
	"createCourse":      {"courses", models.ActionCreate},
	"updateCourse":      {"courses", models.ActionEdit},
	"deleteCourse":      {"courses", models.ActionDelete},
	"createCourseBatch": {"courses", models.ActionCreate},
	"deleteCourseBatch": {"courses", models.ActionDelete},

	// ── Subjects ────────────────────────────────────────────────────
	"createSubject": {"subjects", models.ActionCreate},
	"updateSubject": {"subjects", models.ActionEdit},
	"deleteSubject": {"subjects", models.ActionDelete},

	// ── Exam schedules ──────────────────────────────────────────────
	"createExamSchedule":  {"exams", models.ActionCreate},
	"updateExamSchedule":  {"exams", models.ActionEdit},
	"publishExamSchedule": {"exams", models.ActionEdit},
	"deleteExamSchedule":  {"exams", models.ActionDelete},

	// ── Exam types (assessment definitions; examTypes query stays
	//    unenforced so it can feed the marks dropdown) ────────────────
	"createExamType": {"exam-types", models.ActionCreate},
	"updateExamType": {"exam-types", models.ActionEdit},
	"deleteExamType": {"exam-types", models.ActionDelete},

	// ── Curriculum (subject→semester assignments; query stays unenforced) ──
	"setCurriculumSubjects": {"curriculum", models.ActionEdit},

	// ── Exam cell: question bank. The questionBank query stays unenforced
	//    so the paper generator's pool preview works for any author. ──
	"createQuestionBankItem": {"question-bank", models.ActionCreate},
	"updateQuestionBankItem": {"question-bank", models.ActionEdit},
	"deleteQuestionBankItem": {"question-bank", models.ActionDelete},

	// ── Exam cell: question papers ──────────────────────────────────
	"questionPapers":        {"question-papers", models.ActionView},
	"generateQuestionPaper": {"question-papers", models.ActionCreate},
	"finalizeQuestionPaper": {"question-papers", models.ActionEdit},
	"deleteQuestionPaper":   {"question-papers", models.ActionDelete},

	// ── Exam cell: hall tickets (myHallTickets is student self-service) ──
	"hallTickets":           {"hall-tickets", models.ActionView},
	"issueHallTickets":      {"hall-tickets", models.ActionCreate},
	"revokeHallTicket":      {"hall-tickets", models.ActionDelete},
	"releaseHallTicketHold": {"hall-tickets", models.ActionEdit},

	// ── Marks ───────────────────────────────────────────────────────
	"marks":          {"marks", models.ActionView},
	"createMark":     {"marks", models.ActionCreate},
	"publishResults": {"marks", models.ActionEdit},

	// ── Grading scheme (studentAcademicResult is self-service / owner-checked) ──
	"saveGradingScheme": {"grading", models.ActionEdit},

	// ── Attendance ──────────────────────────────────────────────────
	"attendance":               {"attendance", models.ActionView},
	"markAttendance":           {"attendance", models.ActionCreate},
	"bulkMarkAttendance":       {"attendance", models.ActionCreate},
	"updateAttendanceSettings": {"attendance", models.ActionEdit},
	"attendanceSummary":        {"attendance-summary", models.ActionView},
	"attendanceShortage":       {"attendance-shortage", models.ActionView},

	// ── Leaves ──────────────────────────────────────────────────────
	"leaves":          {"leaves", models.ActionView},
	"reviewLeave":     {"leaves", models.ActionEdit},
	"createLeaveType": {"leave-types", models.ActionCreate},
	"updateLeaveType": {"leave-types", models.ActionEdit},
	"deleteLeaveType": {"leave-types", models.ActionDelete},

	// ── Timetable ───────────────────────────────────────────────────
	"createTimetableSlot":      {"timetable", models.ActionCreate},
	"updateTimetableSlot":      {"timetable", models.ActionEdit},
	"deleteTimetableSlot":      {"timetable", models.ActionDelete},
	"bulkCreateTimetableSlots": {"timetable", models.ActionCreate},

	// ── Payroll ─────────────────────────────────────────────────────
	"payrolls":            {"payroll", models.ActionView},
	"generatePayroll":     {"payroll", models.ActionCreate},
	"updatePayrollStatus": {"payroll", models.ActionEdit},
	"deletePayroll":       {"payroll", models.ActionDelete},

	// ── Salary templates / assignments ──────────────────────────────
	"createSalaryTemplate":     {"salary-templates", models.ActionCreate},
	"updateSalaryTemplate":     {"salary-templates", models.ActionEdit},
	"deleteSalaryTemplate":     {"salary-templates", models.ActionDelete},
	"assignSalaryTemplate":     {"salary-assignments", models.ActionCreate},
	"bulkAssignSalaryTemplate": {"salary-assignments", models.ActionCreate},
	"updateSalaryAssignment":   {"salary-assignments", models.ActionEdit},
	"deleteSalaryAssignment":   {"salary-assignments", models.ActionDelete},

	// ── Fees: payments & student fees (the "Fees" page) ─────────────
	"feePayments":              {"fees", models.ActionView},
	"studentFees":              {"fees", models.ActionView},
	"recordFeePayment":         {"fees", models.ActionCreate},
	"cancelFeePayment":         {"fees", models.ActionEdit},
	"addStudentFeeDiscount":    {"fees", models.ActionEdit},
	"removeStudentFeeDiscount": {"fees", models.ActionEdit},
	"addStudentFeeAddOn":       {"fees", models.ActionEdit},
	"removeStudentFeeAddOn":    {"fees", models.ActionEdit},

	// ── Finance: chart of accounts / general ledger (Phase 3) ───────
	// Writes on the chart + manual journals require chart-of-accounts.
	"createAccount":       {"chart-of-accounts", models.ActionCreate},
	"updateAccount":       {"chart-of-accounts", models.ActionEdit},
	"deleteAccount":       {"chart-of-accounts", models.ActionDelete},
	"createManualJournal": {"chart-of-accounts", models.ActionCreate},
	// Reads: chart list gated by chart-of-accounts; ledger + statements by ledger.
	"accounts":      {"chart-of-accounts", models.ActionView},
	"account":       {"chart-of-accounts", models.ActionView},
	"ledgerBatches": {"ledger", models.ActionView},
	"accountLedger": {"ledger", models.ActionView},
	"trialBalance":  {"ledger", models.ActionView},
	"profitAndLoss": {"ledger", models.ActionView},
	"balanceSheet":  {"ledger", models.ActionView},
	// AR / AP aging gated by their own modules.
	"accountsReceivableAging": {"accounts-receivable", models.ActionView},
	"accountsPayableAging":    {"accounts-payable", models.ActionView},

	// ── Fee categories ──────────────────────────────────────────────
	"createFeeCategory": {"fee-categories", models.ActionCreate},
	"updateFeeCategory": {"fee-categories", models.ActionEdit},
	"deleteFeeCategory": {"fee-categories", models.ActionDelete},

	// ── Fee structures / allocations / add-ons (Fee Structures page) ─
	"createFeeStructure":  {"fee-structures", models.ActionCreate},
	"updateFeeStructure":  {"fee-structures", models.ActionEdit},
	"deleteFeeStructure":  {"fee-structures", models.ActionDelete},
	"cloneFeeStructure":   {"fee-structures", models.ActionCreate},
	"createFeeAllocation": {"fee-structures", models.ActionCreate},
	"updateFeeAllocation": {"fee-structures", models.ActionEdit},
	"deleteFeeAllocation": {"fee-structures", models.ActionDelete},
	"syncFeeAllocation":   {"fee-structures", models.ActionEdit},
	"createFeeAddOn":      {"fee-structures", models.ActionCreate},
	"updateFeeAddOn":      {"fee-structures", models.ActionEdit},
	"deleteFeeAddOn":      {"fee-structures", models.ActionDelete},

	// ── Hostel ──────────────────────────────────────────────────────
	"hostelBlocks":                {"hostel", models.ActionView},
	"hostelRooms":                 {"hostel", models.ActionView},
	"hostelAllocations":           {"hostel", models.ActionView},
	"roomClasses":                 {"hostel", models.ActionView},
	"createHostelBlock":           {"hostel", models.ActionCreate},
	"bulkDeleteHostelBlocks":      {"hostel", models.ActionDelete},
	"createHostelRoom":            {"hostel", models.ActionCreate},
	"updateHostelRoom":            {"hostel", models.ActionEdit},
	"bulkDeleteHostelRooms":       {"hostel", models.ActionDelete},
	"allocateHostelRoom":          {"hostel", models.ActionCreate},
	"vacateHostelRoom":            {"hostel", models.ActionEdit},
	"bulkDeleteHostelAllocations": {"hostel", models.ActionDelete},
	"createRoomClass":             {"hostel", models.ActionCreate},
	"updateRoomClass":             {"hostel", models.ActionEdit},
	"deleteRoomClass":             {"hostel", models.ActionDelete},
	"bulkDeleteRoomClasses":       {"hostel", models.ActionDelete},

	// ── Transport ───────────────────────────────────────────────────
	"transportRoutes":                {"transport", models.ActionView},
	"transportVehicles":              {"transport", models.ActionView},
	"transportAllocations":           {"transport", models.ActionView},
	"createTransportRoute":           {"transport", models.ActionCreate},
	"updateTransportRoute":           {"transport", models.ActionEdit},
	"deleteTransportRoute":           {"transport", models.ActionDelete},
	"bulkDeleteTransportRoutes":      {"transport", models.ActionDelete},
	"createTransportVehicle":         {"transport", models.ActionCreate},
	"updateTransportVehicle":         {"transport", models.ActionEdit},
	"deleteTransportVehicle":         {"transport", models.ActionDelete},
	"bulkDeleteTransportVehicles":    {"transport", models.ActionDelete},
	"allocateTransportVehicle":       {"transport", models.ActionCreate},
	"removeTransportAllocation":      {"transport", models.ActionEdit},
	"bulkDeleteTransportAllocations": {"transport", models.ActionDelete},

	// ── Library ─────────────────────────────────────────────────────
	"libraryBooks":      {"library", models.ActionView},
	"libraryIssues":     {"library", models.ActionView},
	"libraryOverdue":    {"library", models.ActionView},
	"createLibraryBook": {"library", models.ActionCreate},
	"updateLibraryBook": {"library", models.ActionEdit},
	"deleteLibraryBook": {"library", models.ActionDelete},
	"issueLibraryBook":  {"library", models.ActionCreate},
	"returnLibraryBook": {"library", models.ActionEdit},

	// ── Events ──────────────────────────────────────────────────────
	"createEvent": {"events", models.ActionCreate},
	"updateEvent": {"events", models.ActionEdit},
	"deleteEvent": {"events", models.ActionDelete},

	// ── Announcements / notifications ───────────────────────────────
	"allAnnouncements":   {"announcements", models.ActionView},
	"createAnnouncement": {"announcements", models.ActionCreate},
	"updateAnnouncement": {"announcements", models.ActionEdit},
	"deleteAnnouncement": {"announcements", models.ActionDelete},
	"sendNotification":   {"notifications", models.ActionCreate},

	// ── Learning ────────────────────────────────────────────────────
	"learningGoals":            {"learning", models.ActionView},
	"learningGoal":             {"learning", models.ActionView},
	"createLearningGoal":       {"learning", models.ActionCreate},
	"updateLearningGoal":       {"learning", models.ActionEdit},
	"deleteLearningGoal":       {"learning", models.ActionDelete},
	"createLearningSection":    {"learning", models.ActionCreate},
	"updateLearningSection":    {"learning", models.ActionEdit},
	"deleteLearningSection":    {"learning", models.ActionDelete},
	"createLearningUnit":       {"learning", models.ActionCreate},
	"updateLearningUnit":       {"learning", models.ActionEdit},
	"deleteLearningUnit":       {"learning", models.ActionDelete},
	"createLearningAssignment": {"learning", models.ActionCreate},
	"updateLearningAssignment": {"learning", models.ActionEdit},
	"deleteLearningAssignment": {"learning", models.ActionDelete},
	"createLearningQuestion":   {"learning", models.ActionCreate},
	"updateLearningQuestion":   {"learning", models.ActionEdit},
	"deleteLearningQuestion":   {"learning", models.ActionDelete},
	"assignGoalToDepartment":   {"learning-assignments", models.ActionCreate},
	"removeGoalAssignment":     {"learning-assignments", models.ActionDelete},

	// ── Clinical (healthcare industry; reads enforced too — medical
	//    records are sensitive, unlike cross-page lookup lists) ──────
	"patients":          {"patients", models.ActionView},
	"patientsCount":     {"patients", models.ActionView},
	"patient":           {"patients", models.ActionView},
	"createPatient":     {"patients", models.ActionCreate},
	"updatePatient":     {"patients", models.ActionEdit},
	"deletePatient":     {"patients", models.ActionDelete},
	"appointments":      {"appointments", models.ActionView},
	"createAppointment": {"appointments", models.ActionCreate},
	"updateAppointment": {"appointments", models.ActionEdit},
	"deleteAppointment": {"appointments", models.ActionDelete},
	"encounters":        {"encounters", models.ActionView},
	"encounter":         {"encounters", models.ActionView},
	"createEncounter":   {"encounters", models.ActionCreate},
	"updateEncounter":   {"encounters", models.ActionEdit},
	"deleteEncounter":   {"encounters", models.ActionDelete},

	// ── Clinical billing ────────────────────────────────────────────
	"billableServices":      {"billing", models.ActionView},
	"invoices":              {"billing", models.ActionView},
	"invoice":               {"billing", models.ActionView},
	"createBillableService": {"billing", models.ActionCreate},
	"updateBillableService": {"billing", models.ActionEdit},
	"deleteBillableService": {"billing", models.ActionDelete},
	"createInvoice":         {"billing", models.ActionCreate},
	"cancelInvoice":         {"billing", models.ActionEdit},
	"recordInvoicePayment":  {"billing", models.ActionCreate},

	// ── Pharmacy ────────────────────────────────────────────────────
	"drugs":           {"pharmacy", models.ActionView},
	"dispenses":       {"pharmacy", models.ActionView},
	"createDrug":      {"pharmacy", models.ActionCreate},
	"updateDrug":      {"pharmacy", models.ActionEdit},
	"deleteDrug":      {"pharmacy", models.ActionDelete},
	"adjustDrugStock": {"pharmacy", models.ActionEdit},
	"createDispense":  {"pharmacy", models.ActionCreate},
	"drugBatches":     {"pharmacy", models.ActionView},
	"expiringDrugs":   {"pharmacy", models.ActionView},

	// ── Procurement (vendors + purchase orders/invoices) ────────────
	// vendors (read) stays unenforced: PO forms use it as a dropdown.
	"createVendor":           {"vendors", models.ActionCreate},
	"updateVendor":           {"vendors", models.ActionEdit},
	"deleteVendor":           {"vendors", models.ActionDelete},
	"purchaseOrders":         {"purchase-orders", models.ActionView},
	"purchaseOrder":          {"purchase-orders", models.ActionView},
	"purchaseInvoices":       {"purchase-orders", models.ActionView},
	"createPurchaseOrder":    {"purchase-orders", models.ActionCreate},
	"updatePurchaseOrder":    {"purchase-orders", models.ActionEdit},
	"setPurchaseOrderStatus": {"purchase-orders", models.ActionEdit},
	"receivePurchaseOrder":   {"purchase-orders", models.ActionEdit},
	"createPurchaseInvoice":  {"purchase-orders", models.ActionCreate},
	"recordPurchasePayment":  {"purchase-orders", models.ActionEdit},
	"deletePurchaseInvoice":  {"purchase-orders", models.ActionDelete},

	// ── Laboratory (LIS) ────────────────────────────────────────────
	"labTests":        {"laboratory", models.ActionView},
	"labOrders":       {"laboratory", models.ActionView},
	"labOrder":        {"laboratory", models.ActionView},
	"createLabTest":   {"laboratory", models.ActionCreate},
	"updateLabTest":   {"laboratory", models.ActionEdit},
	"deleteLabTest":   {"laboratory", models.ActionDelete},
	"createLabOrder":  {"laboratory", models.ActionCreate},
	"enterLabResults": {"laboratory", models.ActionEdit},
	"cancelLabOrder":  {"laboratory", models.ActionEdit},

	// ── Radiology ───────────────────────────────────────────────────
	"radiologyStudies":        {"radiology", models.ActionView},
	"radiologyOrders":         {"radiology", models.ActionView},
	"radiologyOrder":          {"radiology", models.ActionView},
	"createRadiologyStudy":    {"radiology", models.ActionCreate},
	"updateRadiologyStudy":    {"radiology", models.ActionEdit},
	"deleteRadiologyStudy":    {"radiology", models.ActionDelete},
	"createRadiologyOrder":    {"radiology", models.ActionCreate},
	"setRadiologyOrderStatus": {"radiology", models.ActionEdit},
	"reportRadiologyOrder":    {"radiology", models.ActionEdit},

	// ── Wards & Beds ────────────────────────────────────────────────
	"wards":      {"wards", models.ActionView},
	"ward":       {"wards", models.ActionView},
	"beds":       {"wards", models.ActionView},
	"createWard": {"wards", models.ActionCreate},
	"updateWard": {"wards", models.ActionEdit},
	"deleteWard": {"wards", models.ActionDelete},
	"createBed":  {"wards", models.ActionCreate},
	"updateBed":  {"wards", models.ActionEdit},
	"deleteBed":  {"wards", models.ActionDelete},

	// ── Admissions / ADT ────────────────────────────────────────────
	"admissions":         {"admissions", models.ActionView},
	"admission":          {"admissions", models.ActionView},
	"createAdmission":    {"admissions", models.ActionCreate},
	"transferAdmission":  {"admissions", models.ActionEdit},
	"dischargeAdmission": {"admissions", models.ActionEdit},

	// ── Nursing station (vitals + MAR) ──────────────────────────────
	"vitalsRecords":                  {"nursing", models.ActionView},
	"medicationOrders":               {"nursing", models.ActionView},
	"recordVitals":                   {"nursing", models.ActionCreate},
	"createMedicationOrder":          {"nursing", models.ActionCreate},
	"discontinueMedicationOrder":     {"nursing", models.ActionEdit},
	"recordMedicationAdministration": {"nursing", models.ActionCreate},

	// ── Insurance / TPA claims ──────────────────────────────────────
	"insurancePayers":      {"claims", models.ActionView},
	"insuranceClaims":      {"claims", models.ActionView},
	"insuranceClaim":       {"claims", models.ActionView},
	"createInsurancePayer": {"claims", models.ActionCreate},
	"updateInsurancePayer": {"claims", models.ActionEdit},
	"deleteInsurancePayer": {"claims", models.ActionDelete},
	"createInsuranceClaim": {"claims", models.ActionCreate},
	"updateInsuranceClaim": {"claims", models.ActionEdit},
	"deleteInsuranceClaim": {"claims", models.ActionDelete},
	"settleInsuranceClaim": {"claims", models.ActionEdit},

	// ── Inventory & stores ──────────────────────────────────────────
	"inventoryItems":       {"inventory", models.ActionView},
	"stockTransactions":    {"inventory", models.ActionView},
	"createInventoryItem":  {"inventory", models.ActionCreate},
	"updateInventoryItem":  {"inventory", models.ActionEdit},
	"deleteInventoryItem":  {"inventory", models.ActionDelete},
	"receiveStock":         {"inventory", models.ActionEdit},
	"adjustInventoryStock": {"inventory", models.ActionEdit},
	"issueToPharmacy":      {"inventory", models.ActionEdit},

	// ── OT scheduling ───────────────────────────────────────────────
	"operationTheatres":      {"ot", models.ActionView},
	"surgeries":              {"ot", models.ActionView},
	"createOperationTheatre": {"ot", models.ActionCreate},
	"updateOperationTheatre": {"ot", models.ActionEdit},
	"deleteOperationTheatre": {"ot", models.ActionDelete},
	"scheduleSurgery":        {"ot", models.ActionCreate},
	"setSurgeryStatus":       {"ot", models.ActionEdit},
	"cancelSurgery":          {"ot", models.ActionEdit},

	// ── Emergency / Triage ──────────────────────────────────────────
	"triageCases":      {"triage", models.ActionView},
	"createTriageCase": {"triage", models.ActionCreate},
	"updateTriageCase": {"triage", models.ActionEdit},

	// ── Blood bank ──────────────────────────────────────────────────
	"bloodUnits":            {"bloodbank", models.ActionView},
	"bloodRequests":         {"bloodbank", models.ActionView},
	"addBloodUnit":          {"bloodbank", models.ActionCreate},
	"updateBloodUnitStatus": {"bloodbank", models.ActionEdit},
	"issueBloodUnit":        {"bloodbank", models.ActionEdit},
	"deleteBloodUnit":       {"bloodbank", models.ActionDelete},
	"createBloodRequest":    {"bloodbank", models.ActionCreate},
	"fulfillBloodRequest":   {"bloodbank", models.ActionEdit},
	"cancelBloodRequest":    {"bloodbank", models.ActionEdit},

	// ── Ambulance ───────────────────────────────────────────────────
	"ambulances":            {"ambulance", models.ActionView},
	"ambulanceTrips":        {"ambulance", models.ActionView},
	"createAmbulance":       {"ambulance", models.ActionCreate},
	"updateAmbulance":       {"ambulance", models.ActionEdit},
	"deleteAmbulance":       {"ambulance", models.ActionDelete},
	"dispatchAmbulance":     {"ambulance", models.ActionCreate},
	"completeAmbulanceTrip": {"ambulance", models.ActionEdit},
	"cancelAmbulanceTrip":   {"ambulance", models.ActionEdit},

	// ── Dietary / kitchen ───────────────────────────────────────────
	"dietPlans":           {"dietary", models.ActionView},
	"createDietPlan":      {"dietary", models.ActionCreate},
	"updateDietPlan":      {"dietary", models.ActionEdit},
	"discontinueDietPlan": {"dietary", models.ActionEdit},
	"recordMealServing":   {"dietary", models.ActionCreate},

	// ── Telemedicine ────────────────────────────────────────────────
	"teleConsults":        {"telemedicine", models.ActionView},
	"scheduleTeleConsult": {"telemedicine", models.ActionCreate},
	"updateTeleConsult":   {"telemedicine", models.ActionEdit},
	"cancelTeleConsult":   {"telemedicine", models.ActionEdit},

	// ── Referrals ───────────────────────────────────────────────────
	"referrals":             {"referrals", models.ActionView},
	"createReferral":        {"referrals", models.ActionCreate},
	"setReferralStatus":     {"referrals", models.ActionEdit},
	"deleteReferral":        {"referrals", models.ActionDelete},
	"setReferralCommission": {"referrals", models.ActionEdit},
	"settleReferral":        {"referrals", models.ActionEdit},

	// ── Audit trail ─────────────────────────────────────────────────
	"auditLogs": {"audit", models.ActionView},

	// ── Ask PeepalAI (NL→SQL; per-table scoping happens inside the
	//    resolver on top of this module-level gate) ──────────────────
	"askPeepalAI": {"ask-peepalai", models.ActionView},

	// ── Patient login (admin manages a patient's account) ───────────
	"createPatientLogin": {"patients", models.ActionEdit},

	// ── Clinician schedules (list stays unenforced — it feeds the
	//    appointment form's availability hint) ───────────────────────
	"createClinicianSchedule": {"schedules", models.ActionCreate},
	"updateClinicianSchedule": {"schedules", models.ActionEdit},
	"deleteClinicianSchedule": {"schedules", models.ActionDelete},

	// ── Duty roster (list stays unenforced — resolver self-scopes non-admins
	//    to their own shifts, same as MyPayrolls) ────────────────────
	// ── Student life & campus ops (Phase 6) ─────────────────────────
	// myAssignments / submitAssignment / myMessMenu / liveVehicles are
	// deliberately absent: they are self-service or dashboard reads guarded
	// by their own owner checks.
	"createStudentAssignment":   {"assignments", models.ActionCreate},
	"updateStudentAssignment":   {"assignments", models.ActionEdit},
	"publishStudentAssignment":  {"assignments", models.ActionEdit},
	"closeStudentAssignment":    {"assignments", models.ActionEdit},
	"deleteStudentAssignment":   {"assignments", models.ActionDelete},
	"gradeAssignmentSubmission": {"assignments", models.ActionEdit},

	"setMessMenu":        {"mess", models.ActionEdit},
	"deleteMessMenu":     {"mess", models.ActionDelete},
	"markMessAttendance": {"mess", models.ActionCreate},
	"createMessExpense":  {"mess", models.ActionCreate},
	"updateMessExpense":  {"mess", models.ActionEdit},
	"deleteMessExpense":  {"mess", models.ActionDelete},

	"pingVehicleLocation":    {"transport-live", models.ActionEdit},
	"markDriverAttendance":   {"transport-live", models.ActionCreate},
	"driverCheckIn":          {"transport-live", models.ActionCreate},
	"driverCheckOut":         {"transport-live", models.ActionEdit},
	"deleteDriverAttendance": {"transport-live", models.ActionDelete},

	"createDutyRoster":  {"duty-roster", models.ActionCreate},
	"updateDutyRoster":  {"duty-roster", models.ActionEdit},
	"deleteDutyRoster":  {"duty-roster", models.ActionDelete},
	"bulkSetDutyRoster": {"duty-roster", models.ActionCreate},

	// ── Reports ─────────────────────────────────────────────────────
	"attendanceReport": {"reports-attendance", models.ActionView},
	"marksReport":      {"reports-marks", models.ActionView},
	"feeReport":        {"reports-fees", models.ActionView},
	"payrollReport":    {"reports-payroll", models.ActionView},
	"leaveReport":      {"reports-leaves", models.ActionView},

	// ── Departments ─────────────────────────────────────────────────
	"createDepartment": {"departments", models.ActionCreate},
	"updateDepartment": {"departments", models.ActionEdit},
	"deleteDepartment": {"departments", models.ActionDelete},

	// ── Academic years / semesters ──────────────────────────────────
	"createAcademicYear":     {"academic-years", models.ActionCreate},
	"updateAcademicYear":     {"academic-years", models.ActionEdit},
	"deleteAcademicYear":     {"academic-years", models.ActionDelete},
	"setCurrentAcademicYear": {"academic-years", models.ActionEdit},
	"createSemester":         {"academic-years", models.ActionCreate},
	"deleteSemester":         {"academic-years", models.ActionDelete},

	// ── Roles & access ──────────────────────────────────────────────
	"customRoles":          {"roles", models.ActionView},
	"createCustomRole":     {"roles", models.ActionCreate},
	"updateCustomRole":     {"roles", models.ActionEdit},
	"deleteCustomRole":     {"roles", models.ActionDelete},
	"assignUserCustomRole": {"roles", models.ActionEdit},

	// ── Org profile ─────────────────────────────────────────────────
	"updateOrgProfile": {"org", models.ActionEdit},

	// ── Holidays / calendar ─────────────────────────────────────────
	"createHoliday":              {"holidays", models.ActionCreate},
	"deleteHoliday":              {"holidays", models.ActionDelete},
	"bulkDeleteHolidays":         {"holidays", models.ActionDelete},
	"copyHolidaysToAcademicYear": {"holidays", models.ActionCreate},
	"updateCalendarSettings":     {"calendar", models.ActionEdit},
	"generateCalendar":           {"calendar", models.ActionCreate},
	"upsertCalendarDay":          {"calendar", models.ActionEdit},
}

// accessFieldMiddleware enforces the matrix on every root query/mutation field.
// Non-root fields and unmapped operations pass straight through.
func accessFieldMiddleware(ctx context.Context, next graphql.Resolver) (interface{}, error) {
	fc := graphql.GetFieldContext(ctx)
	if fc != nil && (fc.Object == "Query" || fc.Object == "Mutation") {
		if spec, ok := opAccess[fc.Field.Name]; ok {
			// Industry entitlement runs first: a module belonging to another
			// industry (Marks for a hospital, Patients for a college) is
			// unavailable to everyone in the org. Then subscription entitlement
			// binds everyone (admins included) — a feature the org didn't buy is
			// unavailable regardless of role. The role matrix then refines
			// access within it.
			if err := enforceIndustryModule(ctx, spec.Module); err != nil {
				return nil, err
			}
			if err := enforceSubscriptionModule(ctx, spec.Module); err != nil {
				return nil, err
			}
			if err := enforceAccess(ctx, spec.Module, spec.Action); err != nil {
				return nil, err
			}
		}
	}
	res, err := next(ctx)
	// Audit trail (Phase 5): record every successful root mutation.
	if err == nil && fc != nil && fc.Object == "Mutation" {
		recordMutationAudit(ctx, fc)
	}
	return res, err
}

// enforceIndustryModule denies an operation when the module belongs to a
// different industry than the caller's tenant (see models/access_industries.go).
// Applies to every role; only the platform super admin is exempt.
func enforceIndustryModule(ctx context.Context, accessModuleID string) error {
	auth := AuthFromCtx(ctx)
	if auth.UserID == "" {
		return ErrUnauthorized
	}
	if auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin) {
		return nil
	}
	if !models.ModuleAllowedForIndustry(accessModuleID, models.TenantTypeOf(database.DB, auth.TenantID)) {
		return ErrForbidden
	}
	return nil
}

// enforceSubscriptionModule denies an operation when the caller's organisation
// is not subscribed to the module it belongs to. Applies to every role in the
// org, including admin; only the platform super admin (who operates across
// tenants) is exempt. Core modules return "" from the mapping and always pass.
func enforceSubscriptionModule(ctx context.Context, accessModuleID string) error {
	auth := AuthFromCtx(ctx)
	if auth.UserID == "" {
		return ErrUnauthorized
	}
	if auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin) {
		return nil
	}
	if !models.TenantAllowsAccessModule(database.DB, auth.TenantID, accessModuleID) {
		return ErrForbidden
	}
	return nil
}

// enforceAccess returns ErrForbidden when the caller's effective access does not
// permit the action on the module. Admins are never restricted. A stored
// AccessRule overrides the registry default; if the base role is denied, a
// linked custom role may still grant the action.
func enforceAccess(ctx context.Context, moduleID string, action models.AccessAction) error {
	auth := AuthFromCtx(ctx)
	if auth.UserID == "" {
		return ErrUnauthorized
	}
	if auth.IsSuperAdmin || auth.Role == string(models.RoleSuperAdmin) || auth.Role == string(models.RoleAdmin) {
		return nil
	}

	db := database.DB
	flags := models.DefaultSystemAccess(auth.Role, moduleID)
	var sysRule models.AccessRule
	if err := db.Where(
		"tenant_id = ? AND subject_type = ? AND subject_key = ? AND module = ?",
		auth.TenantID, models.SubjectSystem, auth.Role, moduleID,
	).First(&sysRule).Error; err == nil {
		flags = sysRule.Flags()
	}
	if flags.Can(action) {
		return nil
	}

	// Base role denies — a linked custom role may still grant the action.
	if customID := userCustomRoleID(db, auth.UserID, auth.Role); customID != "" {
		var cRule models.AccessRule
		if err := db.Where(
			"tenant_id = ? AND subject_type = ? AND subject_key = ? AND module = ?",
			auth.TenantID, models.SubjectCustom, customID, moduleID,
		).First(&cRule).Error; err == nil && cRule.Flags().Can(action) {
			return nil
		}
	}
	return ErrForbidden
}
