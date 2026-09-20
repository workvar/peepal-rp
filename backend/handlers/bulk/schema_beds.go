package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var bedsSchema = &Schema{
	Resource:    "beds",
	Title:       "Beds",
	Description: "Create beds in bulk. Each row defines one bed inside an existing ward. Reference the ward by its code (for example GEN-1) or its ID.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "ward", Label: "Ward", Type: FieldString, Required: true,
			Description: "Code (for example GEN-1) or ID of the ward this bed belongs to. The ward must already exist.",
			Example:     "GEN-1",
		},
		{
			Name: "bed_number", Label: "Bed Number", Type: FieldString, Required: true,
			Description: "Bed number, unique within its ward.",
			Example:     "B-01",
		},
		{
			Name: "bay", Label: "Bay", Type: FieldString,
			Description: "Optional grouping label used to section a ward (the hostel room counterpart).",
			Example:     "Bay A",
		},
		{
			Name: "status", Label: "Status", Type: FieldEnum,
			AllowedValues: []string{"available", "maintenance"},
			Description:   "Bed status. Defaults to available. Occupied is set automatically when a patient is admitted, so it cannot be uploaded.",
			Example:       "available",
		},
		{
			Name: "daily_charge", Label: "Daily Charge", Type: FieldFloat,
			Description: "Per-day bed charge. Defaults to 0 when blank.",
			Min:         floatPtr(0),
			Example:     "1500",
		},
	},
	Create: createBedRow,
}

func createBedRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	wardID, err := resolveWardID(ctx.TenantID, row["ward"])
	if err != nil {
		return "", err
	}

	number := strings.TrimSpace(row["bed_number"])
	if number == "" {
		return "", errors.New("bed_number is required")
	}

	status := strings.ToLower(strings.TrimSpace(row["status"]))
	if status == "" {
		status = models.BedAvailable
	}
	if status != models.BedAvailable && status != models.BedMaintenance {
		return "", errors.New("status must be available or maintenance")
	}

	// Reject duplicates so re-running an upload does not create copies.
	var existing models.Bed
	if err := database.DB.
		Where("tenant_id = ? AND ward_id = ? AND bed_number = ?", ctx.TenantID, wardID, number).
		First(&existing).Error; err == nil {
		return "", errors.New("a bed with this number already exists in the ward: " + number)
	}

	b := models.Bed{
		TenantID:    ctx.TenantID,
		WardID:      wardID,
		BedNumber:   number,
		Bay:         strings.TrimSpace(row["bay"]),
		Status:      status,
		DailyCharge: ParseFloat(row["daily_charge"]),
	}
	if err := database.DB.Create(&b).Error; err != nil {
		return "", err
	}
	return b.ID, nil
}

func init() { Register(bedsSchema) }
