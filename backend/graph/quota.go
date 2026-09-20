package graph

import (
	"fmt"

	"collegeerp/models"

	"gorm.io/gorm"
)

// enforceResourceQuota returns a user-facing error when the tenant has reached
// its subscription limit for the given resource, so a create mutation stops
// before inserting. A nil return means there is room (or no limit applies).
//
// The error is intentionally a plain error (not a sentinel) so the gqlgen error
// presenter forwards the full message to the client instead of masking it.
func enforceResourceQuota(db *gorm.DB, tenantID, resource string) error {
	atLimit, current, limit := models.ResourceAtLimit(db, tenantID, resource)
	if !atLimit {
		return nil
	}

	label := resource
	switch resource {
	case models.QuotaStudents:
		label = "Student"
	case models.QuotaEmployees:
		label = "Employee"
	}
	return fmt.Errorf(
		"%s limit reached: your subscription allows %d and you already have %d. Upgrade your plan to add more.",
		label, limit, current,
	)
}
