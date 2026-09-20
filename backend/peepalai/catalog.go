package peepalai

// Ask PeepalAI — table catalog.
//
// The catalog is the single allowlist of tables the NL→SQL feature may ever
// touch. A table absent from this list simply does not exist for PeepalAI:
// it is never described to the model, never wrapped in a scoped CTE, and any
// reference to it in generated SQL is rejected with the permission message.
//
// Module: the access-matrix module that gates the table (same ids as
// models.AccessModules). "" means the table is shared lookup data available
// to every signed-in user of the tenant.
//
// StudentScope / PatientScope: extra WHERE fragment applied for the student /
// patient roles so self-service users only ever see their own rows. The
// single ? placeholder binds the caller's user id.

type TableSpec struct {
	Name         string
	Module       string
	Desc         string
	StudentScope string
	PatientScope string
}

// selfStudent restricts a table carrying student_id to the caller's student row.
const selfStudent = "student_id IN (SELECT id FROM students WHERE user_id = ?)"

// selfPatient restricts a table carrying patient_id to the caller's patient row.
const selfPatient = "patient_id IN (SELECT id FROM patients WHERE user_id = ?)"

// Catalog lists every table PeepalAI may query. Tables that do not exist in
// the live database (renamed models, disabled features) are dropped at
// runtime by LoadColumns, so a stale entry can never break a query.
var Catalog = []TableSpec{
	// ── Shared lookups (any signed-in tenant user) ───────────────────
	{Name: "departments", Desc: "Departments of the organisation"},
	{Name: "courses", Desc: "Courses/programs offered (name, code, duration)"},
	{Name: "subjects", Desc: "Subjects taught (name, code, semester, course_id)"},
	{Name: "academic_years", Desc: "Academic years and their date ranges"},
	{Name: "semesters", Desc: "Semesters within academic years"},
	{Name: "holidays", Desc: "Holiday calendar"},

	// ── People ───────────────────────────────────────────────────────
	{Name: "users", Module: "organization-structure",
		Desc: "Login accounts: name, email, role (admin/teacher/student/staff/patient)"},
	{Name: "employees", Module: "employees",
		Desc: "Employee profiles: employee_id code, designation, department_id, user_id"},
	{Name: "students", Module: "students",
		Desc:         "Student profiles: roll_number, section, semester, course_id, user_id",
		StudentScope: "user_id = ?"},

	// ── Academics ────────────────────────────────────────────────────
	{Name: "marks", Module: "marks",
		Desc:         "Marks per student per subject: subject, exam_type, semester, marks_obtained, max_marks, grade, subject_id, student_id",
		StudentScope: selfStudent},
	{Name: "exam_schedules", Module: "exams", Desc: "Scheduled exam dates"},
	{Name: "exam_types", Module: "exam-types", Desc: "Assessment type definitions (name, max_marks)"},
	{Name: "timetable_slots", Module: "timetable", Desc: "Timetable: day, period, times, subject_id, course_id"},
	{Name: "curriculum_subjects", Module: "curriculum", Desc: "Subject assignments per course-semester"},

	// ── Attendance / leaves ──────────────────────────────────────────
	{Name: "attendances", Module: "attendance",
		Desc:         "Attendance rows: entity_id is students.id when entity_type='student' or employees.id when entity_type='employee'; date; status ('present'/'absent'/'late'/'half_day')",
		StudentScope: "entity_type = 'student' AND entity_id IN (SELECT id FROM students WHERE user_id = ?)"},
	{Name: "leaves", Module: "leaves",
		Desc:         "Leave applications: applicant_id (users.id), leave_type, from_date, to_date, status ('pending'/'approved'/'rejected')",
		StudentScope: "applicant_id = ?"},
	{Name: "leave_balances", Module: "leaves",
		Desc:         "Leave balances per user per year: total, used, pending",
		StudentScope: "user_id = ?"},
	{Name: "leave_type_configs", Module: "leave-types", Desc: "Leave type definitions"},

	// ── Finance ──────────────────────────────────────────────────────
	{Name: "payrolls", Module: "payroll", Desc: "Payroll runs per employee: month, gross, net, status"},
	{Name: "student_fees", Module: "fees",
		Desc:         "Fees owed per student: gross_amount, net_amount, paid_amount, status ('pending'/'partial'/'paid')",
		StudentScope: selfStudent},
	{Name: "fee_payments", Module: "fees",
		Desc:         "Fee payments: amount, payment_date, payment_mode, status",
		StudentScope: selfStudent},
	{Name: "fee_categories", Module: "fee-categories", Desc: "Fee category definitions"},
	{Name: "fee_structures", Module: "fee-structures", Desc: "Fee structures per course"},
	{Name: "fee_allocations", Module: "fee-structures", Desc: "Fee allocations (frequency, installments)"},

	// ── Campus ───────────────────────────────────────────────────────
	{Name: "hostel_blocks", Module: "hostel", Desc: "Hostel blocks (type: boys/girls/mixed)"},
	{Name: "hostel_rooms", Module: "hostel", Desc: "Hostel rooms and capacity"},
	{Name: "hostel_allocations", Module: "hostel",
		Desc:         "Bed allocations: student_id, room_id, bed_number, status",
		StudentScope: selfStudent},
	{Name: "transport_routes", Module: "transport", Desc: "Transport routes"},
	{Name: "transport_vehicles", Module: "transport", Desc: "Transport vehicles"},
	{Name: "transport_allocations", Module: "transport",
		Desc:         "Student/employee transport allocations",
		StudentScope: selfStudent},
	{Name: "library_books", Module: "library", Desc: "Library catalogue"},
	{Name: "library_issues", Module: "library",
		Desc:         "Book issues/returns",
		StudentScope: selfStudent},
	{Name: "events", Module: "events", Desc: "Campus events"},
	{Name: "announcements", Module: "announcements", Desc: "Notices / announcements"},

	// ── Healthcare ───────────────────────────────────────────────────
	{Name: "patients", Module: "patients",
		Desc:         "Patient registry: mrn, first_name, last_name, gender, blood_group, user_id",
		PatientScope: "user_id = ?"},
	{Name: "appointments", Module: "appointments",
		Desc:         "Appointments: patient_id, clinician_id (employees.id), scheduled time, status",
		PatientScope: selfPatient},
	{Name: "encounters", Module: "encounters",
		Desc:         "OPD visits: patient_id, clinician_id, diagnosis, notes",
		PatientScope: selfPatient},
	{Name: "admissions", Module: "admissions",
		Desc:         "Inpatient admissions (ADT): patient_id, ward/bed, diagnosis, admitted/discharged times, status",
		PatientScope: selfPatient},
	{Name: "wards", Module: "wards", Desc: "Hospital wards"},
	{Name: "beds", Module: "wards", Desc: "Beds per ward: ward_id, status (occupied/available)"},
	{Name: "vitals_records", Module: "nursing", Desc: "Nursing vitals", PatientScope: selfPatient},
	{Name: "medication_orders", Module: "nursing", Desc: "Medication orders (MAR)", PatientScope: selfPatient},
	{Name: "lab_tests", Module: "laboratory", Desc: "Lab test definitions"},
	{Name: "lab_orders", Module: "laboratory", Desc: "Lab orders: patient_id, status, results", PatientScope: selfPatient},
	{Name: "radiology_studies", Module: "radiology", Desc: "Radiology study definitions"},
	{Name: "radiology_orders", Module: "radiology", Desc: "Radiology orders per patient", PatientScope: selfPatient},
	{Name: "drugs", Module: "pharmacy", Desc: "Pharmacy drug stock"},
	{Name: "dispenses", Module: "pharmacy", Desc: "Drug dispenses", PatientScope: selfPatient},
	{Name: "invoices", Module: "billing", Desc: "Clinical invoices: patient_id, total, status", PatientScope: selfPatient},
	{Name: "insurance_claims", Module: "claims", Desc: "Insurance/TPA claims", PatientScope: selfPatient},
	{Name: "inventory_items", Module: "inventory", Desc: "Inventory & stores stock"},
	{Name: "operation_theatres", Module: "ot", Desc: "Operation theatres"},
	{Name: "surgeries", Module: "ot", Desc: "Scheduled surgeries", PatientScope: selfPatient},
	{Name: "triage_cases", Module: "triage", Desc: "ER / triage cases", PatientScope: selfPatient},
	{Name: "blood_units", Module: "bloodbank", Desc: "Blood bank units"},
	{Name: "blood_requests", Module: "bloodbank", Desc: "Blood requests", PatientScope: selfPatient},
	{Name: "ambulances", Module: "ambulance", Desc: "Ambulance fleet"},
	{Name: "ambulance_trips", Module: "ambulance", Desc: "Ambulance trips"},
	{Name: "diet_plans", Module: "dietary", Desc: "Dietary plans", PatientScope: selfPatient},
	{Name: "tele_consults", Module: "telemedicine", Desc: "Telemedicine consults", PatientScope: selfPatient},
	{Name: "referrals", Module: "referrals", Desc: "Patient referrals", PatientScope: selfPatient},
}

// sensitiveColumns are never exposed to the model or the query, per table.
// Applied on top of the global denylist in columns.go.
var sensitiveColumns = map[string][]string{
	"users": {"password"},
}
