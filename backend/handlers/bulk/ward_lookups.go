package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// resolveWardID maps a "ward" cell to a ward ID within the tenant. Accepts the
// ward UUID or its code (case-insensitive) — mirrors resolveHostelBlockID for
// the IPD side. Beds reference their ward by code on the CSV.
func resolveWardID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("ward is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(code) = LOWER(?)", value)
	}
	var ward models.Ward
	if err := q.First(&ward).Error; err != nil {
		return "", errors.New("ward not found: " + value)
	}
	return ward.ID, nil
}
