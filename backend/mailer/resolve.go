package mailer

import (
	"errors"

	"collegeerp/models"

	"gorm.io/gorm"
)

// SendStatus is a snapshot of whether a tenant can currently send mail, broken
// down so the UI can explain *why* sending is or isn't available.
type SendStatus struct {
	Allowed             bool // super-admin capability (Tenant.EmailSendingAllowed)
	Enabled             bool // tenant-admin toggle (own EmailSettings.Enabled; default true)
	TransportConfigured bool // a usable SMTP exists (tenant's own or the platform fallback)
	CanSend             bool // Allowed && Enabled && TransportConfigured
}

// Resolve returns the SMTP transport a tenant should use, or ErrNoTransport.
//
//	tenant not allowed (super admin)         -> ErrNoTransport
//	tenant row Enabled=false                 -> ErrNoTransport
//	tenant row has its own SMTP              -> use it
//	otherwise, platform row (Enabled+SMTP)   -> use it
//	nothing usable                           -> ErrNoTransport
func Resolve(db *gorm.DB, tenantID string) (SMTPConfig, error) {
	var tenant models.Tenant
	if err := db.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return SMTPConfig{}, err
	}
	if !tenant.EmailAllowed() {
		return SMTPConfig{}, ErrNoTransport
	}

	own, hasOwn := loadSettings(db, tenantID)
	if hasOwn && !own.Enabled {
		return SMTPConfig{}, ErrNoTransport
	}
	if hasOwn && own.HasSMTP() {
		return SettingsToConfig(own), nil
	}

	platform, hasPlatform := loadSettings(db, models.PlatformTenantID)
	if hasPlatform && platform.Enabled && platform.HasSMTP() {
		return SettingsToConfig(platform), nil
	}
	return SMTPConfig{}, ErrNoTransport
}

// Status reports the per-flag breakdown used by the email-settings UI.
func Status(db *gorm.DB, tenantID string) SendStatus {
	var st SendStatus
	var tenant models.Tenant
	if err := db.First(&tenant, "id = ?", tenantID).Error; err != nil {
		return st
	}
	st.Allowed = tenant.EmailAllowed()

	own, hasOwn := loadSettings(db, tenantID)
	st.Enabled = !hasOwn || own.Enabled // no row => default enabled

	_, err := Resolve(db, tenantID)
	st.TransportConfigured = err == nil ||
		(hasOwn && own.HasSMTP()) // own SMTP counts even if a disable would block sending
	st.CanSend = err == nil
	return st
}

func loadSettings(db *gorm.DB, tenantID string) (models.EmailSettings, bool) {
	var s models.EmailSettings
	if err := db.First(&s, "tenant_id = ?", tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.EmailSettings{}, false
		}
		return models.EmailSettings{}, false
	}
	return s, true
}

// SettingsToConfig flattens a stored EmailSettings row into a usable transport.
func SettingsToConfig(s models.EmailSettings) SMTPConfig {
	port := s.SMTPPort
	if port == 0 {
		port = 587
	}
	return SMTPConfig{
		Host:      s.SMTPHost,
		Port:      port,
		Username:  s.SMTPUsername,
		Password:  s.SMTPPassword,
		FromName:  s.FromName,
		FromEmail: s.FromEmail,
		UseTLS:    s.UseTLS,
	}
}
