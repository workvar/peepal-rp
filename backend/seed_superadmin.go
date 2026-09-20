package main

import (
	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"
	"log"
)

// seedAdmin creates the platform tenant and the initial super admin user when
// they do not exist yet. It runs on every startup but only ever *creates*
// missing rows; it never touches an existing super admin. To push changed
// SUPER_ADMIN_* env values onto an account that already exists, run --migrate
// (which also calls reconcileSuperAdmin).
func seedAdmin() {
	// 1. Create platform tenant if not exists
	var platformTenant models.Tenant
	if err := database.DB.First(&platformTenant, "id = ?", models.PlatformTenantID).Error; err != nil {
		platformTenant = models.Tenant{
			ID:        models.PlatformTenantID,
			Name:      "Platform",
			Type:      models.TenantTypeCollege,
			Status:    models.TenantActive,
			Subdomain: "platform",
			Timezone:  "Asia/Kolkata",
			Currency:  "INR",
		}
		if err := database.DB.Create(&platformTenant).Error; err != nil {
			log.Println("Could not create platform tenant:", err)
			return
		}
		log.Printf("Platform tenant created: %s", platformTenant.ID)
	}

	// 2. Create super admin user if none exists
	var superAdminCount int64
	database.DB.Model(&models.User{}).Where("role = ? AND tenant_id = ?", models.RoleSuperAdmin, models.PlatformTenantID).Count(&superAdminCount)
	if superAdminCount == 0 {
		superAdmin := models.User{
			TenantID: models.PlatformTenantID,
			Name:     "Super Admin",
			Email:    config.App.SuperAdminEmail,
			Password: mustHashSuperAdminPassword(config.App.SuperAdminPassword),
			Role:     models.RoleSuperAdmin,
			IsActive: true,
		}
		if err := database.DB.Create(&superAdmin).Error; err != nil {
			log.Println("Super admin user already exists or could not be created:", err)
		} else {
			log.Printf("Super admin user seeded: %s", config.App.SuperAdminEmail)
		}
	}
}

// reconcileSuperAdmin pushes the configured SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
// onto the existing platform super admin. It runs only under --migrate, so a
// normal restart never rewrites a password an admin may have changed in the UI.
//
//   - Email matches an existing account: sync its password (and re-activate it),
//     writing only when the value actually changed.
//   - Email not found and exactly one super admin exists: treat it as the
//     bootstrap account whose email was changed; rename it and reset its password.
//   - Email not found and several super admins exist: ambiguous which to rename,
//     so create a fresh account from the env and leave the others untouched.
func reconcileSuperAdmin() {
	email := config.App.SuperAdminEmail
	password := config.App.SuperAdminPassword
	if email == "" || password == "" {
		log.Println("reconcile super admin: SUPER_ADMIN_EMAIL/PASSWORD not set, skipping")
		return
	}

	var existing models.User
	err := database.DB.
		Where("email = ? AND tenant_id = ? AND role = ?", email, models.PlatformTenantID, models.RoleSuperAdmin).
		First(&existing).Error
	if err == nil {
		syncSuperAdmin(&existing, password)
		return
	}

	var admins []models.User
	database.DB.
		Where("tenant_id = ? AND role = ?", models.PlatformTenantID, models.RoleSuperAdmin).
		Find(&admins)

	hash := mustHashSuperAdminPassword(password)

	if len(admins) == 1 {
		old := admins[0].Email
		if err := database.DB.Model(&admins[0]).
			Updates(map[string]any{"email": email, "password": hash, "is_active": true}).Error; err != nil {
			log.Println("reconcile super admin: rename failed:", err)
			return
		}
		log.Printf("Super admin email updated: %s -> %s (password reset)", old, email)
		return
	}

	// Zero is normally handled by seedAdmin; this also covers the multi-admin
	// case where the configured email is new.
	su := models.User{
		TenantID: models.PlatformTenantID,
		Name:     "Super Admin",
		Email:    email,
		Password: hash,
		Role:     models.RoleSuperAdmin,
		IsActive: true,
	}
	if err := database.DB.Create(&su).Error; err != nil {
		log.Println("reconcile super admin: create failed:", err)
		return
	}
	log.Printf("Super admin created: %s", email)
}

// syncSuperAdmin updates an existing super admin only when the configured
// password or active flag differs from what is stored, so re-running --migrate
// with no changes is a no-op.
func syncSuperAdmin(u *models.User, password string) {
	updates := map[string]any{}
	if !utils.CheckPassword(password, u.Password) {
		updates["password"] = mustHashSuperAdminPassword(password)
	}
	if !u.IsActive {
		updates["is_active"] = true
	}
	if len(updates) == 0 {
		log.Printf("Super admin %s already in sync", u.Email)
		return
	}
	if err := database.DB.Model(u).Updates(updates).Error; err != nil {
		log.Println("reconcile super admin: update failed:", err)
		return
	}
	log.Printf("Super admin %s updated (synced password/active flag)", u.Email)
}

// mustHashSuperAdminPassword hashes the bootstrap password, failing fast if the
// hash cannot be produced rather than seeding an account with no usable secret.
func mustHashSuperAdminPassword(password string) string {
	hash, err := utils.HashPassword(password)
	if err != nil {
		log.Fatal("super admin: could not hash password:", err)
	}
	return hash
}
