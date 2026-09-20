package graph

// Brochure content resolvers. The brochure is a single platform-wide product
// marketing document owned by the super admin, not a per-tenant asset. It lives
// in one row keyed by platformBrochureKey. The read is intentionally lenient
// (returns null instead of erroring) so the public /brochure page always
// renders for anyone, falling back to built-in defaults. Writes are
// super-admin-only.

import (
	"context"
	"time"

	"collegeerp/models"

	"gorm.io/gorm/clause"
)

// platformBrochureKey is the sentinel tenant_id under which the single global
// brochure is stored. Using a fixed key keeps one row for the whole platform
// while reusing the existing BrochureContent table (tenant_id is uniquely
// indexed) with no schema migration.
const platformBrochureKey = "__platform__"

// BrochureContent returns the saved JSON for the single platform brochure, or
// null when nothing has been saved yet. Not tenant-scoped: every caller (and
// the anonymous public page) sees the same document.
func (r *queryResolver) BrochureContent(ctx context.Context) (*string, error) {
	var row models.BrochureContent
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", platformBrochureKey).
		First(&row).Error; err != nil {
		return nil, nil
	}
	content := row.Content
	return &content, nil
}

// UpdateBrochureContent saves (upserts) the single platform brochure JSON.
// Super-admin only; tenant admins cannot edit the product brochure.
func (r *mutationResolver) UpdateBrochureContent(ctx context.Context, content string) (string, error) {
	if _, err := requireSuperAdmin(ctx); err != nil {
		return "", err
	}
	row := models.BrochureContent{
		TenantID: platformBrochureKey,
		Content:  content,
	}
	if err := r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "tenant_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"content":    content,
				"updated_at": time.Now(),
			}),
		}).
		Create(&row).Error; err != nil {
		return "", err
	}
	return content, nil
}
