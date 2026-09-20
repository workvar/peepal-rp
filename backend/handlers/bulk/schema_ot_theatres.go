package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var otTheatresSchema = &Schema{
	Resource:    "ot_theatres",
	Title:       "Operation Theatres",
	Description: "Create bookable operation theatres in bulk. Each row defines one theatre; surgeries are scheduled into them separately.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short unique theatre code within the tenant (for example OT-1).",
			Example:     "OT-1",
		},
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Theatre name shown in the UI.",
			Example:     "Main Operation Theatre",
		},
		{
			Name: "location", Label: "Location", Type: FieldString,
			Description: "Optional location / floor label (free text).",
			Example:     "Block A, Floor 2",
		},
		{
			Name: "active", Label: "Active", Type: FieldBool,
			Description: "Whether the theatre can be booked. Defaults to true when blank.",
			Example:     "true",
		},
	},
	Create: createOtTheatreRow,
}

func createOtTheatreRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	code := strings.TrimSpace(row["code"])
	name := strings.TrimSpace(row["name"])
	if code == "" || name == "" {
		return "", errors.New("code and name are required")
	}

	active := true
	if v := strings.TrimSpace(row["active"]); v != "" {
		active = ParseBool(v)
	}

	// Reject duplicates so re-running an upload does not create copies.
	var existing models.OperationTheatre
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(code) = LOWER(?)", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("a theatre with this code already exists: " + code)
	}

	t := models.OperationTheatre{
		TenantID: ctx.TenantID,
		Code:     code,
		Name:     name,
		Location: strings.TrimSpace(row["location"]),
		Active:   active,
	}
	if err := database.DB.Create(&t).Error; err != nil {
		return "", err
	}
	return t.ID, nil
}

func init() { Register(otTheatresSchema) }
