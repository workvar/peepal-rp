package models

// Terminology is the label map that tailors UI copy to a tenant's vertical.
// The platform keeps a single generic data model (users, members, events, etc.),
// and this struct translates those generic concepts into the language the
// tenant's staff actually use.
//
// Example: the same underlying "student" record is labelled as "Student" for a
// college, "Employee" for a company, "Patient" for a clinic, and "Member" for
// an NGO.
type Terminology struct {
	// Organization-level nouns
	Organization       string `json:"organization"`        // e.g. "College", "Company"
	OrganizationPlural string `json:"organization_plural"` // e.g. "Colleges", "Companies"

	// Primary audience (the people the org serves)
	Member       string `json:"member"`        // singular — e.g. "Student", "Patient"
	MemberPlural string `json:"member_plural"` // plural   — e.g. "Students", "Patients"

	// Internal workforce (people who work at the org)
	Staff       string `json:"staff"`        // singular — e.g. "Teacher", "Employee"
	StaffPlural string `json:"staff_plural"` // plural   — e.g. "Teachers", "Employees"

	// Organizational unit (sub-division inside the org)
	Department       string `json:"department"`        // e.g. "Department", "Team", "Ward", "Program"
	DepartmentPlural string `json:"department_plural"` //

	// Academic / performance concepts (generalized)
	Course       string `json:"course"`        // "Course" / "Training" / "Program"
	CoursePlural string `json:"course_plural"` //

	// Attendance / Marks / Leaves labels — kept generic but can be overridden.
	Attendance string `json:"attendance"` // "Attendance" / "Shifts"
	Marks      string `json:"marks"`      // "Marks" / "Reviews" / "KPIs"
	Leave      string `json:"leave"`      // "Leave" / "Time Off"

	// Scheduling / grouping concepts. Education says class-batch-semester;
	// other verticals need the same slots under different names so shared
	// pages can be relabelled instead of hidden.
	Session       string `json:"session"`        // "Class" / "Session" / "Shift"
	SessionPlural string `json:"session_plural"` //
	Cohort        string `json:"cohort"`         // "Batch" / "Cohort" / "Group"
	CohortPlural  string `json:"cohort_plural"`  //
	Term          string `json:"term"`           // "Semester" / "Quarter" / "Cycle"
	TermPlural    string `json:"term_plural"`    //
	Year          string `json:"year"`           // "Academic Year" / "Financial Year"

	// Role display names. The DB role ids stay admin/teacher/student/staff
	// across every vertical; these are what the UI shows for them so a
	// hospital never renders the word "Teacher" or "Student".
	RoleStaff         string `json:"role_staff"`          // label for the `teacher` role
	RoleStaffPlural   string `json:"role_staff_plural"`   //
	RoleMember        string `json:"role_member"`         // label for the `student` role
	RoleMemberPlural  string `json:"role_member_plural"`  //
	RoleSupport       string `json:"role_support"`        // label for the `staff` role
	RoleSupportPlural string `json:"role_support_plural"` //
}
