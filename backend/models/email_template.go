package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EmailTemplate is a super-admin-authored override for one type of system
// email (keyed by TemplateKey, e.g. "invite", "welcome"). It is platform-global
// — there is at most one row per key. When no row exists, or a field is blank,
// the built-in default from the mailer template registry is used. Bodies use
// {{variable}} placeholders rendered at send time.
type EmailTemplate struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TemplateKey string `gorm:"uniqueIndex;not null" json:"template_key"`
	Subject     string `json:"subject"`
	BodyHTML    string `gorm:"type:text" json:"body_html"`
	BodyText    string `gorm:"type:text" json:"body_text"`
	// DesignJSON is the opaque block structure authored in the visual builder,
	// stored so the design can be re-opened and edited. The server never parses
	// it — BodyHTML (compiled from it) is what actually gets sent. Empty when
	// the template was authored as raw HTML.
	DesignJSON string    `gorm:"type:text" json:"design_json"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (t *EmailTemplate) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
