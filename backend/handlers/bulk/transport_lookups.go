package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// resolveTransportRouteID maps a "route" cell to a route ID within the tenant.
// Accepts the route UUID or its name (case-insensitive). Mirrors the natural-key
// lookups used by the hostel CSVs (see hostel_lookups.go::isUUID).
func resolveTransportRouteID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("route is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(route_name) = LOWER(?)", value)
	}
	var route models.TransportRoute
	if err := q.First(&route).Error; err != nil {
		return "", errors.New("transport route not found: " + value)
	}
	return route.ID, nil
}

// resolveTransportVehicle finds a vehicle within the tenant from a "vehicle"
// cell. Accepts the vehicle UUID or its vehicle number (case-insensitive).
// Returns the full record so callers can read the route/capacity if needed.
func resolveTransportVehicle(tenantID, value string) (*models.TransportVehicle, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("vehicle is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(vehicle_number) = LOWER(?)", value)
	}
	var vehicle models.TransportVehicle
	if err := q.First(&vehicle).Error; err != nil {
		return nil, errors.New("transport vehicle not found: " + value)
	}
	return &vehicle, nil
}
