package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// Bulk upload for insurance payers / TPAs (healthcare, Phase 4). Each row is one
// payer. Codes are unique per tenant — duplicates are rejected so a re-run does
// not create copies. Mirrors the CreateInsurancePayer GraphQL resolver.
var insurancePayersSchema = &Schema{
	Resource:    "insurance_payers",
	Title:       "Insurance Payers",
	Description: "Add insurers / TPAs in bulk. Each row is one payer. Codes must be unique within your organisation — duplicates are rejected.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Unique payer code, for example STAR-HEALTH.",
			Example:     "STAR-HEALTH",
		},
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Payer / TPA display name.",
			Example:     "Star Health Insurance",
		},
		{
			Name: "payer_type", Label: "Type", Type: FieldEnum,
			AllowedValues: []string{"insurer", "tpa", "government", "corporate"},
			Description:   "Payer category. Defaults to 'insurer' when blank.",
			Example:       "insurer",
		},
		{
			Name: "contact_name", Label: "Contact Name", Type: FieldString,
			Description: "Optional contact person at the payer.",
			Example:     "Priya Nair",
		},
		{
			Name: "phone", Label: "Phone", Type: FieldString,
			Example: "+91-9876543210",
		},
		{
			Name: "email", Label: "Email", Type: FieldEmail,
			Example: "claims@starhealth.example.com",
		},
	},
	Create: createInsurancePayerRow,
}

func createInsurancePayerRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}

	code := strings.TrimSpace(row["code"])
	name := strings.TrimSpace(row["name"])
	if code == "" || name == "" {
		return "", errors.New("code and name are required")
	}

	ptype := strings.ToLower(strings.TrimSpace(row["payer_type"]))
	if ptype == "" {
		ptype = "insurer"
	}
	if !payerBulkTypes[ptype] {
		return "", errors.New("payer_type must be insurer, tpa, government, or corporate")
	}

	// Reject duplicates so re-running an upload does not create copies. Backed
	// by the (tenant_id, code) unique index on InsurancePayer.
	var existing models.InsurancePayer
	if err := database.DB.
		Where("tenant_id = ? AND LOWER(code) = LOWER(?)", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("a payer with this code already exists: " + code)
	}

	p := models.InsurancePayer{
		TenantID:    ctx.TenantID,
		Code:        code,
		Name:        name,
		PayerType:   ptype,
		ContactName: strings.TrimSpace(row["contact_name"]),
		Phone:       strings.TrimSpace(row["phone"]),
		Email:       strings.TrimSpace(row["email"]),
		Active:      true,
	}
	if err := database.DB.Create(&p).Error; err != nil {
		return "", errors.New("could not create payer — code may already exist")
	}
	return p.ID, nil
}

var payerBulkTypes = map[string]bool{
	"insurer": true, "tpa": true, "government": true, "corporate": true,
}

func init() { Register(insurancePayersSchema) }
