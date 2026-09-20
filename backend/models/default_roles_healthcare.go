package models

// Ready-made roles every healthcare tenant is seeded with.
//
// Each one covers a real hospital job and is granted only the modules that job
// touches. Grants are additive on top of the user's base system role, so a
// Doctor layered on "teacher" (Clinician) keeps that role's defaults and gains
// the clinical modules below.
//
// Kept as a plain table so adding a role (Nurse, Lab Technician, …) is a data
// edit, not a code change. Permission keys mirror PERMISSION_GROUPS in
// frontend/components/.../org/roles/permissions.ts — they are display chips
// only; enforcement comes from the module grants.
var healthcareDefaultRoles = []defaultRoleTemplate{
	// ── Receptionist ────────────────────────────────────────────────
	// Front desk: registers patients, books appointments, takes payments,
	// starts admissions and ER registrations. No clinical record entry.
	{
		Name:     "Receptionist",
		BaseRole: "staff",
		Permissions: []string{
			"patients_read", "patients_write",
			"appointments_read", "appointments_manage",
			"encounters_read",
			"billing_read", "billing_write",
			"ipd_read",
			"employees_read",
			"announcements_read",
		},
		Grants: []roleModuleGrant{
			write("patients"),
			manage("appointments"),
			write("encounters"),
			view("schedules"),
			write("billing"),
			write("claims"),
			write("admissions"),
			view("wards"),
			write("triage"),
			write("ambulance"),
			write("telemedicine"),
			write("referrals"),
			view("employees"),
			view("departments"),
			view("duty-roster"),
			view("events"),
			view("calendar"),
			view("holidays"),
			view("announcements"),
			view("notifications"),
			view("profile"),
			view("docs"),
			view("ask-peepalai"),
		},
	},

	// ── Doctor ──────────────────────────────────────────────────────
	// Clinician: consults, writes the clinical record, orders diagnostics,
	// admits and operates. Prescribes but does not dispense — pharmacy is
	// view-only so stock movement stays with the pharmacist.
	{
		Name:     "Doctor",
		BaseRole: "teacher",
		Permissions: []string{
			"patients_read", "patients_write",
			"appointments_read",
			"encounters_read", "encounters_write",
			"lab_read", "lab_order",
			"radiology_read", "radiology_order",
			"pharmacy_read",
			"ipd_read", "ipd_manage",
			"billing_read",
			"reports_view",
		},
		Grants: []roleModuleGrant{
			write("patients"),
			write("appointments"),
			write("encounters"),
			view("schedules"), // clinician schedules are maintained by the desk
			write("laboratory"),
			write("radiology"),
			view("pharmacy"),
			write("admissions"),
			view("wards"),
			write("nursing"),
			write("ot"),
			write("triage"),
			write("telemedicine"),
			write("referrals"),
			write("bloodbank"),
			write("dietary"),
			view("billing"),
			view("claims"),
			view("employees"),
			view("departments"),
			view("duty-roster"),
			view("events"),
			view("calendar"),
			view("holidays"),
			view("announcements"),
			view("notifications"),
			view("profile"),
			view("docs"),
			view("ask-peepalai"),
		},
	},

	// ── Pharmacist ──────────────────────────────────────────────────
	// Owns the drug catalog, stock and dispensing, plus the purchasing trail
	// that refills it. Reads prescriptions but never edits the clinical record.
	{
		Name:     "Pharmacist",
		BaseRole: "staff",
		Permissions: []string{
			"pharmacy_read", "pharmacy_dispense", "pharmacy_manage",
			"inventory_read", "inventory_manage",
			"patients_read",
			"encounters_read",
			"billing_read", "billing_write",
			"announcements_read",
		},
		Grants: []roleModuleGrant{
			write("pharmacy"), // drug records are retired by an admin, not deleted here
			manage("inventory"),
			view("patients"),
			view("encounters"),
			view("nursing"),
			write("billing"),
			write("vendors"),
			write("purchase-orders"),
			view("claims"),
			view("departments"),
			view("duty-roster"),
			view("calendar"),
			view("holidays"),
			view("announcements"),
			view("notifications"),
			view("profile"),
			view("docs"),
			view("ask-peepalai"),
		},
	},
}
