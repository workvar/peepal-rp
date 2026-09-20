package handlers

// Super-admin platform-wide email (SMTP) settings. This row (TenantID ==
// PlatformTenantID) is the shared fallback transport used by any tenant that
// has not configured its own SMTP. Per-tenant settings are managed by tenant
// admins over GraphQL.

import (
	"collegeerp/database"
	"collegeerp/mailer"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// loadPlatformEmailSettings returns the platform row, or a sensible default
// presentation when none has been saved yet.
func loadPlatformEmailSettings(c *fiber.Ctx) models.EmailSettings {
	var s models.EmailSettings
	if err := database.DB.WithContext(c.Context()).
		First(&s, "tenant_id = ?", models.PlatformTenantID).Error; err != nil {
		return models.EmailSettings{TenantID: models.PlatformTenantID, Enabled: true, SMTPPort: 587}
	}
	return s
}

// emailSettingsResponse serialises settings for the client, never exposing the
// stored password (only whether one is set).
func emailSettingsResponse(s models.EmailSettings) fiber.Map {
	port := s.SMTPPort
	if port == 0 {
		port = 587
	}
	return fiber.Map{
		"enabled":       s.Enabled,
		"from_name":     s.FromName,
		"from_email":    s.FromEmail,
		"smtp_host":     s.SMTPHost,
		"smtp_port":     port,
		"smtp_username": s.SMTPUsername,
		"use_tls":       s.UseTLS,
		"has_password":  s.SMTPPassword != "",
	}
}

// GetPlatformEmailSettings (GET /super/email-settings).
func GetPlatformEmailSettings(c *fiber.Ctx) error {
	return utils.OK(c, emailSettingsResponse(loadPlatformEmailSettings(c)), "")
}

// UpdateEmailSettingsRequest carries partial updates. A nil field is left
// unchanged; an empty SMTPPassword keeps the stored one (so the UI need not
// re-enter it on every save).
type UpdateEmailSettingsRequest struct {
	Enabled      *bool   `json:"enabled"`
	FromName     *string `json:"from_name"`
	FromEmail    *string `json:"from_email"`
	SMTPHost     *string `json:"smtp_host"`
	SMTPPort     *int    `json:"smtp_port"`
	SMTPUsername *string `json:"smtp_username"`
	SMTPPassword *string `json:"smtp_password"`
	UseTLS       *bool   `json:"use_tls"`
}

// applyEmailSettings mutates s with the non-nil fields of req. Shared shape with
// the GraphQL tenant resolver's update path.
func applyEmailSettings(s *models.EmailSettings, req UpdateEmailSettingsRequest) {
	if req.Enabled != nil {
		s.Enabled = *req.Enabled
	}
	if req.FromName != nil {
		s.FromName = *req.FromName
	}
	if req.FromEmail != nil {
		s.FromEmail = *req.FromEmail
	}
	if req.SMTPHost != nil {
		s.SMTPHost = *req.SMTPHost
	}
	if req.SMTPPort != nil && *req.SMTPPort > 0 {
		s.SMTPPort = *req.SMTPPort
	}
	if req.SMTPUsername != nil {
		s.SMTPUsername = *req.SMTPUsername
	}
	if req.SMTPPassword != nil && *req.SMTPPassword != "" {
		s.SMTPPassword = *req.SMTPPassword
	}
	if req.UseTLS != nil {
		s.UseTLS = *req.UseTLS
	}
}

// UpdatePlatformEmailSettings (PUT /super/email-settings) upserts the platform row.
func UpdatePlatformEmailSettings(c *fiber.Ctx) error {
	var req UpdateEmailSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var s models.EmailSettings
	if err := database.DB.WithContext(c.Context()).
		First(&s, "tenant_id = ?", models.PlatformTenantID).Error; err != nil {
		s = models.EmailSettings{TenantID: models.PlatformTenantID, Enabled: true, SMTPPort: 587}
	}
	applyEmailSettings(&s, req)

	if err := database.DB.WithContext(c.Context()).Save(&s).Error; err != nil {
		return utils.InternalError(c, "Failed to save email settings")
	}
	return utils.OK(c, emailSettingsResponse(s), "Email settings saved")
}

type testEmailRequest struct {
	To string `json:"to"`
}

// TestPlatformEmail (POST /super/email-settings/test) sends a test message
// using the platform settings to verify the SMTP transport.
func TestPlatformEmail(c *fiber.Ctx) error {
	var req testEmailRequest
	_ = c.BodyParser(&req)

	s := loadPlatformEmailSettings(c)
	if !s.HasSMTP() {
		return utils.BadRequest(c, "Set an SMTP host and a from address before sending a test")
	}
	to := req.To
	if to == "" {
		to = s.FromEmail
	}
	if err := mailer.SendTest(mailer.SettingsToConfig(s), to); err != nil {
		return utils.BadRequest(c, "Test failed: "+err.Error())
	}
	return utils.OK(c, fiber.Map{"to": to}, "Test email sent")
}
