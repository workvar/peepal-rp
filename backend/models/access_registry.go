package models

// AccessAction is one of the four CRUD verbs the matrix controls per module.
type AccessAction string

const (
	ActionView   AccessAction = "view"
	ActionCreate AccessAction = "create"
	ActionEdit   AccessAction = "edit"
	ActionDelete AccessAction = "delete"
)

// AccessFlags holds the four CRUD booleans for one (subject, module) pair.
type AccessFlags struct {
	View   bool
	Create bool
	Edit   bool
	Delete bool
}

// Can reports whether the flags permit the given action.
func (f AccessFlags) Can(a AccessAction) bool {
	switch a {
	case ActionView:
		return f.View
	case ActionCreate:
		return f.Create
	case ActionEdit:
		return f.Edit
	case ActionDelete:
		return f.Delete
	}
	return false
}

// And returns the intersection of two flag sets. Used to trim a grant down to
// a ceiling (see access_ceiling.go).
func (f AccessFlags) And(o AccessFlags) AccessFlags {
	return AccessFlags{
		View:   f.View && o.View,
		Create: f.Create && o.Create,
		Edit:   f.Edit && o.Edit,
		Delete: f.Delete && o.Delete,
	}
}

// Or returns the union (logical OR) of two flag sets. Used to merge a user's
// base-role access with any custom-role grant.
func (f AccessFlags) Or(o AccessFlags) AccessFlags {
	return AccessFlags{
		View:   f.View || o.View,
		Create: f.Create || o.Create,
		Edit:   f.Edit || o.Edit,
		Delete: f.Delete || o.Delete,
	}
}

// ModuleMeta describes one access-controllable module (≈ one page or page group
// in the app). DefaultRoles are the system roles that may VIEW the module out
// of the box; it mirrors the frontend BASE_MODULES `roles` arrays.
type ModuleMeta struct {
	ID           string
	Label        string
	Group        string
	DefaultRoles []string
}

// AccessModules is the canonical, ordered list of modules shown in the role
// access matrix. Keep the ids in sync with frontend constants/navigation.
var AccessModules = []ModuleMeta{
	// ── People ──────────────────────────────────────────────────────
	{"admins", "Admins", "People", []string{"admin"}},
	{"employees", "Employees", "People", []string{"admin", "staff"}},
	{"students", "Students", "People", []string{"admin", "teacher"}},
	{"organization-structure", "Org Structure", "People", []string{"admin", "teacher", "staff"}},

	// ── Academics ───────────────────────────────────────────────────
	{"marks", "Marks", "Academics", []string{"admin", "teacher", "student"}},
	{"results", "Results", "Academics", []string{"admin", "teacher", "student"}},
	{"courses", "Courses", "Academics", []string{"admin", "teacher"}},
	{"subjects", "Subjects", "Academics", []string{"admin", "teacher"}},
	{"exams", "Exam Schedules", "Academics", []string{"admin", "teacher"}},
	{"exam-types", "Exams", "Academics", []string{"admin", "teacher"}},
	{"curriculum", "Curriculum", "Academics", []string{"admin"}},
	// Student coursework (Phase 6). The student-facing view is the portal.
	{"assignments", "Assignments", "Academics", []string{"admin", "teacher"}},
	{"grading", "Grading", "Academics", []string{"admin"}},
	{"timetable", "Timetable", "Academics", []string{"admin", "teacher", "student", "staff"}},

	// ── Exam Cell (Phase 5; question bank → paper → hall ticket) ────
	{"question-bank", "Question Bank", "Exam Cell", []string{"admin", "teacher"}},
	{"question-papers", "Question Papers", "Exam Cell", []string{"admin", "teacher"}},
	{"hall-tickets", "Hall Tickets", "Exam Cell", []string{"admin", "staff"}},

	// ── Operations ──────────────────────────────────────────────────
	{"attendance", "Attendance", "Operations", []string{"admin", "teacher", "staff", "student"}},
	{"attendance-summary", "Attendance Summary", "Operations", []string{"admin", "teacher"}},
	{"attendance-shortage", "Shortage List", "Operations", []string{"admin"}},
	{"attendance-export", "Attendance Export", "Operations", []string{"admin"}},
	{"leaves", "Leaves", "Operations", []string{"admin", "teacher", "staff"}},
	{"leave-types", "Leave Types", "Operations", []string{"admin"}},
	{"my-approvals", "My Approvals", "Operations", []string{"admin", "teacher", "staff"}},
	{"approval-flows", "Approval Flows", "Operations", []string{"admin"}},
	{"approval-types", "Approval Types", "Operations", []string{"admin"}},
	// Duty roster (Phase 4; cross-industry — every vertical rosters staff).
	{"duty-roster", "Duty Roster", "Operations", []string{"admin", "staff"}},

	// ── Finance ─────────────────────────────────────────────────────
	{"payroll", "Payroll", "Finance", []string{"admin", "teacher", "staff"}},
	{"salary-templates", "Salary Templates", "Finance", []string{"admin"}},
	{"salary-assignments", "Salary Assignments", "Finance", []string{"admin"}},
	{"fees", "Fees", "Finance", []string{"admin", "staff"}},
	{"fee-structures", "Fee Structures", "Finance", []string{"admin"}},
	{"fee-dues", "Fee Dues", "Finance", []string{"admin", "staff"}},
	{"fee-categories", "Fee Categories", "Finance", []string{"admin"}},
	{"fee-addons", "Fee Add-ons", "Finance", []string{"admin"}},
	{"fee-allocations", "Fee Allocations", "Finance", []string{"admin"}},
	{"fee-students", "Student Fees", "Finance", []string{"admin", "staff"}},
	{"fee-overview", "Fee Overview", "Finance", []string{"admin", "staff"}},
	// Financial accounting (Phase 3; cross-industry). "Accountant" is a custom
	// per-tenant role granted view/edit on these — no new system role needed.
	{"chart-of-accounts", "Chart of Accounts", "Finance", []string{"admin"}},
	{"ledger", "General Ledger", "Finance", []string{"admin"}},
	{"accounts-payable", "Accounts Payable", "Finance", []string{"admin"}},
	{"accounts-receivable", "Accounts Receivable", "Finance", []string{"admin"}},

	// ── Campus ──────────────────────────────────────────────────────
	{"hostel", "Hostel", "Campus", []string{"admin", "staff"}},
	{"transport", "Transport", "Campus", []string{"admin", "staff"}},
	// Campus ops (Phase 6).
	{"mess", "Mess & Canteen", "Campus", []string{"admin", "staff"}},
	{"transport-live", "Live Transport", "Campus", []string{"admin", "staff"}},
	{"library", "Library", "Campus", []string{"admin", "teacher", "staff", "student"}},
	{"events", "Events", "Campus", []string{"admin", "teacher", "student", "staff"}},

	// ── Clinical (healthcare industry; see access_industries.go) ────
	{"patients", "Patients", "Clinical", []string{"admin", "teacher", "staff"}},
	{"appointments", "Appointments", "Clinical", []string{"admin", "teacher", "staff"}},
	{"encounters", "OPD Visits", "Clinical", []string{"admin", "teacher", "staff"}},
	{"billing", "Billing", "Clinical", []string{"admin", "staff"}},
	{"pharmacy", "Pharmacy", "Clinical", []string{"admin", "staff"}},
	// Clinicians get view here so a doctor can look up anyone's consulting
	// hours; the moduleWriteRoles ceiling still keeps create/edit/delete to
	// admin + staff.
	{"schedules", "Clinician Schedules", "Clinical", []string{"admin", "teacher", "staff"}},
	{"laboratory", "Laboratory", "Clinical", []string{"admin", "teacher", "staff"}},
	{"radiology", "Radiology", "Clinical", []string{"admin", "teacher", "staff"}},
	{"wards", "Wards & Beds", "Clinical", []string{"admin", "staff"}},
	{"admissions", "Admissions (IPD)", "Clinical", []string{"admin", "teacher", "staff"}},
	{"nursing", "Nursing Station", "Clinical", []string{"admin", "teacher", "staff"}},
	{"claims", "Insurance Claims", "Clinical", []string{"admin", "staff"}},
	{"inventory", "Inventory & Stores", "Clinical", []string{"admin", "staff"}},
	{"ot", "OT Scheduling", "Clinical", []string{"admin", "teacher", "staff"}},
	{"triage", "Emergency / Triage", "Clinical", []string{"admin", "teacher", "staff"}},
	{"bloodbank", "Blood Bank", "Clinical", []string{"admin", "staff"}},
	{"ambulance", "Ambulance", "Clinical", []string{"admin", "staff"}},
	{"dietary", "Dietary / Kitchen", "Clinical", []string{"admin", "teacher", "staff"}},
	{"telemedicine", "Telemedicine", "Clinical", []string{"admin", "teacher", "staff"}},
	{"referrals", "Referrals", "Clinical", []string{"admin", "teacher", "staff"}},

	// ── Procurement (all industries; untagged) ──────────────────────
	{"vendors", "Vendors", "Procurement", []string{"admin", "staff"}},
	{"purchase-orders", "Purchase Orders", "Procurement", []string{"admin", "staff"}},

	// ── Communications ──────────────────────────────────────────────
	{"announcements", "Notices", "Communications", []string{"admin", "teacher", "student", "staff"}},
	{"notifications", "Notifications", "Communications", []string{"admin", "teacher", "student", "staff"}},

	// ── Learning ────────────────────────────────────────────────────
	{"learning", "Goal Library", "Learning", []string{"admin"}},
	{"learning-assignments", "Learning Assignments", "Learning", []string{"admin"}},
	{"my-learning", "My Learning", "Learning", []string{"admin", "teacher", "student", "staff"}},

	// ── Reports ─────────────────────────────────────────────────────
	{"reports-attendance", "Attendance Report", "Reports", []string{"admin"}},
	{"reports-marks", "Marks Report", "Reports", []string{"admin"}},
	{"reports-fees", "Fee Report", "Reports", []string{"admin"}},
	{"reports-payroll", "Payroll Report", "Reports", []string{"admin"}},
	{"reports-leaves", "Leave Report", "Reports", []string{"admin"}},

	// ── Administration ──────────────────────────────────────────────
	{"audit", "Audit Trail", "Administration", []string{"admin"}},
	{"org", "Org Profile", "Administration", []string{"admin"}},
	{"departments", "Departments", "Administration", []string{"admin"}},
	{"academic-years", "Academic Years", "Administration", []string{"admin"}},
	{"roles", "Roles", "Administration", []string{"admin"}},
	{"access-control", "Access Control", "Administration", []string{"admin"}},
	{"holidays", "Holidays", "Administration", []string{"admin"}},
	{"calendar", "Calendar", "Administration", []string{"admin"}},

	// ── My Workspace ────────────────────────────────────────────────
	{"ask-peepalai", "Ask PeepalAI", "My Workspace", []string{"admin", "teacher", "student", "staff", "patient"}},
	{"portal", "My Portal", "My Workspace", []string{"student"}},
	{"my-fees", "My Fees", "My Workspace", []string{"student"}},
	{"my-grades", "My Grades", "My Workspace", []string{"student"}},
	{"my-hall-tickets", "My Hall Tickets", "My Workspace", []string{"student"}},
	// Phase 6 student self-service. Role-locked (see ROLE_LOCKED_MODULES in
	// lib/access.ts) so the admin blanket view grant doesn't surface them.
	{"my-assignments", "My Assignments", "My Workspace", []string{"student"}},
	{"my-mess", "Mess Menu", "My Workspace", []string{"student"}},
	{"patient-portal", "My Health", "My Workspace", []string{"patient"}},
	{"my-schedule", "My Schedule", "My Workspace", []string{"teacher", "staff"}},
	{"profile", "My Profile", "My Workspace", []string{"admin", "teacher", "student", "staff"}},
	{"docs", "Docs", "My Workspace", []string{"admin", "teacher", "staff"}},
}

var moduleByID = func() map[string]ModuleMeta {
	m := make(map[string]ModuleMeta, len(AccessModules))
	for _, mod := range AccessModules {
		m[mod.ID] = mod
	}
	return m
}()

// ModuleByID looks up a module's metadata by id.
func ModuleByID(id string) (ModuleMeta, bool) {
	mod, ok := moduleByID[id]
	return mod, ok
}

// DefaultSystemAccess returns the out-of-the-box CRUD flags for a built-in
// system role on a module.
//
//   - admin / super_admin → full access everywhere.
//   - other roles → may VIEW a module when listed in its DefaultRoles. Write
//     actions (create/edit/delete) default on for non-student roles that can
//     view (students are view-only by default).
//
// These defaults intentionally mirror today's behaviour so existing tenants
// keep working until an admin tightens access in the matrix.
func DefaultSystemAccess(role, moduleID string) AccessFlags {
	if role == string(RoleAdmin) || role == string(RoleSuperAdmin) {
		return AccessFlags{View: true, Create: true, Edit: true, Delete: true}
	}
	mod, ok := moduleByID[moduleID]
	if !ok {
		return AccessFlags{}
	}
	view := false
	for _, r := range mod.DefaultRoles {
		if r == role {
			view = true
			break
		}
	}
	write := view && role != string(RoleStudent)
	return AccessFlags{View: view, Create: write, Edit: write, Delete: write}
}
