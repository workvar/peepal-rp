package bulk

// Shared helper for creating the login account (User row) that backs a student
// or employee imported via CSV. It mirrors the single-step GraphQL onboarding
// (graph/account_helpers.go): there is no longer a standalone "user" you link
// to — every imported row creates its own account together with the profile.

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/invites"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// createBulkAccount inserts a new User inside the given transaction. Name is
// required; email is optional only for populations the tenant runs on IDs
// (Employee ID / Roll Number); password is optional — leave it blank to create
// an inert account the user activates via an invite link. customRoleID is
// optional (nil for none) and only meaningful for employees — it attaches a
// tenant-defined CustomRole (e.g. "Doctor") on top of the base teacher/staff
// role, mirroring the manual Add Employee flow's post-create role assignment.
// Returns the user ID.
func createBulkAccount(tx *gorm.DB, tenantID, name, email, password string, role models.Role, customRoleID *string) (string, error) {
	name = strings.TrimSpace(name)
	email = strings.ToLower(strings.TrimSpace(email))
	if name == "" {
		return "", errors.New("name is required")
	}

	var tenant models.Tenant
	if err := tx.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return "", errors.New("could not load organisation settings")
	}
	if email == "" && tenant.EmailRequiredForRole(role) {
		return "", errors.New("email is required for this role")
	}
	if email != "" {
		var existing models.User
		if err := tx.Where("tenant_id = ? AND email = ?", tenantID, email).First(&existing).Error; err == nil {
			return "", errors.New("a user with this email already exists")
		}
	}

	// No password -> store an unguessable placeholder; the account stays inert
	// until the user accepts an invite and sets their own password.
	if password == "" {
		password = utils.RandomPassword()
	} else if err := utils.ValidatePassword(password); err != nil {
		return "", err
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return "", errors.New("could not secure password")
	}

	u := models.User{
		TenantID:     tenantID,
		Name:         name,
		Email:        email,
		Password:     hash,
		Role:         role,
		IsActive:     true,
		CustomRoleID: customRoleID,
	}
	if err := tx.Create(&u).Error; err != nil {
		return "", errors.New("could not create login account (email may already exist)")
	}
	return u.ID, nil
}

// sendBulkInvite best-effort e-mails a password-setup invite to a freshly
// imported user. No-op when send is false or the user has no email; delivery
// failures are swallowed so a mail hiccup never fails an otherwise good row.
func sendBulkInvite(tenantID, userID string, send bool) {
	if !send {
		return
	}
	var tenant models.Tenant
	if err := database.DB.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return
	}
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return
	}
	if user.Email == "" {
		return
	}
	_, _ = invites.Issue(database.DB, &tenant, &user)
}
