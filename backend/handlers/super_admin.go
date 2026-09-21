package handlers

// Tenant management handlers for super admins: tenant CRUD, status, lookup, platform stats, and impersonation. Super admin user management lives in super_admins.go.

import (
	"collegeerp/database"
	"collegeerp/invites"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ListTenants returns paginated list of all tenants (super admin only).
func ListTenants(c *fiber.Ctx) error {
	page := c.Query("page", "1")
	limit := c.Query("limit", "20")
	status := c.Query("status", "")

	pageNum, _ := strconv.Atoi(page)
	limitNum, _ := strconv.Atoi(limit)
	if pageNum < 1 {
		pageNum = 1
	}
	if limitNum < 1 || limitNum > 100 {
		limitNum = 20
	}

	offset := (pageNum - 1) * limitNum

	// The platform tenant is internal plumbing, not a customer organisation, so
	// it never appears in the super-admin org lists (or anything derived from
	// them: the assign-subscription dropdown and "orgs without a subscription").
	query := database.DB.WithContext(c.Context()).
		Model(&models.Tenant{}).
		Where("id <> ?", models.PlatformTenantID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var tenants []models.Tenant
	var total int64
	query.Count(&total)
	query.Offset(offset).Limit(limitNum).Find(&tenants)

	return utils.OK(c, fiber.Map{
		"tenants": tenants,
		"pagination": fiber.Map{
			"page":  pageNum,
			"limit": limitNum,
			"total": total,
		},
	}, "")
}

type CreateTenantRequest struct {
	Name              string `json:"name"`
	Type              string `json:"type"`
	Subdomain         string `json:"subdomain"`
	PrimaryAdminName  string `json:"primary_admin_name"`
	PrimaryAdminEmail string `json:"primary_admin_email"`
	// PrimaryAdminPassword is now optional. Leave it blank and set SendInvite to
	// e-mail the admin a password-setup link instead of choosing one for them.
	PrimaryAdminPassword string `json:"primary_admin_password"`
	// SendInvite asks the server to e-mail the primary admin an invite link.
	// Honoured only when the tenant is allowed to send mail.
	SendInvite bool `json:"send_invite"`
	// EmailSendingAllowed is the super-admin capability switch for this tenant
	// (default true). When false the tenant can never send mail and the invite
	// flow is unavailable.
	EmailSendingAllowed *bool `json:"email_sending_allowed"`
	// Identity policy (optional; default true = email-based). When false, that
	// population can be created without an email and signs in with their
	// Employee ID / Roll Number. The primary admin always needs an email.
	StaffEmailRequired   *bool `json:"staff_email_required"`
	StudentEmailRequired *bool `json:"student_email_required"`
}

// CreateTenant creates a new tenant with an admin user (super admin only).
func CreateTenant(c *fiber.Ctx) error {
	var req CreateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.Subdomain == "" || req.PrimaryAdminEmail == "" {
		return utils.BadRequest(c, "Name, subdomain, and primary_admin_email are required")
	}

	// Normalize tenant type: reject unknown values, fall back to education
	// when the caller omits it. This keeps legacy aliases (college/enterprise)
	// working while steering new tenants toward canonical names.
	rawType := models.TenantType(req.Type)
	if req.Type != "" && !rawType.IsValid() {
		return utils.BadRequest(c, "Invalid tenant type. Expected one of: education, corporate, healthcare, nonprofit")
	}
	if rawType == "" {
		rawType = models.TenantTypeEducation
	}
	rawType = rawType.Canonical()

	// Identity policy: default to email-based unless the caller opts out.
	staffEmailRequired := true
	studentEmailRequired := true
	if req.StaffEmailRequired != nil {
		staffEmailRequired = *req.StaffEmailRequired
	}
	if req.StudentEmailRequired != nil {
		studentEmailRequired = *req.StudentEmailRequired
	}

	// Email-sending capability: default on unless the super admin opts out.
	emailAllowed := true
	if req.EmailSendingAllowed != nil {
		emailAllowed = *req.EmailSendingAllowed
	}

	// Decide how the primary admin gets a password. Either a password is set
	// now, or (when the tenant may send mail) an invite link is e-mailed so the
	// admin chooses their own. One of the two must be possible.
	wantInvite := req.SendInvite && emailAllowed
	hasPassword := req.PrimaryAdminPassword != ""
	if !hasPassword && !wantInvite {
		return utils.BadRequest(c, "Set a password for the admin, or enable email so an invite can be sent")
	}

	adminPassword := req.PrimaryAdminPassword
	if hasPassword {
		if err := utils.ValidatePassword(adminPassword); err != nil {
			return utils.BadRequest(c, err.Error())
		}
	} else {
		// Invite-only: store an unguessable placeholder until the invite is accepted.
		adminPassword = utils.RandomPassword()
	}
	hash, err := utils.HashPassword(adminPassword)
	if err != nil {
		return utils.InternalError(c, "Could not hash password")
	}

	// Create tenant
	tenant := models.Tenant{
		Name:                 req.Name,
		Type:                 rawType,
		Subdomain:            req.Subdomain,
		Status:               models.TenantActive,
		PrimaryAdminEmail:    req.PrimaryAdminEmail,
		Timezone:             "Asia/Kolkata",
		Currency:             "INR",
		StaffEmailRequired:   &staffEmailRequired,
		StudentEmailRequired: &studentEmailRequired,
		EmailSendingAllowed:  &emailAllowed,
	}

	if err := database.DB.WithContext(c.Context()).Create(&tenant).Error; err != nil {
		return utils.BadRequest(c, "Could not create tenant — subdomain may already exist")
	}

	// Seed industry labels, ready-made roles, and the matching built-in plan
	// (Hospital for healthcare, Education for schools) so the org doesn't
	// boot onto Students/Fees after being created as a hospital.
	models.SyncIndustryPresentation(database.DB.WithContext(c.Context()), &tenant)

	admin := models.User{
		TenantID: tenant.ID,
		Name:     req.PrimaryAdminName,
		Email:    req.PrimaryAdminEmail,
		Password: hash,
		Role:     models.RoleAdmin,
		IsActive: true,
	}

	if err := database.DB.WithContext(c.Context()).Create(&admin).Error; err != nil {
		return utils.BadRequest(c, "Could not create admin user")
	}

	// Optionally e-mail the admin a password-setup link. Issue always returns a
	// link (Sent reflects whether delivery succeeded), so the super admin can
	// copy it if no SMTP is configured yet.
	var inviteInfo *invites.Result
	if wantInvite {
		if res, ierr := invites.Issue(database.DB.WithContext(c.Context()), &tenant, &admin); ierr == nil {
			inviteInfo = res
		}
	}

	return utils.Created(c, fiber.Map{
		"tenant": tenant,
		"admin": fiber.Map{
			"id":    admin.ID,
			"name":  admin.Name,
			"email": admin.Email,
			"role":  admin.Role,
		},
		"invite": inviteInfo,
	}, "Tenant created successfully")
}

// GetTenant returns a tenant with user count (super admin only).
func GetTenant(c *fiber.Ctx) error {
	id := c.Params("id")
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	var userCount int64
	database.DB.WithContext(c.Context()).Model(&models.User{}).Where("tenant_id = ?", id).Count(&userCount)

	return utils.OK(c, fiber.Map{
		"tenant":     tenant,
		"user_count": userCount,
	}, "")
}

type UpdateTenantRequest struct {
	Name                 string `json:"name"`
	LogoURL              string `json:"logo_url"`
	Timezone             string `json:"timezone"`
	Currency             string `json:"currency"`
	Type                 string `json:"type"`
	StaffEmailRequired   *bool  `json:"staff_email_required"`
	StudentEmailRequired *bool  `json:"student_email_required"`
	EmailSendingAllowed  *bool  `json:"email_sending_allowed"`
}

// UpdateTenant updates tenant details (super admin only).
func UpdateTenant(c *fiber.Ctx) error {
	id := c.Params("id")
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	var req UpdateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.LogoURL != "" {
		tenant.LogoURL = req.LogoURL
	}
	if req.Timezone != "" {
		tenant.Timezone = req.Timezone
	}
	if req.Currency != "" {
		tenant.Currency = req.Currency
	}
	oldType := tenant.Type.Canonical()
	if req.Type != "" {
		rawType := models.TenantType(req.Type)
		if !rawType.IsValid() {
			return utils.BadRequest(c, "Invalid tenant type. Expected one of: education, corporate, healthcare, nonprofit")
		}
		tenant.Type = rawType.Canonical()
	}
	if req.StaffEmailRequired != nil {
		tenant.StaffEmailRequired = req.StaffEmailRequired
	}
	if req.StudentEmailRequired != nil {
		tenant.StudentEmailRequired = req.StudentEmailRequired
	}
	if req.EmailSendingAllowed != nil {
		tenant.EmailSendingAllowed = req.EmailSendingAllowed
	}

	if err := database.DB.WithContext(c.Context()).Save(&tenant).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	if tenant.Type.Canonical() != oldType {
		// Relabel Teacher→Clinician, swap Education↔Hospital plan, seed
		// healthcare default roles (Doctor / Receptionist / …).
		models.SyncIndustryPresentation(database.DB.WithContext(c.Context()), &tenant)
	}
	return utils.OK(c, tenant, "Tenant updated")
}

type UpdateTenantStatusRequest struct {
	Status string `json:"status"`
}

// UpdateTenantStatus updates tenant status (super admin only).
func UpdateTenantStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	var req UpdateTenantStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Status != string(models.TenantActive) && req.Status != string(models.TenantSuspended) {
		return utils.BadRequest(c, "Status must be 'active' or 'suspended'")
	}

	tenant.Status = models.TenantStatus(req.Status)
	if err := database.DB.WithContext(c.Context()).Save(&tenant).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, tenant, "Tenant status updated")
}

// ImpersonateTenant generates an impersonation token for a tenant's admin (super admin only).
func ImpersonateTenant(c *fiber.Ctx) error {
	id := c.Params("id")
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	// Find tenant's first admin user
	var admin models.User
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND role = ?", id, models.RoleAdmin).First(&admin).Error; err != nil {
		return utils.NotFound(c, "No admin user found for tenant")
	}

	// End the super admin's own session before taking on the tenant admin's:
	// the cookie is about to be overwritten, so leaving the old refresh token
	// live would strand a session nobody holds.
	if sessionID, ok := c.Locals("sessionID").(string); ok && sessionID != "" {
		_ = models.RevokeSession(database.DB.WithContext(c.Context()), sessionID, models.RevokeReasonSuperseded)
	}

	// Swap the caller's session for the impersonated tenant-admin one. Its
	// access token is as short-lived as any other and its refresh token is
	// revocable, so the impersonation can be cut off centrally.
	tokens, err := startSession(c, &admin, string(admin.Role))
	if err != nil {
		return utils.InternalError(c, "Could not generate token")
	}
	token := tokens.Access

	return utils.OK(c, fiber.Map{
		"user": sessionUserMap(c, &admin, &tenant, string(admin.Role)),
		"tenant": fiber.Map{
			"id":        tenant.ID,
			"subdomain": tenant.Subdomain,
			"type":      tenant.Type.Canonical(),
		},
		"token": token,
		// Seconds until the access token expires; the session itself continues
		// past it by refreshing (POST /auth/refresh).
		"expires_in": int(accessTTL().Seconds()),
	}, "Impersonation session started")
}

// GetPlatformStats returns platform-wide statistics (super admin only).
func GetPlatformStats(c *fiber.Ctx) error {
	var totalTenants, activeTenants, suspendedTenants, totalUsers int64

	// Exclude the internal platform tenant (and its super-admin users) from the
	// platform stats so counts reflect real customer organisations only.
	notPlatform := func() *gorm.DB {
		return database.DB.WithContext(c.Context()).Model(&models.Tenant{}).Where("id <> ?", models.PlatformTenantID)
	}
	notPlatform().Count(&totalTenants)
	notPlatform().Where("status = ?", models.TenantActive).Count(&activeTenants)
	notPlatform().Where("status = ?", models.TenantSuspended).Count(&suspendedTenants)
	database.DB.WithContext(c.Context()).Model(&models.User{}).Where("tenant_id <> ?", models.PlatformTenantID).Count(&totalUsers)

	return utils.OK(c, fiber.Map{
		"total_tenants":     totalTenants,
		"active_tenants":    activeTenants,
		"suspended_tenants": suspendedTenants,
		"total_users":       totalUsers,
	}, "")
}

// LookupTenant is a public endpoint that resolves a subdomain slug to tenant
// info. Used by login pages to validate the org before authenticating.
func LookupTenant(c *fiber.Ctx) error {
	subdomain := c.Params("subdomain")

	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).Where("subdomain = ?", subdomain).First(&tenant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.NotFound(c, "Organisation not found")
		}
		return utils.InternalError(c, "Failed to lookup organisation")
	}

	if tenant.Status == models.TenantSuspended {
		return utils.Forbidden(c, "Organisation is suspended")
	}

	return utils.OK(c, fiber.Map{
		"id":                     tenant.ID,
		"name":                   tenant.Name,
		"subdomain":              tenant.Subdomain,
		"status":                 tenant.Status,
		"type":                   tenant.Type.Canonical(),
		"staff_email_required":   tenant.StaffEmailReq(),
		"student_email_required": tenant.StudentEmailReq(),
	}, "")
}

// HardDeleteTenantRequest is the request body for HardDeleteTenant.
type HardDeleteTenantRequest struct {
	Password string `json:"password"`
}

// HardDeleteTenant permanently deletes a tenant and all associated data (super admin only).
// The caller must supply their current password for confirmation.
func HardDeleteTenant(c *fiber.Ctx) error {
	id := c.Params("id")

	var req HardDeleteTenantRequest
	if err := c.BodyParser(&req); err != nil || req.Password == "" {
		return utils.BadRequest(c, "Password is required")
	}

	// Verify caller's password.
	callerID := middleware.UserID(c)
	var caller models.User
	if err := database.DB.WithContext(c.Context()).First(&caller, "id = ?", callerID).Error; err != nil {
		return utils.NotFound(c, "Caller not found")
	}
	if !utils.CheckPassword(req.Password, caller.Password) {
		return utils.Forbidden(c, "Incorrect password")
	}

	// Guard: never delete the platform tenant.
	if id == models.PlatformTenantID {
		return utils.Forbidden(c, "Cannot delete platform tenant")
	}

	// Confirm tenant exists.
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Tenant not found")
	}

	// Hard delete everything in a single transaction, leaf-first to avoid FK violations.
	err := database.DB.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		tables := []interface{}{
			&models.Mark{},
			&models.Attendance{},
			&models.AttendanceSettings{},
			&models.Holiday{},
			&models.FeePayment{},
			&models.StudentFeeInstallment{},
			&models.StudentFeeDiscount{},
			&models.StudentFeeAddOn{},
			&models.StudentFee{},
			&models.FeeAllocationInstallment{},
			&models.FeeAllocation{},
			&models.FeeAddOn{},
			&models.FeeStructureItem{},
			&models.FeeStructure{},
			&models.FeeCategory{},
			&models.PayrollDeduction{},
			&models.Payroll{},
			&models.SalaryAssignment{},
			&models.SalaryTemplate{},
			&models.Leave{},
			&models.LeaveBalance{},
			&models.LeaveTypeConfig{},
			&models.LibraryIssue{},
			&models.LibraryBook{},
			&models.HostelAllocation{},
			&models.HostelRoom{},
			&models.HostelBlock{},
			&models.TransportAllocation{},
			&models.TransportVehicle{},
			&models.TransportRoute{},
			&models.TimetableSlot{},
			&models.Event{},
			&models.Announcement{},
			&models.Notification{},
			&models.ExamSchedule{},
			&models.Student{},
			&models.Course{},
			&models.Subject{},
			&models.Semester{},
			&models.AcademicYear{},
			&models.User{},
			&models.CustomRole{},
			&models.OrgProfile{},
			&models.TenantSubscription{},
		}
		for _, model := range tables {
			if err := tx.Where("tenant_id = ?", id).Delete(model).Error; err != nil {
				return err
			}
		}
		// Delete the tenant record itself last.
		return tx.Delete(&models.Tenant{}, "id = ?", id).Error
	})

	if err != nil {
		return utils.InternalError(c, "Failed to delete tenant")
	}

	return utils.OK(c, nil, "Tenant permanently deleted")
}
