package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// Bulk upload for the ambulance fleet (healthcare, Phase 5). Each row defines
// one vehicle. Codes are unique per tenant — duplicates are rejected so a
// re-run does not create copies. Mirrors the CreateAmbulance GraphQL resolver.
var ambulancesSchema = &Schema{
	Resource:    "ambulances",
	Title:       "Ambulances",
	Description: "Add ambulances to the fleet in bulk. Each row is one vehicle. Codes must be unique — duplicates are rejected.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Unique fleet code, for example AMB-01.",
			Example:     "AMB-01",
		},
		{
			Name: "vehicle_type", Label: "Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"basic", "als", "icu", "mortuary"},
			Description:   "Vehicle category. Matches the options on the Add Ambulance form.",
			Example:       "basic",
		},
		{
			Name: "registration", Label: "Registration", Type: FieldString,
			Description: "Optional vehicle registration / number plate.",
			Example:     "MH01AB1234",
		},
		{
			Name: "driver_name", Label: "Driver Name", Type: FieldString,
			Example: "Ramesh Kumar",
		},
		{
			Name: "driver_phone", Label: "Driver Phone", Type: FieldString,
			Example: "+91-9876543210",
		},
		{
			Name: "status", Label: "Status", Type: FieldEnum,
			AllowedValues: []string{"available", "maintenance"},
			Description:   "Optional. Defaults to 'available' when blank.",
			Example:       "available",
		},
	},
	Create: createAmbulanceRow,
}

func createAmbulanceRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}

	code := strings.TrimSpace(row["code"])
	if code == "" {
		return "", errors.New("code is required")
	}

	vtype := strings.ToLower(strings.TrimSpace(row["vehicle_type"]))
	if !ambulanceBulkTypes[vtype] {
		return "", errors.New("vehicle_type must be basic, als, icu, or mortuary")
	}

	// Reject duplicates so re-running an upload does not create copies. Backed
	// by the (tenant_id, code) unique index on Ambulance.
	var existing models.Ambulance
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(code) = LOWER(?)", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("an ambulance with this code already exists: " + code)
	}

	status := strings.ToLower(strings.TrimSpace(row["status"]))
	if status == "" {
		status = models.AmbulanceAvailable
	}
	if status != models.AmbulanceAvailable && status != models.AmbulanceMaintenance {
		return "", errors.New("status must be available or maintenance")
	}

	a := models.Ambulance{
		TenantID:     ctx.TenantID,
		Code:         code,
		Registration: strings.TrimSpace(row["registration"]),
		VehicleType:  vtype,
		DriverName:   strings.TrimSpace(row["driver_name"]),
		DriverPhone:  strings.TrimSpace(row["driver_phone"]),
		Status:       status,
		Active:       true,
	}
	if err := database.DB.Create(&a).Error; err != nil {
		return "", errors.New("could not create ambulance — code may already exist")
	}
	return a.ID, nil
}

var ambulanceBulkTypes = map[string]bool{
	"basic": true, "als": true, "icu": true, "mortuary": true,
}

func init() { Register(ambulancesSchema) }
