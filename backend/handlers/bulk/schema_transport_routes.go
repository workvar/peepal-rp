package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var transportRoutesSchema = &Schema{
	Resource:    "transport_routes",
	Title:       "Transport Routes",
	Description: "Create transport routes in bulk. Each row defines one route with its start and end points. Route names must be unique — rows that reuse an existing name are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "route_name", Label: "Route Name", Type: FieldString, Required: true,
			Description: "Unique name for the route, for example Route A.",
			Example:     "Route A",
		},
		{
			Name: "start_point", Label: "Start Point", Type: FieldString, Required: true,
			Description: "Where the route begins.",
			Example:     "Main Gate",
		},
		{
			Name: "end_point", Label: "End Point", Type: FieldString, Required: true,
			Description: "Where the route ends.",
			Example:     "City Center",
		},
		{
			Name: "stops", Label: "Stops", Type: FieldString,
			Description: "Optional. Comma-separated list of stop names along the route.",
			Example:     "Park Road, Station, Market",
		},
		{
			Name: "distance", Label: "Distance (km)", Type: FieldFloat,
			Description: "Optional. Total route distance in kilometres.",
			Min:         floatPtr(0),
			Example:     "12.5",
		},
	},
	Create: createTransportRouteRow,
}

func createTransportRouteRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	routeName := strings.TrimSpace(row["route_name"])
	if routeName == "" {
		return "", errors.New("route_name is required")
	}

	// Reject duplicates so re-running an upload does not create copies. Backed
	// by the (tenant_id, route_name) unique index on TransportRoute.
	var existing models.TransportRoute
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(route_name) = LOWER(?)", ctx.TenantID, routeName).
		First(&existing).Error; err == nil {
		return "", errors.New("a route with this name already exists: " + routeName)
	}

	rt := models.TransportRoute{
		TenantID:   ctx.TenantID,
		RouteName:  routeName,
		StartPoint: strings.TrimSpace(row["start_point"]),
		EndPoint:   strings.TrimSpace(row["end_point"]),
		Stops:      strings.TrimSpace(row["stops"]),
		Distance:   ParseFloat(row["distance"]),
	}
	if err := database.DB.Create(&rt).Error; err != nil {
		return "", errors.New("could not create route — name may already exist")
	}
	return rt.ID, nil
}

func init() { Register(transportRoutesSchema) }
