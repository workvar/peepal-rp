package graph

// OPD slip configurator resolvers (healthcare industry). The slip design is a
// per-tenant JSON blob rendered by the frontend for on-screen preview and for
// the printable slip the patient carries to the doctor. Reads are open to any
// authenticated user of the tenant (front desk prints slips); writes are
// admin-only.

import (
	"context"
	"time"

	"collegeerp/models"

	"gorm.io/gorm/clause"
)

// OpdSlipConfig returns the tenant's saved slip design JSON, or null when the
// admin has not customised it yet (the frontend then uses its defaults).
func (r *queryResolver) OpdSlipConfig(ctx context.Context) (*string, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var row models.OPDSlipConfig
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", auth.TenantID).
		First(&row).Error; err != nil {
		return nil, nil
	}
	content := row.Content
	return &content, nil
}

// UpdateOpdSlipConfig upserts the tenant's slip design JSON. Admin only.
func (r *mutationResolver) UpdateOpdSlipConfig(ctx context.Context, content string) (string, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return "", err
	}
	row := models.OPDSlipConfig{
		TenantID: auth.TenantID,
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
