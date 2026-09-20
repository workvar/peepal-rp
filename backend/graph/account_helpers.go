package graph

// Helpers for managing the login account (User row) that backs a student or
// employee profile. Onboarding is now a single step: creating a student or
// employee creates their login account in the same transaction, so these
// helpers centralise the identity policy, password handling, and cascade
// cleanup that used to live in the standalone user resolvers.

import (
	"strings"

	"collegeerp/invites"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// employeeRoleFromInput maps an optional role string to a base Role for an
// employee account. Employees may only be teacher or staff; anything else
// (including admin/student) falls back to staff.
func employeeRoleFromInput(role *string) models.Role {
	if role == nil {
		return models.RoleStaff
	}
	if strings.ToLower(strings.TrimSpace(*role)) == "teacher" {
		return models.RoleTeacher
	}
	return models.RoleStaff
}

// createLoginAccount inserts a new User for a student/employee inside the given
// transaction. It enforces the tenant's identity policy (email may be blank
// only for ID-based populations), guards against duplicate emails, and
// validates + hashes the password. Returns the new user's ID.
func createLoginAccount(tx *gorm.DB, tenantID, name, email, password string, role models.Role) (string, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" {
		return "", GQLErr("a name is required")
	}

	var tenant models.Tenant
	if err := tx.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return "", GQLErr("could not load organisation settings")
	}
	if email == "" && tenant.EmailRequiredForRole(role) {
		return "", GQLErr("an email is required for this role")
	}
	if email != "" {
		var existing models.User
		if err := tx.Where("tenant_id = ? AND email = ?", tenantID, email).First(&existing).Error; err == nil {
			return "", GQLErr("a user with this email already exists")
		}
	}

	// Invite mode: when no password is given, store an unguessable placeholder.
	// The account stays inert until the user accepts an invite and sets their
	// own password (see maybeSendInvite + the invites package).
	if password == "" {
		password = utils.RandomPassword()
	} else if err := utils.ValidatePassword(password); err != nil {
		return "", err
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return "", GQLErr("could not secure password")
	}

	user := models.User{
		TenantID: tenantID,
		Name:     name,
		Email:    email,
		Password: hash,
		Role:     role,
		IsActive: true,
	}
	if err := tx.Create(&user).Error; err != nil {
		return "", GQLErr("could not create login account (email may already exist)")
	}
	return user.ID, nil
}

// maybeSendInvite best-effort issues a password-setup invite to a freshly
// created user. It is a no-op when send is false or the user has no email.
// Delivery failures are swallowed: the account already exists and an admin can
// resend the invite (resendInvite) at any time.
func maybeSendInvite(db *gorm.DB, tenantID, userID string, send bool) {
	if !send {
		return
	}
	var tenant models.Tenant
	if err := db.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return
	}
	var user models.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		return
	}
	if user.Email == "" {
		return
	}
	_, _ = invites.Issue(db, &tenant, &user)
}

// updateLoginAccount applies optional identity changes to an existing user
// inside a transaction. Nil pointers are left unchanged; an empty password is
// ignored so callers can always pass it through from an edit form.
func updateLoginAccount(tx *gorm.DB, tenantID, userID string, name, email, password, role *string) error {
	var u models.User
	if err := tx.Where("id = ? AND tenant_id = ?", userID, tenantID).First(&u).Error; err != nil {
		return ErrNotFound
	}

	if name != nil {
		u.Name = strings.TrimSpace(*name)
	}
	if role != nil && *role != "" {
		u.Role = models.Role(strings.ToLower(strings.TrimSpace(*role)))
	}
	if email != nil {
		newEmail := strings.TrimSpace(*email)
		if newEmail != "" && newEmail != u.Email {
			var existing models.User
			if err := tx.Where("tenant_id = ? AND email = ? AND id <> ?", tenantID, newEmail, userID).
				First(&existing).Error; err == nil {
				return GQLErr("a user with this email already exists")
			}
		}
		if newEmail == "" {
			var tenant models.Tenant
			if err := tx.First(&tenant, "id = ?", tenantID).Error; err == nil &&
				tenant.EmailRequiredForRole(u.Role) {
				return GQLErr("an email is required for this role")
			}
		}
		u.Email = newEmail
	}
	if password != nil && *password != "" {
		if err := utils.ValidatePassword(*password); err != nil {
			return err
		}
		hash, err := utils.HashPassword(*password)
		if err != nil {
			return GQLErr("could not secure password")
		}
		u.Password = hash
	}

	return tx.Save(&u).Error
}

// deleteUserCascade removes a login account and the rows tied to it within a
// transaction: it first unlinks anyone who reported to this user (clears their
// manager_id), then deletes the per-user records (leave balances, leave
// requests, notifications, library issues, invites), and finally the account
// itself. The student/employee profile is deleted by the caller.
func deleteUserCascade(tx *gorm.DB, tenantID, userID string) error {
	if userID == "" {
		return nil
	}
	// Reportees: anyone whose immediate manager was this user is detached so the
	// org hierarchy keeps no dangling manager link.
	if err := tx.Model(&models.User{}).Where("manager_id = ?", userID).
		Update("manager_id", nil).Error; err != nil {
		return err
	}
	// Rows keyed by user_id.
	if err := tx.Where("user_id = ?", userID).Delete(&models.LeaveBalance{}).Error; err != nil {
		return err
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.Notification{}).Error; err != nil {
		return err
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.DeviceToken{}).Error; err != nil {
		return err
	}
	// Refresh-token families. Deleting them is what makes the account's live
	// sessions stop working: the user row is about to go, but a refresh token
	// is looked up by its own hash, so leaving these behind would let a signed-
	// in browser keep rotating until something downstream noticed the missing
	// user. Deleted rather than revoked because nothing is left to audit.
	if err := tx.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error; err != nil {
		return err
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.LibraryIssue{}).Error; err != nil {
		return err
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.Invite{}).Error; err != nil {
		return err
	}
	// Extra workspace grants (multi-role).
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error; err != nil {
		return err
	}
	// Leave requests are keyed by applicant_id.
	if err := tx.Where("applicant_id = ?", userID).Delete(&models.Leave{}).Error; err != nil {
		return err
	}
	return tx.Where("id = ? AND tenant_id = ?", userID, tenantID).Delete(&models.User{}).Error
}
