package graph

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// ── Queries ──────────────────────────────────────────────────

// Employees is the staff/clinician directory. Any authenticated user may read
// it — a receptionist looking up a doctor is a normal thing to do, and the
// module's access rules decide who gets the page at all. The payroll and
// private-contact fields are stripped for non-admins (see redactEmployee), so
// opening the list up never widens who can see bank, PAN or PF details.
func (r *queryResolver) Employees(ctx context.Context) ([]*model.Employee, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var list []models.Employee
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Employee, len(list))
	for i, e := range list {
		out[i] = redactEmployee(employeeToModel(e), auth, e.UserID)
	}
	return out, nil
}

func (r *queryResolver) Employee(ctx context.Context, id string) (*model.Employee, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var e models.Employee
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		First(&e).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return redactEmployee(employeeToModel(e), auth, e.UserID), nil
}

func (r *queryResolver) Departments(ctx context.Context) ([]*model.Department, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var list []models.Department
	if err := r.DB.
		Preload("HeadEmployee").
		Preload("HeadEmployee.User").
		Where("tenant_id = ?", auth.TenantID).
		Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Department, len(list))
	for i, d := range list {
		out[i] = departmentToModel(d)
	}
	return out, nil
}

func (r *queryResolver) Users(ctx context.Context) ([]*model.User, error) {
	// Full tenant user directory: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var list []models.User
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.User, len(list))
	for i, u := range list {
		out[i] = userToModel(u)
	}
	return out, nil
}

// ── Mutations ──────────────────────────────────────────────────

func (r *mutationResolver) CreateEmployee(ctx context.Context, input model.CreateEmployeeInput) (*model.Employee, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	// Enforce the subscription's employee quota before inserting.
	if err := enforceResourceQuota(r.DB.WithContext(ctx), auth.TenantID, models.QuotaEmployees); err != nil {
		return nil, err
	}

	emp := models.Employee{
		TenantID:         auth.TenantID,
		EmployeeID:       input.EmployeeID,
		Designation:      strVal(input.Designation),
		Phone:            strVal(input.Phone),
		DateOfBirth:      strVal(input.DateOfBirth),
		Gender:           strVal(input.Gender),
		BloodGroup:       strVal(input.BloodGroup),
		PhotoURL:         strVal(input.PhotoURL),
		Address:          strVal(input.Address),
		City:             strVal(input.City),
		State:            strVal(input.State),
		Pincode:          strVal(input.Pincode),
		Nationality:      strVal(input.Nationality),
		PersonalEmail:    strVal(input.PersonalEmail),
		EmergencyName:    strVal(input.EmergencyName),
		EmergencyPhone:   strVal(input.EmergencyPhone),
		EmploymentType:   strVal(input.EmploymentType),
		ProbationEndDate: strVal(input.ProbationEndDate),
		GradeLevel:       strVal(input.GradeLevel),
	}
	if input.DepartmentID != nil {
		emp.DepartmentID = *input.DepartmentID
	}
	if input.JoinDate != nil && *input.JoinDate != "" {
		if t, err := time.Parse("2006-01-02", *input.JoinDate); err == nil {
			emp.JoinDate = t
		}
	}

	// Create the login account and the employee profile together — onboarding
	// is a single step now (no separate "add user, then assign" flow).
	err = r.DB.Transaction(func(tx *gorm.DB) error {
		uid, err := createLoginAccount(tx, auth.TenantID, input.Name, strVal(input.Email), strVal(input.Password), employeeRoleFromInput(input.Role))
		if err != nil {
			return err
		}
		emp.UserID = uid
		if err := tx.Create(&emp).Error; err != nil {
			return err
		}
		if input.PaymentDetails != nil {
			pd := inputToPaymentDetails(input.PaymentDetails, emp.ID, auth.TenantID)
			return tx.Create(&pd).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := r.DB.Where("id = ? AND tenant_id = ?", emp.ID, auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		First(&emp).Error; err != nil {
		return nil, err
	}
	maybeSendInvite(r.DB, auth.TenantID, emp.UserID, input.SendInvite != nil && *input.SendInvite)
	return employeeToModel(emp), nil
}

func (r *mutationResolver) DeleteEmployee(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var emp models.Employee
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&emp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	if emp.UserID == auth.UserID {
		return false, errors.New("you cannot delete your own account")
	}
	// Removing an employee removes their login account and every record tied to
	// them (salary, payroll, reportees, department headship, …) in one go.
	if err := r.DB.Transaction(func(tx *gorm.DB) error {
		return deleteEmployeeCascade(tx, auth.TenantID, emp)
	}); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) CreateDepartment(ctx context.Context, input model.CreateDepartmentInput) (*model.Department, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	dept := models.Department{TenantID: auth.TenantID, Name: input.Name}
	if input.HeadEmployeeID != nil && *input.HeadEmployeeID != "" {
		dept.HeadEmployeeID = input.HeadEmployeeID
	}
	if err := r.DB.Create(&dept).Error; err != nil {
		return nil, err
	}
	if dept.HeadEmployeeID != nil {
		r.DB.Preload("HeadEmployee").Preload("HeadEmployee.User").First(&dept, "id = ?", dept.ID)
	}
	return departmentToModel(dept), nil
}

func (r *mutationResolver) CreateUser(ctx context.Context, input model.CreateUserInput) (*model.User, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	role := models.Role(input.Role)
	email := strings.TrimSpace(input.Email)

	// Enforce the tenant's identity policy. Email is optional only for the
	// populations the tenant runs on IDs for (staff and/or students); admins
	// always need one. Emailless users sign in with the Employee ID / Roll
	// Number set on their employee/student profile.
	var tenant models.Tenant
	if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err != nil {
		return nil, err
	}
	if email == "" && tenant.EmailRequiredForRole(role) {
		return nil, GQLErr("an email is required for this role")
	}

	// Password is optional: either one is set now, or (with sendInvite) the user
	// is e-mailed a setup link. Require at least one path so an account can't be
	// stranded with no way in.
	pw := strVal(input.Password)
	invite := input.SendInvite != nil && *input.SendInvite
	if pw == "" && !invite {
		return nil, GQLErr("set a password, or enable invite to email a setup link")
	}
	if pw == "" {
		pw = utils.RandomPassword() // inert until the invite is accepted
	} else if err := utils.ValidatePassword(pw); err != nil {
		return nil, err
	}

	hash, err := utils.HashPassword(pw)
	if err != nil {
		return nil, err
	}
	user := models.User{
		TenantID: auth.TenantID,
		Name:     input.Name,
		Email:    email,
		Password: hash,
		Role:     role,
		IsActive: true,
	}
	if err := r.DB.Create(&user).Error; err != nil {
		return nil, GQLErr("email already exists or invalid data")
	}
	maybeSendInvite(r.DB, auth.TenantID, user.ID, invite)
	return userToModel(user), nil
}

// DeactivateUser turns off an account and ends every session it currently has.
//
// The flag alone is not enough. An access token is a bearer credential that
// nothing can withdraw once minted, so a deactivated user keeps working until
// their current token expires and the refresh gate turns them away. That window
// is bounded, but "bounded" is the wrong guarantee for an admin who has just
// revoked someone's access: revoking the refresh families ends it now, and the
// stale access token dies on its own shortly after.
func (r *mutationResolver) DeactivateUser(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Model(&models.User{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("is_active", false)
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	// Best-effort, and deliberately so: the account is already off, and failing
	// the whole mutation here would leave the caller thinking nothing happened
	// when the important half did. Logged loudly instead, because a session
	// that outlives its deactivation is worth someone noticing.
	if err := models.RevokeUserSessions(r.DB, id, models.RevokeReasonAccountLocked); err != nil {
		log.Printf("[AUTH] deactivateUser: could not revoke sessions for user=%s: %v", id, err)
	}
	// Push tokens go quiet too, or a deactivated account keeps receiving
	// notifications on a device it can no longer sign in from.
	if err := models.DisableUserDeviceTokens(r.DB, id, models.DeviceRevokeAccountRemoved); err != nil {
		log.Printf("[AUTH] deactivateUser: could not revoke device tokens for user=%s: %v", id, err)
	}
	return true, nil
}

// DeleteUser permanently removes a user and everything tied to them within the
// tenant. If the account backs an employee or student profile, that profile and
// all of its relations are cascaded too (via the shared cascade helpers) so no
// dangling rows survive. Admins cannot delete their own account.
func (r *mutationResolver) DeleteUser(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	if id == auth.UserID {
		return false, errors.New("you cannot delete your own account")
	}

	// Confirm the user exists within this tenant before touching anything.
	var target models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&target).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}

	err = r.DB.Transaction(func(tx *gorm.DB) error {
		// If this account backs an employee profile, cascade that profile.
		var emp models.Employee
		if err := tx.Where("user_id = ? AND tenant_id = ?", id, auth.TenantID).First(&emp).Error; err == nil {
			return deleteEmployeeCascade(tx, auth.TenantID, emp)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// Or a student profile.
		var stu models.Student
		if err := tx.Where("user_id = ? AND tenant_id = ?", id, auth.TenantID).First(&stu).Error; err == nil {
			return deleteStudentCascade(tx, auth.TenantID, stu)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// Plain account (e.g. an admin) with no profile: just the user cascade.
		return deleteUserCascade(tx, auth.TenantID, id)
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

// ── Model conversion helpers ──────────────────────────────────

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func toStrPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toFloat64Ptr(f float64) *float64 { return &f }
func toBoolPtr(b bool) *bool          { return &b }

func userToModel(u models.User) *model.User {
	return &model.User{
		ID:       u.ID,
		Email:    u.Email,
		Name:     u.Name,
		Role:     string(u.Role),
		IsActive: u.IsActive,
	}
}

func employeeToModel(e models.Employee) *model.Employee {
	emp := &model.Employee{
		ID:               e.ID,
		EmployeeID:       e.EmployeeID,
		Designation:      toStrPtr(e.Designation),
		Phone:            toStrPtr(e.Phone),
		Gender:           toStrPtr(e.Gender),
		BloodGroup:       toStrPtr(e.BloodGroup),
		PhotoURL:         toStrPtr(e.PhotoURL),
		Address:          toStrPtr(e.Address),
		City:             toStrPtr(e.City),
		State:            toStrPtr(e.State),
		Pincode:          toStrPtr(e.Pincode),
		Nationality:      toStrPtr(e.Nationality),
		PersonalEmail:    toStrPtr(e.PersonalEmail),
		EmergencyName:    toStrPtr(e.EmergencyName),
		EmergencyPhone:   toStrPtr(e.EmergencyPhone),
		EmploymentType:   toStrPtr(e.EmploymentType),
		ProbationEndDate: toStrPtr(e.ProbationEndDate),
		GradeLevel:       toStrPtr(e.GradeLevel),
		DateOfBirth:      toStrPtr(e.DateOfBirth),
		User:             userToModel(e.User),
	}
	if !e.JoinDate.IsZero() {
		s := e.JoinDate.Format("2006-01-02")
		emp.JoinDate = &s
	}
	if e.DepartmentID != "" {
		emp.Department = &model.Department{ID: e.Department.ID, Name: e.Department.Name}
	}
	if e.PaymentDetails != nil {
		emp.PaymentDetails = paymentDetailsToModel(e.PaymentDetails)
	}
	return emp
}

func departmentToModel(d models.Department) *model.Department {
	m := &model.Department{ID: d.ID, Name: d.Name}
	if d.HeadEmployee != nil && d.HeadEmployee.ID != "" {
		he := employeeToModel(*d.HeadEmployee)
		m.HeadEmployee = he
	}
	return m
}

func paymentDetailsToModel(pd *models.EmployeePaymentDetails) *model.EmployeePaymentDetails {
	return &model.EmployeePaymentDetails{
		BankName:          toStrPtr(pd.BankName),
		AccountNumber:     toStrPtr(pd.AccountNumber),
		AccountType:       toStrPtr(pd.AccountType),
		IfscCode:          toStrPtr(pd.IFSCCode),
		BranchName:        toStrPtr(pd.BranchName),
		PfNumber:          toStrPtr(pd.PFNumber),
		UanNumber:         toStrPtr(pd.UANNumber),
		PfEmployeePercent: toFloat64Ptr(pd.PFEmployeePercent),
		PfEmployerPercent: toFloat64Ptr(pd.PFEmployerPercent),
		EsiNumber:         toStrPtr(pd.ESINumber),
		EsiDispensary:     toStrPtr(pd.ESIDispensary),
		PanNumber:         toStrPtr(pd.PANNumber),
		TaxRegime:         toStrPtr(pd.TaxRegime),
		Form16Ref:         toStrPtr(pd.Form16Ref),
		NpsAccountNumber:  toStrPtr(pd.NPSAccountNumber),
		NpsTier:           toStrPtr(pd.NPSTier),
		GratuityEligible:  toBoolPtr(pd.GratuityEligible),
	}
}

func inputToPaymentDetails(input *model.PaymentDetailsInput, employeeID, tenantID string) models.EmployeePaymentDetails {
	pd := models.EmployeePaymentDetails{EmployeeID: employeeID, TenantID: tenantID}
	if input.BankName != nil {
		pd.BankName = *input.BankName
	}
	if input.AccountNumber != nil {
		pd.AccountNumber = *input.AccountNumber
	}
	if input.AccountType != nil {
		pd.AccountType = *input.AccountType
	}
	if input.IfscCode != nil {
		pd.IFSCCode = *input.IfscCode
	}
	if input.BranchName != nil {
		pd.BranchName = *input.BranchName
	}
	if input.PfNumber != nil {
		pd.PFNumber = *input.PfNumber
	}
	if input.UanNumber != nil {
		pd.UANNumber = *input.UanNumber
	}
	if input.PfEmployeePercent != nil {
		pd.PFEmployeePercent = *input.PfEmployeePercent
	}
	if input.PfEmployerPercent != nil {
		pd.PFEmployerPercent = *input.PfEmployerPercent
	}
	if input.EsiNumber != nil {
		pd.ESINumber = *input.EsiNumber
	}
	if input.EsiDispensary != nil {
		pd.ESIDispensary = *input.EsiDispensary
	}
	if input.PanNumber != nil {
		pd.PANNumber = *input.PanNumber
	}
	if input.TaxRegime != nil {
		pd.TaxRegime = *input.TaxRegime
	}
	if input.Form16Ref != nil {
		pd.Form16Ref = *input.Form16Ref
	}
	if input.NpsAccountNumber != nil {
		pd.NPSAccountNumber = *input.NpsAccountNumber
	}
	if input.NpsTier != nil {
		pd.NPSTier = *input.NpsTier
	}
	if input.GratuityEligible != nil {
		pd.GratuityEligible = *input.GratuityEligible
	}
	return pd
}

func (r *mutationResolver) UpdateEmployee(ctx context.Context, id string, input model.UpdateEmployeeInput) (*model.Employee, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var emp models.Employee
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&emp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.EmployeeID != nil {
		emp.EmployeeID = *input.EmployeeID
	}
	if input.DepartmentID != nil {
		emp.DepartmentID = *input.DepartmentID
	}
	if input.Designation != nil {
		emp.Designation = *input.Designation
	}
	if input.Phone != nil {
		emp.Phone = *input.Phone
	}
	if input.JoinDate != nil && *input.JoinDate != "" {
		if t, err := time.Parse("2006-01-02", *input.JoinDate); err == nil {
			emp.JoinDate = t
		}
	}
	if input.DateOfBirth != nil {
		emp.DateOfBirth = *input.DateOfBirth
	}
	if input.Gender != nil {
		emp.Gender = *input.Gender
	}
	if input.BloodGroup != nil {
		emp.BloodGroup = *input.BloodGroup
	}
	if input.PhotoURL != nil {
		emp.PhotoURL = *input.PhotoURL
	}
	if input.Address != nil {
		emp.Address = *input.Address
	}
	if input.City != nil {
		emp.City = *input.City
	}
	if input.State != nil {
		emp.State = *input.State
	}
	if input.Pincode != nil {
		emp.Pincode = *input.Pincode
	}
	if input.Nationality != nil {
		emp.Nationality = *input.Nationality
	}
	if input.PersonalEmail != nil {
		emp.PersonalEmail = *input.PersonalEmail
	}
	if input.EmergencyName != nil {
		emp.EmergencyName = *input.EmergencyName
	}
	if input.EmergencyPhone != nil {
		emp.EmergencyPhone = *input.EmergencyPhone
	}
	if input.EmploymentType != nil {
		emp.EmploymentType = *input.EmploymentType
	}
	if input.ProbationEndDate != nil {
		emp.ProbationEndDate = *input.ProbationEndDate
	}
	if input.GradeLevel != nil {
		emp.GradeLevel = *input.GradeLevel
	}

	err = r.DB.Transaction(func(tx *gorm.DB) error {
		// Apply any identity edits (name/email/password/role) to the linked
		// account in the same transaction as the profile save.
		if input.Name != nil || input.Email != nil || input.Password != nil || input.Role != nil {
			if err := updateLoginAccount(tx, auth.TenantID, emp.UserID, input.Name, input.Email, input.Password, input.Role); err != nil {
				return err
			}
		}
		if err := tx.Save(&emp).Error; err != nil {
			return err
		}
		if input.PaymentDetails != nil {
			pd := inputToPaymentDetails(input.PaymentDetails, emp.ID, auth.TenantID)
			return tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, auth.TenantID).
				Assign(pd).
				FirstOrCreate(&pd).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := r.DB.Where("id = ? AND tenant_id = ?", emp.ID, auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		First(&emp).Error; err != nil {
		return nil, err
	}
	return employeeToModel(emp), nil
}

func (r *mutationResolver) UpdateUser(ctx context.Context, id string, input model.UpdateUserInput) (*model.User, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var u models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.Name != nil {
		u.Name = *input.Name
	}
	if input.Email != nil {
		u.Email = *input.Email
	}
	if input.Role != nil {
		u.Role = models.Role(*input.Role)
	}
	if input.IsActive != nil {
		u.IsActive = *input.IsActive
	}
	if input.Password != nil && *input.Password != "" {
		// Enforce the same password policy as every other set-password path.
		if err := utils.ValidatePassword(*input.Password); err != nil {
			return nil, err
		}
		hash, err := utils.HashPassword(*input.Password)
		if err != nil {
			return nil, err
		}
		u.Password = hash
	}
	if err := r.DB.Save(&u).Error; err != nil {
		return nil, err
	}
	if err := r.DB.Where("id = ? AND tenant_id = ?", u.ID, auth.TenantID).First(&u).Error; err != nil {
		return nil, err
	}
	return userToModel(u), nil
}
