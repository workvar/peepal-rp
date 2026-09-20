package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Each row creates an employee together with their login account in one step —
// there is no separate "user" to link to. Email may be blank when the tenant
// signs staff in by Employee ID; password may be blank to send an invite.
var employeesSchema = &Schema{
	Resource:    "employees",
	Title:       "Employees",
	Description: "Add staff and teachers in bulk. Each row creates the employee and their login account together. Leave email blank when your organisation signs staff in by Employee ID; leave password blank to e-mail them a setup invite (set send_invite to true).",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Full Name", Type: FieldString, Required: true,
			Description: "Employee's full name, used on their login account.",
			Example:     "Dr. Priya Shah",
		},
		{
			Name: "email", Label: "Email", Type: FieldEmail,
			Description: "Login email. Leave blank when your organisation signs staff in by Employee ID. Must be unique within the organisation when set.",
			Example:     "priya.shah@college.edu",
		},
		{
			Name: "password", Label: "Initial Password", Type: FieldString,
			Description: "Initial password. Leave blank to create an inactive account the employee activates via an invite link.",
			Example:     "Welcome@123",
		},
		{
			Name: "role", Label: "Role", Type: FieldString,
			Description: "Account role. Accepts 'teacher'/'staff', or your organisation's own labels for these two roles (e.g. 'Clinician'/'Support Staff' for a healthcare tenant, 'Manager'/'Support Staff' for a company). Defaults to 'staff' when blank. (Admins are managed on the Admins page.)",
			Example:     "teacher",
		},
		{
			Name: "send_invite", Label: "Send Invite", Type: FieldBool,
			Description: "When true, e-mail the employee a password-setup link (requires an email and a mail-enabled organisation). Defaults to false.",
			Example:     "false",
		},
		{
			Name: "employee_id", Label: "Employee ID", Type: FieldString, Required: true,
			Description: "Unique staff code (e.g. payroll number).",
			Example:     "EMP0421",
		},
		{
			Name: "department_id", Label: "Department", Type: FieldString,
			Description: "Department name or UUID. Name matching is case-insensitive. The row is rejected if no such department exists.",
			Example:     "Computer Science",
		},
		{
			Name: "designation", Label: "Designation", Type: FieldString,
			Example: "Assistant Professor",
		},
		{
			Name: "phone", Label: "Phone", Type: FieldString,
			Example: "+91-9812345678",
		},
		{
			Name: "date_of_birth", Label: "Date of Birth", Type: FieldString,
			Description: "Kept as entered.",
		},
		{
			Name: "gender", Label: "Gender", Type: FieldEnum,
			AllowedValues: []string{"M", "F", "Other"},
		},
		{
			Name: "blood_group", Label: "Blood Group", Type: FieldString,
			Example: "O+",
		},
		{
			Name: "address", Label: "Address", Type: FieldString,
		},
		{
			Name: "city", Label: "City", Type: FieldString,
		},
		{
			Name: "state", Label: "State", Type: FieldString,
		},
		{
			Name: "pincode", Label: "Pincode", Type: FieldString,
		},
		{
			Name: "personal_email", Label: "Personal Email", Type: FieldString,
		},
		{
			Name: "emergency_name", Label: "Emergency Contact Name", Type: FieldString,
		},
		{
			Name: "emergency_phone", Label: "Emergency Contact Phone", Type: FieldString,
		},
		{
			Name: "employment_type", Label: "Employment Type", Type: FieldEnum,
			AllowedValues: []string{"permanent", "contract", "part-time"},
			Description:   "Defaults to 'permanent' when blank.",
		},
		{
			Name: "grade_level", Label: "Grade Level", Type: FieldString,
		},
		{
			Name: "join_date", Label: "Join Date", Type: FieldDate,
			Example: "2024-01-10",
		},
		// Bank details
		{
			Name: "bank_name", Label: "Bank Name", Type: FieldString,
			Example: "State Bank of India",
		},
		{
			Name: "account_number", Label: "Bank Account Number", Type: FieldString,
		},
		{
			Name: "account_type", Label: "Account Type", Type: FieldEnum,
			AllowedValues: []string{"savings", "current"},
		},
		{
			Name: "ifsc_code", Label: "IFSC Code", Type: FieldString,
			Example: "SBIN0001234",
		},
		{
			Name: "branch_name", Label: "Branch Name", Type: FieldString,
		},
		// PF / ESI
		{
			Name: "pf_number", Label: "PF Number", Type: FieldString,
		},
		{
			Name: "uan_number", Label: "UAN Number", Type: FieldString,
		},
		{
			Name: "pf_employee_percent", Label: "PF Employee %", Type: FieldFloat,
			Description: "Employee contribution percentage. Defaults to 12.",
			Example:     "12",
		},
		{
			Name: "pf_employer_percent", Label: "PF Employer %", Type: FieldFloat,
			Description: "Employer contribution percentage. Defaults to 12.",
			Example:     "12",
		},
		{
			Name: "esi_number", Label: "ESI Number", Type: FieldString,
		},
		{
			Name: "esi_dispensary", Label: "ESI Dispensary", Type: FieldString,
		},
		// Tax / NPS
		{
			Name: "pan_number", Label: "PAN Number", Type: FieldString,
			Example: "ABCDE1234F",
		},
		{
			Name: "tax_regime", Label: "Tax Regime", Type: FieldEnum,
			AllowedValues: []string{"old", "new"},
			Description:   "Defaults to 'new' when blank.",
		},
		{
			Name: "nps_account_number", Label: "NPS Account Number", Type: FieldString,
		},
		{
			Name: "nps_tier", Label: "NPS Tier", Type: FieldEnum,
			AllowedValues: []string{"tier1", "tier2"},
		},
		{
			Name: "gratuity_eligible", Label: "Gratuity Eligible", Type: FieldEnum,
			AllowedValues: []string{"true", "false"},
			Description:   "Defaults to false.",
		},
		{
			Name:        "custom_role",
			Label:       "Custom Role",
			Type:        FieldString,
			Description: "Name or UUID of an existing tenant-defined custom role (e.g. 'Doctor') to layer on top of the base teacher/staff role. Leave blank to skip. The row is rejected if the named role does not exist.",
			Example:     "Doctor",
		},
		// Salary template
		{
			Name:        "salary_template_id",
			Label:       "Salary Template",
			Type:        FieldString,
			Description: "Name or UUID of an existing salary template to assign on creation. Leave blank to skip. The row is rejected if the named template does not exist.",
			Example:     "Assistant Professor - Grade A",
		},
	},
	Create: createEmployeeRow,
}

func createEmployeeRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	// Employees may be teacher or staff; default to staff. Accepts the raw
	// enum names or the tenant's own terminology labels for them (e.g. a
	// healthcare tenant's "Clinician"/"Support Staff"), so the sheet can read
	// naturally for the vertical instead of forcing education-flavoured words.
	role, err := resolveEmployeeRole(ctx.TenantID, row["role"])
	if err != nil {
		return "", err
	}

	// Resolve department: accept either a UUID or a department name. A given but
	// unknown department fails the row — there are no DB foreign-key constraints,
	// so a bad value would otherwise persist as corrupt data.
	deptID, err := resolveDepartmentID(ctx.TenantID, row["department_id"])
	if err != nil {
		return "", err
	}

	// Resolve the optional salary template up-front (by name or UUID) so an
	// unknown template blocks the whole row before any account/profile is
	// created — never leave a half-onboarded employee behind.
	tmplID, err := resolveSalaryTemplateID(ctx.TenantID, row["salary_template_id"])
	if err != nil {
		return "", err
	}

	// Resolve the optional custom role up-front for the same reason: an unknown
	// role name should block the row before any account is created.
	customRoleID, err := resolveCustomRoleID(ctx.TenantID, row["custom_role"])
	if err != nil {
		return "", err
	}

	emp := models.Employee{
		TenantID:       ctx.TenantID,
		EmployeeID:     strings.TrimSpace(row["employee_id"]),
		DepartmentID:   deptID,
		Designation:    strings.TrimSpace(row["designation"]),
		Phone:          strings.TrimSpace(row["phone"]),
		DateOfBirth:    strings.TrimSpace(row["date_of_birth"]),
		Gender:         strings.TrimSpace(row["gender"]),
		BloodGroup:     strings.TrimSpace(row["blood_group"]),
		Address:        strings.TrimSpace(row["address"]),
		City:           strings.TrimSpace(row["city"]),
		State:          strings.TrimSpace(row["state"]),
		Pincode:        strings.TrimSpace(row["pincode"]),
		PersonalEmail:  strings.TrimSpace(row["personal_email"]),
		EmergencyName:  strings.TrimSpace(row["emergency_name"]),
		EmergencyPhone: strings.TrimSpace(row["emergency_phone"]),
		EmploymentType: strings.TrimSpace(row["employment_type"]),
		GradeLevel:     strings.TrimSpace(row["grade_level"]),
	}
	if emp.EmploymentType == "" {
		emp.EmploymentType = "permanent"
	}
	if d := ParseDate(row["join_date"]); !d.IsZero() {
		emp.JoinDate = d
	} else {
		emp.JoinDate = time.Now()
	}

	// Create the login account and the employee profile atomically.
	var userID string
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		uid, err := createBulkAccount(tx, ctx.TenantID, row["name"], row["email"], row["password"], role, customRoleID)
		if err != nil {
			return err
		}
		userID = uid
		emp.UserID = uid
		if err := tx.Create(&emp).Error; err != nil {
			return errors.New("could not create employee — employee_id may already exist")
		}
		return nil
	}); err != nil {
		return "", err
	}

	// Payment details — only create the record if at least one field is provided.
	pd := models.EmployeePaymentDetails{
		TenantID:         ctx.TenantID,
		EmployeeID:       emp.ID,
		BankName:         strings.TrimSpace(row["bank_name"]),
		AccountNumber:    strings.TrimSpace(row["account_number"]),
		AccountType:      strings.TrimSpace(row["account_type"]),
		IFSCCode:         strings.TrimSpace(row["ifsc_code"]),
		BranchName:       strings.TrimSpace(row["branch_name"]),
		PFNumber:         strings.TrimSpace(row["pf_number"]),
		UANNumber:        strings.TrimSpace(row["uan_number"]),
		ESINumber:        strings.TrimSpace(row["esi_number"]),
		ESIDispensary:    strings.TrimSpace(row["esi_dispensary"]),
		PANNumber:        strings.TrimSpace(row["pan_number"]),
		TaxRegime:        strings.TrimSpace(row["tax_regime"]),
		NPSAccountNumber: strings.TrimSpace(row["nps_account_number"]),
		NPSTier:          strings.TrimSpace(row["nps_tier"]),
	}
	if pd.TaxRegime == "" {
		pd.TaxRegime = "new"
	}
	if v, err := strconv.ParseFloat(strings.TrimSpace(row["pf_employee_percent"]), 64); err == nil {
		pd.PFEmployeePercent = v
	} else {
		pd.PFEmployeePercent = 12
	}
	if v, err := strconv.ParseFloat(strings.TrimSpace(row["pf_employer_percent"]), 64); err == nil {
		pd.PFEmployerPercent = v
	} else {
		pd.PFEmployerPercent = 12
	}
	g := strings.ToLower(strings.TrimSpace(row["gratuity_eligible"]))
	pd.GratuityEligible = g == "true" || g == "yes" || g == "1"

	hasPaymentData := pd.BankName != "" || pd.AccountNumber != "" || pd.PFNumber != "" ||
		pd.UANNumber != "" || pd.ESINumber != "" || pd.PANNumber != "" || pd.NPSAccountNumber != ""
	if hasPaymentData {
		if err := database.DB.Create(&pd).Error; err != nil {
			return emp.ID, errors.New("employee created but could not save payment details")
		}
	}

	// Salary template assignment. Resolved by name or UUID; a given but unknown
	// template is validated before the employee is created (see the pre-check
	// above), so here it always resolves.
	if tmplID != "" {
		assignment := models.SalaryAssignment{
			TenantID:      ctx.TenantID,
			EmployeeID:    emp.ID,
			TemplateID:    tmplID,
			EffectiveFrom: emp.JoinDate,
			IsActive:      true,
		}
		if err := database.DB.Create(&assignment).Error; err != nil {
			return emp.ID, errors.New("employee created but could not assign salary template")
		}
	}

	// Reporting-manager relationships are managed from the Org Structure page,
	// not during bulk creation.

	sendBulkInvite(ctx.TenantID, userID, ParseBool(row["send_invite"]))
	return emp.ID, nil
}

func init() { Register(employeesSchema) }
