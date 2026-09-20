package audit

// Shared audit writer. Lets REST handlers and the bulk-upload framework append
// to the same audit trail the GraphQL field middleware writes to. Kept in its
// own package (imports only database + models) so any handler can use it without
// creating an import cycle back into graph.

import (
	"collegeerp/database"
	"collegeerp/models"

	"gorm.io/gorm"
)

// OpBulkUpload is the Operation value used for every bulk-upload entry, so the
// audit trail can flag these rows "specifically as bulk upload".
const OpBulkUpload = "bulk_upload"

// Entry is the minimal set of fields a caller must supply. ActorName is filled
// in automatically from ActorID when left blank.
type Entry struct {
	TenantID  string
	ActorID   string
	ActorName string
	ActorRole string
	Action    string // create | update | delete (see models.Audit* constants)
	Module    string
	Operation string
	EntityID  string
	Detail    string
	IP        string
}

// Record appends one audit entry. Best-effort: a failure never affects the
// caller's request.
func Record(e Entry) {
	if e.ActorID == "" {
		return
	}
	if e.ActorName == "" {
		e.ActorName = actorName(database.DB, e.ActorID)
	}
	_ = database.DB.Create(&models.AuditLog{
		TenantID:  e.TenantID,
		ActorID:   e.ActorID,
		ActorName: e.ActorName,
		ActorRole: e.ActorRole,
		Action:    e.Action,
		Module:    e.Module,
		Operation: e.Operation,
		EntityID:  e.EntityID,
		Detail:    e.Detail,
		IP:        e.IP,
	}).Error
}

// actorName looks up a user's display name for the trail.
func actorName(db *gorm.DB, userID string) string {
	var u models.User
	if err := db.Select("name").First(&u, "id = ?", userID).Error; err != nil {
		return ""
	}
	return u.Name
}
