package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BrochureContent stores the editable marketing brochure as a JSON document.
// The brochure is a single platform-wide product document owned by the super
// admin, stored in one row keyed by a sentinel tenant_id (see
// platformBrochureKey in graph/brochure.resolvers.go). The tenant_id column and
// its unique index are retained so no schema migration is needed. The frontend
// renders the /brochure page and the downloadable PDF from this payload.
// Keeping it as a JSON blob means new brochure fields never need a migration.
type BrochureContent struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;uniqueIndex" json:"tenant_id"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *BrochureContent) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
