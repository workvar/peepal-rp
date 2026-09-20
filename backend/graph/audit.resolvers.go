package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// Resolver for the compliance / audit access trail — Phase 5. Admin-only view
// of the append-only log.

func (r *queryResolver) AuditLogs(ctx context.Context, action *string, module *string, actorID *string, limit *int) ([]*model.AuditLog, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if action != nil && *action != "" {
		q = q.Where("action = ?", *action)
	}
	if module != nil && *module != "" {
		q = q.Where("module = ?", *module)
	}
	if actorID != nil && *actorID != "" {
		q = q.Where("actor_id = ?", *actorID)
	}
	max := 200
	if limit != nil && *limit > 0 && *limit <= 1000 {
		max = *limit
	}
	var rows []models.AuditLog
	if err := q.Order("created_at DESC").Limit(max).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AuditLog, len(rows))
	for i, a := range rows {
		out[i] = &model.AuditLog{
			ID: a.ID, ActorID: toStrPtr(a.ActorID), ActorName: toStrPtr(a.ActorName),
			ActorRole: toStrPtr(a.ActorRole), Action: a.Action, Module: toStrPtr(a.Module),
			Operation: toStrPtr(a.Operation), EntityID: toStrPtr(a.EntityID),
			Detail: toStrPtr(a.Detail), IP: toStrPtr(a.IP),
			CreatedAt: a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}
	return out, nil
}
