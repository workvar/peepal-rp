package handlers

// Super-admin email-template designer. Lists the system email types, lets the
// super admin override each type's subject/body (with {{variable}} placeholders),
// reset to the built-in default, and send a sample test. Templates are
// platform-global — there is at most one override row per key.

import (
	"collegeerp/database"
	"collegeerp/mailer"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// emailTemplatePayload is the per-type shape returned to the designer.
func emailTemplatePayload(def mailer.TemplateDef, override *models.EmailTemplate) fiber.Map {
	subject, bodyHTML, bodyText := def.DefaultSubject, def.DefaultHTML, def.DefaultText
	overridden := false
	designJSON := ""
	if override != nil {
		overridden = true
		designJSON = override.DesignJSON
		if override.Subject != "" {
			subject = override.Subject
		}
		if override.BodyHTML != "" {
			bodyHTML = override.BodyHTML
		}
		if override.BodyText != "" {
			bodyText = override.BodyText
		}
	}
	return fiber.Map{
		"key":             def.Key,
		"name":            def.Name,
		"description":     def.Description,
		"vars":            def.Vars,
		"subject":         subject,
		"body_html":       bodyHTML,
		"body_text":       bodyText,
		"design_json":     designJSON,
		"default_subject": def.DefaultSubject,
		"default_html":    def.DefaultHTML,
		"default_text":    def.DefaultText,
		"overridden":      overridden,
	}
}

func loadTemplateOverride(c *fiber.Ctx, key string) *models.EmailTemplate {
	var row models.EmailTemplate
	if err := database.DB.WithContext(c.Context()).First(&row, "template_key = ?", key).Error; err != nil {
		return nil
	}
	return &row
}

// ListEmailTemplates (GET /super/email-templates).
func ListEmailTemplates(c *fiber.Ctx) error {
	defs := mailer.Templates()
	out := make([]fiber.Map, 0, len(defs))
	for _, def := range defs {
		out = append(out, emailTemplatePayload(def, loadTemplateOverride(c, def.Key)))
	}
	return utils.OK(c, out, "")
}

// GetEmailTemplate (GET /super/email-templates/:key).
func GetEmailTemplate(c *fiber.Ctx) error {
	key := c.Params("key")
	def, ok := mailer.TemplateByKey(key)
	if !ok {
		return utils.NotFound(c, "Unknown email template")
	}
	return utils.OK(c, emailTemplatePayload(def, loadTemplateOverride(c, key)), "")
}

type updateEmailTemplateRequest struct {
	Subject    string `json:"subject"`
	BodyHTML   string `json:"body_html"`
	BodyText   string `json:"body_text"`
	DesignJSON string `json:"design_json"`
}

// UpdateEmailTemplate (PUT /super/email-templates/:key) upserts an override.
func UpdateEmailTemplate(c *fiber.Ctx) error {
	key := c.Params("key")
	def, ok := mailer.TemplateByKey(key)
	if !ok {
		return utils.NotFound(c, "Unknown email template")
	}
	var req updateEmailTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var row models.EmailTemplate
	if err := database.DB.WithContext(c.Context()).First(&row, "template_key = ?", key).Error; err != nil {
		row = models.EmailTemplate{TemplateKey: key}
	}
	row.Subject = req.Subject
	row.BodyHTML = req.BodyHTML
	row.BodyText = req.BodyText
	row.DesignJSON = req.DesignJSON
	if err := database.DB.WithContext(c.Context()).Save(&row).Error; err != nil {
		return utils.InternalError(c, "Failed to save template")
	}
	return utils.OK(c, emailTemplatePayload(def, &row), "Template saved")
}

// ResetEmailTemplate (DELETE /super/email-templates/:key) drops the override.
func ResetEmailTemplate(c *fiber.Ctx) error {
	key := c.Params("key")
	def, ok := mailer.TemplateByKey(key)
	if !ok {
		return utils.NotFound(c, "Unknown email template")
	}
	database.DB.WithContext(c.Context()).Where("template_key = ?", key).Delete(&models.EmailTemplate{})
	return utils.OK(c, emailTemplatePayload(def, nil), "Template reset to default")
}

// TestEmailTemplate (POST /super/email-templates/:key/test) sends a sample
// render of the template via the platform SMTP settings.
func TestEmailTemplate(c *fiber.Ctx) error {
	key := c.Params("key")
	def, ok := mailer.TemplateByKey(key)
	if !ok {
		return utils.NotFound(c, "Unknown email template")
	}
	var req testEmailRequest // { to } — shared with the SMTP test handler
	_ = c.BodyParser(&req)

	s := loadPlatformEmailSettings(c)
	if !s.HasSMTP() {
		return utils.BadRequest(c, "Configure platform SMTP before sending a test")
	}
	to := req.To
	if to == "" {
		to = s.FromEmail
	}
	if err := mailer.SendTemplated(
		database.DB.WithContext(c.Context()), mailer.SettingsToConfig(s),
		key, to, "", mailer.SampleVars(def),
	); err != nil {
		return utils.BadRequest(c, "Test failed: "+err.Error())
	}
	return utils.OK(c, fiber.Map{"to": to}, "Test email sent")
}
