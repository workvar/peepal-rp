package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

// Fee categories are the master fee codes (TUITION, TRANSPORT, FOOD…) every
// structure line item points at. One row = one category.
var feeCategoriesSchema = &Schema{
	Resource:    "fee_categories",
	Title:       "Fee Categories",
	Description: "Create master fee codes in bulk (e.g. Tuition, Transport, Hostel, Food). Each row is one category. Codes are stored uppercase and must be unique within the institution.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Human-readable category name.",
			Example:     "Tuition Fee",
		},
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short unique code, stored uppercase.",
			Example:     "TUITION",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional note describing the category.",
			Example:     "Core academic tuition fee",
		},
	},
	ExampleRows: [][]string{
		{"Tuition Fee", "TUITION", "Core academic tuition fee"},
		{"Transport Fee", "TRANSPORT", "Optional bus service"},
		{"Hostel Fee", "HOSTEL", "Boarding and lodging"},
	},
	Create: createFeeCategoryRow,
}

func createFeeCategoryRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	code := strings.ToUpper(strings.TrimSpace(row["code"]))
	if name == "" || code == "" {
		return "", errors.New("name and code are required")
	}

	var existing models.FeeCategory
	if err := database.DB.
		Where("tenant_id = ? AND code = ?", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("a category with code " + code + " already exists")
	}

	cat := models.FeeCategory{
		TenantID:    ctx.TenantID,
		Name:        name,
		Code:        code,
		Description: strings.TrimSpace(row["description"]),
		IsActive:    true,
	}
	if err := database.DB.Create(&cat).Error; err != nil {
		return "", err
	}
	return cat.ID, nil
}

func init() { Register(feeCategoriesSchema) }
