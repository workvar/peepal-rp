package mailer

import (
	"html"
	"strings"

	"collegeerp/models"

	"gorm.io/gorm"
)

// Rendered is a template after variable substitution, ready to send.
type Rendered struct {
	Subject string
	HTML    string
	Text    string
}

// Render substitutes {{name}} placeholders with values. Values inserted into
// the HTML body are HTML-escaped so a name like "A & B" or any stray markup
// cannot break (or inject into) the email; subject and text get the raw value.
func Render(subject, htmlBody, textBody string, vars map[string]string) Rendered {
	return Rendered{
		Subject: substitute(subject, vars, false),
		HTML:    substitute(htmlBody, vars, true),
		Text:    substitute(textBody, vars, false),
	}
}

func substitute(s string, vars map[string]string, escapeHTML bool) string {
	for k, v := range vars {
		val := v
		if escapeHTML {
			val = html.EscapeString(v)
		}
		s = strings.ReplaceAll(s, "{{"+k+"}}", val)
	}
	return s
}

// ResolveTemplate returns the effective subject/html/text for a key: the stored
// super-admin override where set, otherwise the built-in registry default.
func ResolveTemplate(db *gorm.DB, key string) (subject, htmlBody, textBody string) {
	def, _ := TemplateByKey(key)
	subject, htmlBody, textBody = def.DefaultSubject, def.DefaultHTML, def.DefaultText

	var t models.EmailTemplate
	if err := db.First(&t, "template_key = ?", key).Error; err == nil {
		if strings.TrimSpace(t.Subject) != "" {
			subject = t.Subject
		}
		if strings.TrimSpace(t.BodyHTML) != "" {
			htmlBody = t.BodyHTML
		}
		if strings.TrimSpace(t.BodyText) != "" {
			textBody = t.BodyText
		}
	}
	return subject, htmlBody, textBody
}

// SendTemplated resolves a template by key, renders it with vars, and sends it.
func SendTemplated(db *gorm.DB, cfg SMTPConfig, key, toEmail, toName string, vars map[string]string) error {
	subject, htmlBody, textBody := ResolveTemplate(db, key)
	r := Render(subject, htmlBody, textBody, vars)
	return Send(cfg, toEmail, toName, r.Subject, r.Text, r.HTML)
}
