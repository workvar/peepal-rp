package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

// Fee add-ons are optional facility charges (Transport, Hostel, Mess…)
// attached to individual students on top of their base course fee.
// One row = one add-on definition.
var feeAddOnsSchema = &Schema{
	Resource: "fee_addons",
	Title:    "Fee Add-ons",
	Description: "Define fee add-ons in bulk. Each row is one optional facility charge that staff can attach " +
		"to individual students per course year (e.g. Transport, Hostel, Mess). " +
		"The fee category must already exist - identify it by code or name.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Add-on name.",
			Example:     "College Bus",
		},
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short unique code, stored uppercase.",
			Example:     "ADDON-BUS",
		},
		{
			Name: "kind", Label: "Kind", Type: FieldEnum,
			AllowedValues: []string{"other", "transport", "hostel"},
			Description:   "transport/hostel auto-attach when a student is allocated a bus/room. Defaults to other.",
			Example:       "transport",
		},
		{
			Name: "category", Label: "Fee Category", Type: FieldString, Required: true,
			Description: "Fee category code or name to bill under.",
			Example:     "TRANSPORT",
		},
		{
			Name: "amount_per_year", Label: "Amount / Year", Type: FieldFloat, Required: true,
			Description: "Charge per course year. For hostel, room pricing overrides this on auto-attach.",
			Example:     "8000",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional note.",
			Example:     "AC bus service, all routes",
		},
	},
	ExampleRows: [][]string{
		{"College Transport", "ADDON-TRANSPORT", "transport", "TRANSPORT", "8000", "AC bus service, all routes"},
		{"Hostel Accommodation", "ADDON-HOSTEL", "hostel", "HOSTEL", "35000", "Shared room incl. utilities"},
	},
	Create: createFeeAddOnRow,
}

func createFeeAddOnRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	code := strings.ToUpper(strings.TrimSpace(row["code"]))
	if name == "" || code == "" {
		return "", errors.New("name and code are required")
	}

	var existing models.FeeAddOn
	if err := database.DB.
		Where("tenant_id = ? AND code = ?", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("an add-on with code " + code + " already exists")
	}

	cat, err := resolveFeeCategory(ctx.TenantID, row["category"])
	if err != nil {
		return "", err
	}

	amount := ParseFloat(row["amount_per_year"])
	if amount <= 0 {
		return "", errors.New("amount_per_year must be greater than 0")
	}

	kind := strings.ToLower(strings.TrimSpace(row["kind"]))
	switch kind {
	case "", models.FeeAddOnOther:
		kind = models.FeeAddOnOther
	case models.FeeAddOnTransport, models.FeeAddOnHostel:
		// ok
	default:
		return "", errors.New("kind must be other, transport, or hostel")
	}

	addOn := models.FeeAddOn{
		TenantID:      ctx.TenantID,
		Name:          name,
		Code:          code,
		Kind:          kind,
		FeeCategoryID: cat.ID,
		AmountPerYear: amount,
		Description:   strings.TrimSpace(row["description"]),
		IsActive:      true,
	}
	if err := database.DB.Create(&addOn).Error; err != nil {
		return "", err
	}
	return addOn.ID, nil
}

func init() { Register(feeAddOnsSchema) }
