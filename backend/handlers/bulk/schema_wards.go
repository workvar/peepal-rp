package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var wardsSchema = &Schema{
	Resource:    "wards",
	Title:       "Wards",
	Description: "Create nursing wards in bulk. Each row defines one ward; beds are added separately (see the Beds upload) and reference their ward by code.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short unique ward code within the tenant (for example ICU-1).",
			Example:     "GEN-1",
		},
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Ward name shown in the UI.",
			Example:     "General Ward 1",
		},
		{
			Name: "ward_type", Label: "Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"general", "icu", "hdu", "maternity", "pediatric", "private", "isolation"},
			Description:   "Ward category. Matches the options on the New Ward form.",
			Example:       "general",
		},
		{
			Name: "gender", Label: "Gender", Type: FieldEnum,
			AllowedValues: []string{"any", "male", "female"},
			Description:   "Which patients may occupy this ward's beds. Defaults to any when blank.",
			Example:       "any",
		},
		{
			Name: "floor", Label: "Floor", Type: FieldString,
			Description: "Optional floor label (free text).",
			Example:     "2",
		},
		{
			Name: "active", Label: "Active", Type: FieldBool,
			Description: "Whether the ward is active. Defaults to true when blank.",
			Example:     "true",
		},
	},
	Create: createWardRow,
}

func createWardRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	code := strings.TrimSpace(row["code"])
	name := strings.TrimSpace(row["name"])
	if code == "" || name == "" {
		return "", errors.New("code and name are required")
	}

	wardType := strings.ToLower(strings.TrimSpace(row["ward_type"]))
	switch wardType {
	case "general", "icu", "hdu", "maternity", "pediatric", "private", "isolation":
	default:
		return "", errors.New("invalid ward_type: " + wardType)
	}

	gender := strings.ToLower(strings.TrimSpace(row["gender"]))
	if gender == "" {
		gender = models.WardGenderAny
	}
	switch gender {
	case models.WardGenderAny, models.WardGenderMale, models.WardGenderFemale:
	default:
		return "", errors.New("gender must be any, male, or female")
	}

	active := true
	if v := strings.TrimSpace(row["active"]); v != "" {
		active = ParseBool(v)
	}

	// Reject duplicates so re-running an upload does not create copies.
	var existing models.Ward
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(code) = LOWER(?)", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("a ward with this code already exists: " + code)
	}

	w := models.Ward{
		TenantID: ctx.TenantID,
		Code:     code,
		Name:     name,
		WardType: wardType,
		Gender:   gender,
		Floor:    strings.TrimSpace(row["floor"]),
		Active:   active,
	}
	if err := database.DB.Create(&w).Error; err != nil {
		return "", err
	}
	return w.ID, nil
}

func init() { Register(wardsSchema) }
