package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var roomClassesSchema = &Schema{
	Resource:    "room_classes",
	Title:       "Room Classes",
	Description: "Create hostel room classes (reusable pricing templates) in bulk. Each row defines one class with a name and a rate; rooms can then be linked to a class to inherit its rate.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Class Name", Type: FieldString, Required: true,
			Description: "Unique name for the class, for example 3-Sharing AC.",
			Example:     "3-Sharing AC",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional description of the class.",
			Example:     "Air-conditioned, three beds",
		},
		{
			Name: "rate_type", Label: "Rate Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"monthly", "semester", "annual"},
			Description:   "How the rate amount is expressed. Annual amounts are split across the current academic year's semesters at read time.",
			Example:       "semester",
		},
		{
			Name: "rate_amount", Label: "Rate Amount", Type: FieldFloat, Required: true,
			Description: "The rate amount, in the unit named by rate_type.",
			Min:         floatPtr(0),
			Example:     "45000",
		},
	},
	Create: createRoomClassRow,
}

func createRoomClassRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	rateType := strings.ToLower(strings.TrimSpace(row["rate_type"]))
	switch rateType {
	case "monthly", "semester", "annual":
	default:
		return "", errors.New("rate_type must be monthly, semester, or annual")
	}

	// Reject duplicate class names within the tenant.
	var existing models.RoomClass
	if err := database.DB.Where("tenant_id = ? AND LOWER(name) = LOWER(?)", ctx.TenantID, name).First(&existing).Error; err == nil {
		return "", errors.New("a class with this name already exists: " + name)
	}

	rc := models.RoomClass{
		TenantID:    ctx.TenantID,
		Name:        name,
		Description: strings.TrimSpace(row["description"]),
		RateType:    rateType,
		RateAmount:  ParseFloat(row["rate_amount"]),
	}
	if err := database.DB.Create(&rc).Error; err != nil {
		return "", err
	}
	return rc.ID, nil
}

func init() { Register(roomClassesSchema) }
