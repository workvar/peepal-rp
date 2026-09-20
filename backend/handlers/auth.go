package handlers

import (
	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/models"
	"collegeerp/utils"
	"log"

	"github.com/gofiber/fiber/v2"
)

type LoginRequest struct {
	// Identifier accepts email, employee ID, or student roll number.
	// Email kept for backward compatibility, ignored if Identifier is set.
	Identifier string `json:"identifier"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	// TenantSubdomain scopes the login to a specific tenant. Required for
	// non-super-admin logins. When omitted, only super_admin users (on the
	// platform tenant) are allowed to log in.
	TenantSubdomain string `json:"tenant_subdomain"`
}

// resolveUserByIdentifier looks up an active user by email, employee ID, or
// student roll number, scoped to a specific tenant. Returns false if no match.
func resolveUserByIdentifier(identifier, tenantID string, user *models.User) bool {
	// 1. Email match within the tenant
	if err := database.DB.Where("email = ? AND tenant_id = ? AND is_active = ?", identifier, tenantID, true).First(user).Error; err == nil {
		return true
	}

	// 2. Employee ID → user (tenant-scoped)
	var emp models.Employee
	if err := database.DB.Where("employee_id = ? AND tenant_id = ?", identifier, tenantID).First(&emp).Error; err == nil {
		if err := database.DB.Where("id = ? AND tenant_id = ? AND is_active = ?", emp.UserID, tenantID, true).First(user).Error; err == nil {
			return true
		}
	}

	// 3. Student roll number → user (tenant-scoped)
	var stu models.Student
	if err := database.DB.Where("roll_number = ? AND tenant_id = ?", identifier, tenantID).First(&stu).Error; err == nil {
		if err := database.DB.Where("id = ? AND tenant_id = ? AND is_active = ?", stu.UserID, tenantID, true).First(user).Error; err == nil {
			return true
		}
	}

	return false
}

// Login authenticates a user and returns a JWT token.
//
// Tenant-scoped: when tenant_subdomain is supplied (the normal case), the
// lookup is restricted to that tenant. Without a tenant_subdomain, only a
// super_admin on the platform tenant may log in (used by /super/login).
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	identifier := req.Identifier
	if identifier == "" {
		identifier = req.Email
	}
	if identifier == "" || req.Password == "" {
		return utils.BadRequest(c, "Identifier and password are required")
	}

	log.Printf("[AUTH] Login attempt: identifier=%s tenant=%s ip=%s", identifier, req.TenantSubdomain, c.IP())

	var user models.User
	// Tenant identity policy surfaced to the client so login/forms can adapt
	// their labels (Email vs Employee ID / Roll Number). Defaults to email-based.
	staffEmailRequired := true
	studentEmailRequired := true

	if req.TenantSubdomain != "" {
		// Tenant-scoped login (the normal path used by /[tenant]/login).
		var tenant models.Tenant
		if err := database.DB.WithContext(c.Context()).Where("subdomain = ?", req.TenantSubdomain).First(&tenant).Error; err != nil {
			log.Printf("[AUTH] Login failed: unknown tenant subdomain=%s", req.TenantSubdomain)
			return utils.Unauthorized(c, "Invalid credentials")
		}
		if tenant.Status == models.TenantSuspended {
			return utils.Forbidden(c, "This organisation is suspended. Contact support.")
		}
		staffEmailRequired = tenant.StaffEmailReq()
		studentEmailRequired = tenant.StudentEmailReq()
		if !resolveUserByIdentifier(identifier, tenant.ID, &user) {
			log.Printf("[AUTH] Login failed: user not found or inactive, identifier=%s tenant=%s", identifier, req.TenantSubdomain)
			// Burn a bcrypt comparison so unknown users and wrong passwords
			// respond in similar time (limits user enumeration).
			utils.CheckDummyPassword(req.Password)
			return utils.Unauthorized(c, "Invalid credentials")
		}
		// Super admins must use the dedicated /super/login path.
		if user.Role == models.RoleSuperAdmin {
			return utils.Forbidden(c, "Super admins must sign in from the super admin page.")
		}
	} else {
		// No tenant supplied: only allow super_admin login via email.
		if err := database.DB.WithContext(c.Context()).Where("email = ? AND tenant_id = ? AND is_active = ?", identifier, models.PlatformTenantID, true).First(&user).Error; err != nil {
			log.Printf("[AUTH] Login failed: super admin lookup failed, identifier=%s", identifier)
			utils.CheckDummyPassword(req.Password)
			return utils.Unauthorized(c, "Invalid credentials")
		}
		if user.Role != models.RoleSuperAdmin {
			return utils.Forbidden(c, "Use your organisation's login page.")
		}
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		log.Printf("[AUTH] Login failed: wrong password, identifier=%s", identifier)
		return utils.Unauthorized(c, "Invalid credentials")
	}

	// Subscription gate: tenant members may sign in only when their organisation
	// has an active (or trial) subscription. A missing, suspended, or expired
	// plan blocks login with a clear message shown on the login page. Super
	// admins manage the platform itself and are exempt.
	if user.Role != models.RoleSuperAdmin {
		if allowed, reason := models.SubscriptionLoginAllowed(database.DB.WithContext(c.Context()), user.TenantID); !allowed {
			log.Printf("[AUTH] Login blocked: subscription=%s identifier=%s tenant=%s", reason, identifier, user.TenantID)
			return utils.Forbidden(c, subscriptionBlockMessage(reason))
		}
	}

	log.Printf("[AUTH] Login success: email=%s role=%s tenant=%s", user.Email, user.Role, user.TenantID)
	graph.RecordLoginAudit(database.DB, user.TenantID, user.ID, user.Name, string(user.Role), c.IP())

	// Establishes both halves of the session: a short-lived access token and the
	// rotating refresh token that renews it (see session.go).
	tokens, err := startSession(c, &user, string(user.Role))
	if err != nil {
		log.Printf("[AUTH] Token generation failed: email=%s err=%v", user.Email, err)
		return utils.InternalError(c, "Could not generate token")
	}

	payload := sessionPayload(c, tokens)
	payload["user"] = fiber.Map{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		// role is the ACTIVE workspace; at login it always equals base_role.
		"role":                   user.Role,
		"base_role":              user.Role,
		"tenant_id":              user.TenantID,
		"photo_url":              user.PhotoURL,
		"staff_email_required":   staffEmailRequired,
		"student_email_required": studentEmailRequired,
		"workspaces":             models.UserWorkspaces(database.DB.WithContext(c.Context()), &user),
	}
	return utils.OK(c, payload, "Login successful")
}

// subscriptionBlockMessage maps a login-gate reason code to user-facing copy
// shown on the login page when an organisation cannot sign in.
func subscriptionBlockMessage(reason string) string {
	switch reason {
	case "suspended":
		return "Your organisation's subscription is suspended. Please contact your administrator."
	case "expired":
		return "Your organisation's subscription has expired. Please contact your administrator to renew it."
	default:
		return "No subscription plan is assigned to your organisation. Please contact your administrator to get access."
	}
}

// Logout ends the session on the server and clears both cookies.
//
// Revoking matters more than clearing: the access token is stateless and simply
// expires (within its short TTL), but the refresh token would otherwise keep
// working for weeks in the hands of anyone who copied it.
func Logout(c *fiber.Ctx) error {
	if database.DB != nil {
		if sessionID := currentSessionID(c); sessionID != "" {
			if err := models.RevokeSession(database.DB.WithContext(c.Context()), sessionID, models.RevokeReasonLogout); err != nil {
				log.Printf("[AUTH] Logout: failed to revoke session %s: %v", sessionID, err)
			}
		}
	}
	clearSessionCookies(c)
	return utils.OK(c, nil, "Logged out")
}

// UpdateMyProfile lets the authenticated user update their own name.
func UpdateMyProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var body struct {
		Name     *string `json:"name"`
		PhotoURL *string `json:"photo_url"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	if body.Name != nil {
		if *body.Name == "" {
			return utils.BadRequest(c, "Name cannot be empty")
		}
		user.Name = *body.Name
	}
	if body.PhotoURL != nil {
		user.PhotoURL = *body.PhotoURL
	}

	if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	return utils.OK(c, fiber.Map{
		"id":        user.ID,
		"name":      user.Name,
		"email":     user.Email,
		"role":      user.Role,
		"photo_url": user.PhotoURL,
	}, "Profile updated")
}

// ChangePassword lets the authenticated user change their password.
// Requires the current password for verification.
func ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if body.CurrentPassword == "" || body.NewPassword == "" {
		return utils.BadRequest(c, "Current and new passwords are required")
	}
	if err := utils.ValidatePassword(body.NewPassword); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	if !utils.CheckPassword(body.CurrentPassword, user.Password) {
		return utils.Unauthorized(c, "Current password is incorrect")
	}

	hash, err := utils.HashPassword(body.NewPassword)
	if err != nil {
		return utils.InternalError(c, "Could not hash password")
	}

	user.Password = hash
	if err := database.DB.WithContext(c.Context()).Save(&user).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	// Changing a password signs out every other device: a session established
	// with the old credential must not outlive it. The caller keeps working —
	// their current session is re-established immediately below.
	if err := models.RevokeUserSessions(database.DB.WithContext(c.Context()), user.ID, models.RevokeReasonPasswordChange); err != nil {
		log.Printf("[AUTH] Password change: failed to revoke sessions for %s: %v", user.ID, err)
	}
	// Push credentials follow the sessions. The app re-registers its token on
	// the next sign-in, so this costs the legitimate user nothing.
	if err := models.DisableUserDeviceTokens(database.DB.WithContext(c.Context()), user.ID, models.DeviceRevokeLogout); err != nil {
		log.Printf("[AUTH] Password change: failed to disable device tokens for %s: %v", user.ID, err)
	}
	activeRole, _ := c.Locals("role").(string)
	if _, err := startSession(c, &user, activeRole); err != nil {
		// The password did change; the caller just has to sign in again.
		log.Printf("[AUTH] Password change: could not re-establish session for %s: %v", user.ID, err)
		clearSessionCookies(c)
	}

	return utils.OK(c, nil, "Password changed successfully")
}

// Me returns the current authenticated user's profile.
func Me(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	// Surface the tenant identity policy so admin forms can adapt (hide the
	// email field, relabel the login identifier, etc.). Defaults to email-based
	// when the tenant cannot be loaded (e.g. platform/super-admin sessions).
	staffEmailRequired := true
	studentEmailRequired := true
	var tenant models.Tenant
	if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", user.TenantID).Error; err == nil {
		staffEmailRequired = tenant.StaffEmailReq()
		studentEmailRequired = tenant.StudentEmailReq()
	}

	// The active workspace comes from the token, not the User row: the user may
	// be acting as one of their secondary roles. base_role stays the User row's
	// primary role so the UI can mark the non-revocable workspace.
	activeRole, _ := c.Locals("role").(string)
	if activeRole == "" {
		activeRole = string(user.Role)
	}

	return utils.OK(c, fiber.Map{
		"id":                     user.ID,
		"name":                   user.Name,
		"email":                  user.Email,
		"role":                   activeRole,
		"base_role":              user.Role,
		"is_active":              user.IsActive,
		"tenant_id":              user.TenantID,
		"photo_url":              user.PhotoURL,
		"staff_email_required":   staffEmailRequired,
		"student_email_required": studentEmailRequired,
		"workspaces":             models.UserWorkspaces(database.DB.WithContext(c.Context()), &user),
	}, "")
}
