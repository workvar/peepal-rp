package bulk

// Shared resolvers for "dropdown-like" reference cells (department, course,
// salary template, employee, subject). A bulk row must never persist a dangling
// reference: the database has no foreign-key constraints (migrations run with
// DisableForeignKeyConstraintWhenMigrating), so a bad name would otherwise be
// written verbatim as corrupt data. Each resolver returns a clear "not found"
// error which SubmitRows surfaces as a per-row failure, blocking just that row.
//
// Convention: a blank cell returns ("", nil) — the caller decides whether that
// is allowed (required cells are already rejected by Schema.ValidateRow). A
// non-blank cell that matches nothing returns an error.

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// resolveEmployeeID maps an "employee" cell (UUID or Employee ID / staff code)
// to the employee's internal ID.
func resolveEmployeeID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var emp models.Employee
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR employee_id = ?)", tenantID, raw, raw).
		First(&emp).Error; err != nil {
		return "", fmt.Errorf("employee not found: %s", raw)
	}
	return emp.ID, nil
}

// resolveDepartmentID maps a "department" cell (UUID or name) to a department ID.
func resolveDepartmentID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var dept models.Department
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&dept).Error; err != nil {
		return "", fmt.Errorf("department not found: %s", raw)
	}
	return dept.ID, nil
}

// resolveCourseID maps a "course" cell (UUID, code, or name) to a course ID.
func resolveCourseID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var course models.Course
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?))", tenantID, raw, raw, raw).
		First(&course).Error; err != nil {
		return "", fmt.Errorf("course not found: %s", raw)
	}
	return course.ID, nil
}

// resolveDrugID maps a "drug" cell (UUID or name) to a pharmacy Drug ID.
func resolveDrugID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var d models.Drug
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&d).Error; err != nil {
		return "", fmt.Errorf("drug not found: %s", raw)
	}
	return d.ID, nil
}

// resolvePatientID maps a "patient" cell (UUID or MRN) to a patient ID. Claims
// reference patients, and no one wants to type a UUID — this lets a CSV say
// "MRN-00001". A blank cell errors, since a claim must name a patient.
func resolvePatientID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("patient is required")
	}
	var p models.Patient
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(mrn) = LOWER(?))", tenantID, raw, raw).
		First(&p).Error; err != nil {
		return "", fmt.Errorf("patient not found: %s", raw)
	}
	return p.ID, nil
}

// resolvePayerID maps a "payer" cell (UUID or payer code) to an insurance payer
// ID. A blank cell errors, since a claim must name a payer.
func resolvePayerID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("payer is required")
	}
	var payer models.InsurancePayer
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(code) = LOWER(?))", tenantID, raw, raw).
		First(&payer).Error; err != nil {
		return "", fmt.Errorf("payer not found: %s", raw)
	}
	return payer.ID, nil
}

// resolveVendorID maps a "vendor" cell (UUID or name) to a vendor ID. A future
// PO bulk uploader can reference vendors by name through this.
func resolveVendorID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var v models.Vendor
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&v).Error; err != nil {
		return "", fmt.Errorf("vendor not found: %s", raw)
	}
	return v.ID, nil
}

// resolveEmployeeRole maps a "role" cell to a base account role id
// (teacher/student/staff). Accepts the raw enum names or the tenant's own
// system-role labels — Clinician / Trainee / Support Staff for a hospital —
// resolved against the same seeded SystemRole table the Roles page and Add
// Employee dropdown read, so the sheet accepts whatever the admin sees in the
// UI. Admin is never assignable here. Blank defaults to staff.
func resolveEmployeeRole(tenantID, raw string) (models.Role, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return models.RoleStaff, nil
	}

	// Raw enum ids always work, regardless of vertical.
	switch strings.ToLower(raw) {
	case "teacher":
		return models.RoleTeacher, nil
	case "student":
		return models.RoleStudent, nil
	case "staff":
		return models.RoleStaff, nil
	}

	// Match the tenant's seeded system-role labels (the DB source of truth).
	var sr models.SystemRole
	if err := database.DB.
		Where("tenant_id = ? AND role_id <> ? AND LOWER(label) = LOWER(?)", tenantID, "admin", raw).
		First(&sr).Error; err == nil {
		return models.Role(sr.RoleID), nil
	}

	// Fall back to compiled-in terminology for tenants seeded before the
	// SystemRole table existed.
	var tenant models.Tenant
	if err := database.DB.First(&tenant, "id = ?", tenantID).Error; err == nil {
		t := models.DefaultTerminology(tenant.Type.Canonical())
		switch {
		case strings.EqualFold(raw, t.RoleStaff):
			return models.RoleTeacher, nil
		case strings.EqualFold(raw, t.RoleMember):
			return models.RoleStudent, nil
		case strings.EqualFold(raw, t.RoleSupport):
			return models.RoleStaff, nil
		}
	}

	return "", fmt.Errorf("unknown role: %s (use one of your organisation's role labels)", raw)
}

// resolveCustomRoleID maps a "custom_role" cell (UUID or name) to a
// tenant-scoped CustomRole ID. Returns (nil, nil) for a blank cell.
func resolveCustomRoleID(tenantID, raw string) (*string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	var role models.CustomRole
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&role).Error; err != nil {
		return nil, fmt.Errorf("custom role not found: %s", raw)
	}
	return &role.ID, nil
}

// resolveSalaryTemplateID maps a "salary template" cell (UUID or name) to a
// template ID.
func resolveSalaryTemplateID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var tpl models.SalaryTemplate
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&tpl).Error; err != nil {
		return "", fmt.Errorf("salary template not found: %s", raw)
	}
	return tpl.ID, nil
}

// resolveSubjectID maps an optional "subject" cell (UUID or code) to a subject
// ID.
func resolveSubjectID(tenantID, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	var subj models.Subject
	if err := database.DB.
		Where("tenant_id = ? AND (id = ? OR LOWER(code) = LOWER(?))", tenantID, raw, raw).
		First(&subj).Error; err != nil {
		return "", fmt.Errorf("subject not found: %s", raw)
	}
	return subj.ID, nil
}

// resolveCurriculumSubjectID maps a (course, semester, subject) triple to the
// curriculum row that joins them. Question-bank rows are scoped to a
// curriculum subject, which no one wants to type as a UUID — this lets a CSV
// say "BTCS, 3, CS301" instead.
func resolveCurriculumSubjectID(tenantID, course, semester, subject string) (string, error) {
	courseID, err := resolveCourseID(tenantID, course)
	if err != nil {
		return "", err
	}
	if courseID == "" {
		return "", errors.New("course is required")
	}
	subjectID, err := resolveSubjectID(tenantID, subject)
	if err != nil {
		return "", err
	}
	if subjectID == "" {
		return "", errors.New("subject is required")
	}
	sem, err := strconv.Atoi(strings.TrimSpace(semester))
	if err != nil || sem <= 0 {
		return "", fmt.Errorf("semester must be a positive number: %s", semester)
	}

	var cs models.CurriculumSubject
	if err := database.DB.
		Where("tenant_id = ? AND course_id = ? AND semester_number = ? AND subject_id = ?",
			tenantID, courseID, sem, subjectID).
		First(&cs).Error; err != nil {
		return "", fmt.Errorf("%s is not assigned to semester %d of %s in the curriculum", subject, sem, course)
	}
	return cs.ID, nil
}

// resolveAttendanceEntityID validates that an attendance row's entity_id refers
// to a real student or employee and returns its internal ID. Students accept a
// UUID or roll number; employees a UUID or staff code.
func resolveAttendanceEntityID(tenantID, entityType, raw string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(entityType)) {
	case "student":
		return resolveStudentID(tenantID, raw) // UUID or roll number; errors when missing
	case "employee":
		id, err := resolveEmployeeID(tenantID, raw)
		if err != nil {
			return "", err
		}
		if id == "" {
			return "", fmt.Errorf("entity_id is required")
		}
		return id, nil
	default:
		return "", fmt.Errorf("entity_type must be student or employee")
	}
}
