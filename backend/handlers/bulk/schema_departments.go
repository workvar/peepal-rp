package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

var departmentsSchema = &Schema{
	Resource:    "departments",
	Title:       "Departments",
	Description: "Create organisation departments in bulk. Each row becomes one department. Duplicate names within the same organisation are rejected.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Department Name", Type: FieldString, Required: true,
			Description: "Unique name for the department within the organisation.",
			Example:     "School of Computer Engineering",
		},
		{
			Name: "code", Label: "Department Code", Type: FieldString, Required: false,
			Description: "Short identifier for the department (e.g. an abbreviation). Optional.",
			Example:     "SCE",
		},
	},
	Create: createDepartmentRow,
}

func createDepartmentRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	var existing models.Department
	if err := database.DB.Where("tenant_id = ? AND LOWER(name) = LOWER(?)", ctx.TenantID, name).First(&existing).Error; err == nil {
		return "", errors.New("department already exists: " + name)
	}

	d := models.Department{
		TenantID: ctx.TenantID,
		Name:     name,
		Code:     strings.TrimSpace(row["code"]),
	}
	if err := database.DB.Create(&d).Error; err != nil {
		return "", err
	}
	return d.ID, nil
}

func init() { Register(departmentsSchema) }
