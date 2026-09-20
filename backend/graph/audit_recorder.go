package graph

// Audit recorder — Phase 5. Every successful root mutation is written to the
// audit trail from the field middleware (see accessFieldMiddleware), and the
// auth handler records login events via RecordLoginAudit.

import (
	"context"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/99designs/gqlgen/graphql"
	"gorm.io/gorm"
)

// actionForOperation maps a mutation field to an audit action + module. It
// prefers the access registry (opAccess); otherwise it guesses from the name.
func actionForOperation(field string) (action, module string) {
	if spec, ok := opAccess[field]; ok {
		module = spec.Module
		switch spec.Action {
		case models.ActionCreate:
			return models.AuditCreate, module
		case models.ActionDelete:
			return models.AuditDelete, module
		default:
			return models.AuditUpdate, module
		}
	}
	lower := strings.ToLower(field)
	switch {
	case strings.HasPrefix(lower, "create") || strings.HasPrefix(lower, "add") || strings.HasPrefix(lower, "schedule") || strings.HasPrefix(lower, "dispatch"):
		return models.AuditCreate, ""
	case strings.HasPrefix(lower, "delete") || strings.HasPrefix(lower, "remove"):
		return models.AuditDelete, ""
	default:
		return models.AuditUpdate, ""
	}
}

// recordMutationAudit logs one successful root mutation. Best-effort: audit
// failures never affect the request.
func recordMutationAudit(ctx context.Context, fc *graphql.FieldContext) {
	if fc.Field.Name == "_placeholder" {
		return
	}
	auth := AuthFromCtx(ctx)
	if auth.UserID == "" {
		return
	}
	action, module := actionForOperation(fc.Field.Name)

	// Most mutations name their subject "id". The ones that act on a person or
	// a session rather than a row of their own module name it differently, and
	// an audit entry with no subject is close to useless, so those are read too.
	entityID := ""
	if fc.Args != nil {
		for _, key := range []string{"id", "userId", "sessionId"} {
			if v, ok := fc.Args[key].(string); ok && v != "" {
				entityID = v
				break
			}
		}
	}

	log := models.AuditLog{
		TenantID:  auth.TenantID,
		ActorID:   auth.UserID,
		ActorName: actorName(database.DB, auth.UserID),
		ActorRole: auth.Role,
		Action:    action,
		Module:    module,
		Operation: fc.Field.Name,
		EntityID:  entityID,
	}
	_ = database.DB.Create(&log).Error
}

// actorName looks up a user's display name for the trail (cheap, cached-free).
func actorName(db *gorm.DB, userID string) string {
	var u models.User
	if err := db.Select("name").First(&u, "id = ?", userID).Error; err != nil {
		return ""
	}
	return u.Name
}

// RecordLoginAudit is called by the auth handler on a successful login. It lives
// here so the audit-writing logic stays in one place.
func RecordLoginAudit(db *gorm.DB, tenantID, userID, userName, role, ip string) {
	_ = db.Create(&models.AuditLog{
		TenantID: tenantID, ActorID: userID, ActorName: userName, ActorRole: role,
		Action: models.AuditLogin, Module: "auth", Operation: "login", IP: ip,
	}).Error
}
