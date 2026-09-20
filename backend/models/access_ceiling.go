package models

// Role ceilings for access modules.
//
// The access matrix decides who *may* reach a module, but each resolver's own
// `requireRole(...)` guard sits underneath it as a hard ceiling: the matrix can
// tighten access, never widen it past that guard. When the two disagree the
// user gets a page in their sidebar that answers "forbidden", or a button that
// 403s — the UI promised something the backend refuses.
//
// This file records those guards as data so the two cannot drift silently. Two
// maps, both listing only NON-ADMIN system roles (admin and super_admin pass
// every guard):
//
//	moduleViewRoles  — roles whose resolvers serve the module's page queries.
//	moduleWriteRoles — roles whose resolvers accept its create/edit mutations.
//	moduleDeleteRoles — override for the handful of modules where delete is
//	                    guarded more tightly than create/edit.
//
// A module absent from a map is unrestricted there (its resolvers take any
// authenticated user). A module present with an empty slice is admin-only.
//
// The ceiling is applied in three places, mirroring industry scoping in
// access_industries.go:
//   - MyAccess caps the caller's flags, so nav, the route guard and <Can>
//     hide what the backend would refuse;
//   - AccessMatrix shows capped cells as off;
//   - UpdateRoleAccess refuses to switch a capped cell on.
//
// Keeping it accurate: if you change a resolver's requireRole(...), update the
// module's entry here. TestModuleCeilingsCoverDefaults guards the obvious
// drift.
var moduleViewRoles = map[string][]string{
	// ── People ──────────────────────────────────────────────────────
	"admins":   {}, // users
	"students": {roleTeacherName, roleStaffName},

	// ── Academics ───────────────────────────────────────────────────
	"assignments":         {roleTeacherName}, // studentAssignments
	"attendance-summary":  {roleTeacherName},
	"attendance-shortage": {roleTeacherName},
	"attendance-export":   {roleTeacherName}, // reuses attendanceSummary

	// ── Exam Cell ───────────────────────────────────────────────────
	"hall-tickets": {roleTeacherName, roleStaffName},

	// ── Finance ─────────────────────────────────────────────────────
	// Payroll splits admin (payrolls) from self-service (myPayrolls), so
	// teacher/staff keep their payslip view and it needs no entry.
	"salary-templates":    {},
	"salary-assignments":  {},
	"fees":                {roleStaffName}, // studentFees
	"fee-dues":            {roleStaffName},
	"fee-students":        {roleStaffName},
	"fee-overview":        {roleStaffName},
	"chart-of-accounts":   {}, // accounts
	"ledger":              {}, // ledgerBatches / accountLedger / trialBalance
	"accounts-payable":    {}, // accountsPayableAging
	"accounts-receivable": {}, // accountsReceivableAging

	// ── Campus ──────────────────────────────────────────────────────
	"hostel":    {roleStaffName}, // hostelAllocations
	"transport": {roleStaffName}, // transportAllocations
	"mess":      {roleStaffName}, // messExpenses

	// ── Learning (isLearningAdmin) ──────────────────────────────────
	"learning":             {},
	"learning-assignments": {},

	// ── Reports ─────────────────────────────────────────────────────
	"reports-attendance": {roleTeacherName},
	"reports-marks":      {roleTeacherName},
	"reports-fees":       {roleStaffName},
	"reports-payroll":    {},
	"reports-leaves":     {},

	// ── Administration ──────────────────────────────────────────────
	"audit":          {}, // auditLogs
	"roles":          {}, // customRoles / systemRoles
	"access-control": {}, // accessMatrix
}

var moduleWriteRoles = map[string][]string{
	// ── People (every profile mutation is admin-only) ───────────────
	"admins":                 {},
	"employees":              {},
	"students":               {},
	"organization-structure": {}, // assignUserManager

	// ── Academics ───────────────────────────────────────────────────
	"marks":       {roleTeacherName},
	"results":     {}, // publishResults
	"courses":     {},
	"subjects":    {},
	"exams":       {},
	"exam-types":  {},
	"curriculum":  {},
	"grading":     {},
	"timetable":   {},
	"assignments": {roleTeacherName},

	// ── Exam Cell ───────────────────────────────────────────────────
	"question-bank":   {roleTeacherName},
	"question-papers": {roleTeacherName},
	"hall-tickets":    {roleStaffName}, // issueHallTickets

	// ── Operations ──────────────────────────────────────────────────
	"attendance":          {roleTeacherName}, // markAttendance / bulkMarkAttendance
	"attendance-summary":  {},
	"attendance-shortage": {},
	"attendance-export":   {},
	"leaves":              {}, // reviewLeave (applyLeave is self-service)
	"leave-types":         {},
	"duty-roster":         {roleStaffName},

	// ── Finance ─────────────────────────────────────────────────────
	"payroll":             {}, // generatePayroll
	"salary-templates":    {},
	"salary-assignments":  {},
	"fees":                {roleStaffName}, // recordFeePayment
	"fee-dues":            {roleStaffName},
	"fee-students":        {roleStaffName},
	"fee-overview":        {roleStaffName},
	"fee-categories":      {},
	"fee-structures":      {},
	"fee-addons":          {},
	"fee-allocations":     {},
	"chart-of-accounts":   {},
	"ledger":              {},
	"accounts-payable":    {},
	"accounts-receivable": {},

	// ── Campus ──────────────────────────────────────────────────────
	"hostel":         {}, // allocateHostelRoom
	"transport":      {},
	"mess":           {roleStaffName},
	"transport-live": {roleStaffName},
	"library":        {roleStaffName}, // issue/return; book CRUD is admin-only
	"events":         {},

	// ── Clinical (admin + clinician + support staff) ────────────────
	"patients":     {roleTeacherName, roleStaffName},
	"appointments": {roleTeacherName, roleStaffName},
	"encounters":   {roleTeacherName, roleStaffName},
	"admissions":   {roleTeacherName, roleStaffName},
	"nursing":      {roleTeacherName, roleStaffName},
	"triage":       {roleTeacherName, roleStaffName},
	"telemedicine": {roleTeacherName, roleStaffName},
	"referrals":    {roleTeacherName, roleStaffName},
	"dietary":      {roleTeacherName, roleStaffName},
	"laboratory":   {roleTeacherName, roleStaffName}, // orders/results; test catalog is staff
	"radiology":    {roleTeacherName, roleStaffName},
	"ot":           {roleTeacherName, roleStaffName},
	"bloodbank":    {roleTeacherName, roleStaffName}, // requests; unit ops are staff
	"ambulance":    {roleTeacherName, roleStaffName}, // dispatch; fleet CRUD is staff
	"billing":      {roleStaffName},
	"pharmacy":     {roleStaffName},
	"inventory":    {roleStaffName},
	"claims":       {roleStaffName},
	"schedules":    {roleStaffName},
	"wards":        {roleStaffName},

	// ── Procurement ─────────────────────────────────────────────────
	"vendors":         {roleStaffName},
	"purchase-orders": {roleStaffName},

	// ── Communications & Administration ─────────────────────────────
	"announcements":  {},
	"notifications":  {}, // sendNotification
	"holidays":       {},
	"calendar":       {},
	"departments":    {},
	"academic-years": {},
	"org":            {},
	"audit":          {},
	"roles":          {},
	"access-control": {},

	// ── Learning ────────────────────────────────────────────────────
	"learning":             {},
	"learning-assignments": {},
}

// moduleDeleteRoles overrides the write ceiling for modules whose delete is
// guarded more tightly than create/edit.
var moduleDeleteRoles = map[string][]string{
	"pharmacy":   {}, // deleteDrug is admin-only
	"encounters": {}, // deleteEncounter is admin-only
	"patients":   {}, // deletePatient is admin-only
	"payroll":    {}, // deletePayroll is admin-only
}

// Role names as plain strings, so callers compare without converting.
const (
	roleAdminName   = string(RoleAdmin)
	roleTeacherName = string(RoleTeacher)
	roleStudentName = string(RoleStudent)
	roleStaffName   = string(RoleStaff)
)

// roleAllowed reports whether a role appears in one of the ceiling maps for a
// module. An absent module is unrestricted; a present one lists its roles.
func roleAllowed(m map[string][]string, moduleID, role string) bool {
	roles, gated := m[moduleID]
	if !gated {
		return true
	}
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// RoleCeiling returns the most access a system role can ever have on a module,
// given the resolver guards behind it. Admins and super admins are uncapped.
func RoleCeiling(moduleID, role string) AccessFlags {
	if role == roleAdminName || role == string(RoleSuperAdmin) {
		return AccessFlags{View: true, Create: true, Edit: true, Delete: true}
	}
	if !roleAllowed(moduleViewRoles, moduleID, role) {
		return AccessFlags{} // cannot even open the page
	}
	write := roleAllowed(moduleWriteRoles, moduleID, role)
	del := write
	if _, overridden := moduleDeleteRoles[moduleID]; overridden {
		del = roleAllowed(moduleDeleteRoles, moduleID, role)
	}
	return AccessFlags{View: true, Create: write, Edit: write, Delete: del}
}

// ApplyRoleCeiling trims granted flags down to what the resolvers will honour.
func ApplyRoleCeiling(f AccessFlags, moduleID, role string) AccessFlags {
	return f.And(RoleCeiling(moduleID, role))
}
