package models

// DefaultTerminology returns the label map for a given tenant type. Unknown
// types fall back to Education (the platform's historical default).
func DefaultTerminology(t TenantType) Terminology {
	switch t.Canonical() {
	case TenantTypeCorporate:
		return corporateTerminology
	case TenantTypeHealthcare:
		return healthcareTerminology
	case TenantTypeNonprofit:
		return nonprofitTerminology
	default:
		return educationTerminology
	}
}

var educationTerminology = Terminology{
	Organization: "Institute", OrganizationPlural: "Institutes",
	Member: "Student", MemberPlural: "Students",
	Staff: "Teacher", StaffPlural: "Teachers",
	Department: "Department", DepartmentPlural: "Departments",
	Course: "Course", CoursePlural: "Courses",
	Attendance: "Attendance", Marks: "Marks", Leave: "Leave",
	Session: "Class", SessionPlural: "Classes",
	Cohort: "Batch", CohortPlural: "Batches",
	Term: "Semester", TermPlural: "Semesters",
	Year:      "Academic Year",
	RoleStaff: "Teacher", RoleStaffPlural: "Teachers",
	RoleMember: "Student", RoleMemberPlural: "Students",
	RoleSupport: "Staff", RoleSupportPlural: "Staff",
}

var corporateTerminology = Terminology{
	Organization: "Company", OrganizationPlural: "Companies",
	Member: "Employee", MemberPlural: "Employees",
	Staff: "Manager", StaffPlural: "Managers",
	Department: "Team", DepartmentPlural: "Teams",
	Course: "Training", CoursePlural: "Trainings",
	Attendance: "Attendance", Marks: "Reviews", Leave: "Time Off",
	Session: "Session", SessionPlural: "Sessions",
	Cohort: "Cohort", CohortPlural: "Cohorts",
	Term: "Quarter", TermPlural: "Quarters",
	Year:      "Financial Year",
	RoleStaff: "Manager", RoleStaffPlural: "Managers",
	RoleMember: "Employee", RoleMemberPlural: "Employees",
	RoleSupport: "Support Staff", RoleSupportPlural: "Support Staff",
}

var healthcareTerminology = Terminology{
	Organization: "Facility", OrganizationPlural: "Facilities",
	Member: "Patient", MemberPlural: "Patients",
	Staff: "Clinician", StaffPlural: "Clinicians",
	Department: "Ward", DepartmentPlural: "Wards",
	Course: "Program", CoursePlural: "Programs",
	Attendance: "Shifts", Marks: "Assessments", Leave: "Leave",
	Session: "Shift", SessionPlural: "Shifts",
	Cohort: "Unit", CohortPlural: "Units",
	Term: "Cycle", TermPlural: "Cycles",
	Year: "Financial Year",
	// `student` maps to Trainee, not Patient: patients have their own
	// dedicated `patient` role, so reusing "Patient" here would collide.
	RoleStaff: "Clinician", RoleStaffPlural: "Clinicians",
	RoleMember: "Trainee", RoleMemberPlural: "Trainees",
	RoleSupport: "Support Staff", RoleSupportPlural: "Support Staff",
}

var nonprofitTerminology = Terminology{
	Organization: "Organization", OrganizationPlural: "Organizations",
	Member: "Member", MemberPlural: "Members",
	Staff: "Coordinator", StaffPlural: "Coordinators",
	Department: "Program", DepartmentPlural: "Programs",
	Course: "Workshop", CoursePlural: "Workshops",
	Attendance: "Participation", Marks: "Milestones", Leave: "Leave",
	Session: "Session", SessionPlural: "Sessions",
	Cohort: "Group", CohortPlural: "Groups",
	Term: "Cycle", TermPlural: "Cycles",
	Year:      "Program Year",
	RoleStaff: "Coordinator", RoleStaffPlural: "Coordinators",
	RoleMember: "Member", RoleMemberPlural: "Members",
	RoleSupport: "Volunteer", RoleSupportPlural: "Volunteers",
}
