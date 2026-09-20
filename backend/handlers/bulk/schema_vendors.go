package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var vendorsSchema = &Schema{
	Resource:    "vendors",
	Title:       "Vendors",
	Description: "Create suppliers in bulk. Each row becomes one vendor. Duplicate names within the same organisation are rejected.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "name", Label: "Vendor Name", Type: FieldString, Required: true,
			Description: "Supplier name. Must be unique within the organisation.",
			Example:     "MediSupply Co.",
		},
		{
			Name: "code", Label: "Supplier Code", Type: FieldString,
			Description: "Optional internal supplier code.",
			Example:     "SUP-001",
		},
		{
			Name: "gstin", Label: "GSTIN", Type: FieldString,
			Description: "Optional tax identification number.",
			Example:     "29ABCDE1234F1Z5",
		},
		{
			Name: "contact_name", Label: "Contact Person", Type: FieldString,
			Description: "Optional primary contact name.",
			Example:     "Priya Sharma",
		},
		{
			Name: "phone", Label: "Phone", Type: FieldString,
			Description: "Optional contact phone number.",
			Example:     "9876543210",
		},
		{
			Name: "email", Label: "Email", Type: FieldEmail,
			Description: "Optional contact email address.",
			Example:     "sales@medisupply.example",
		},
		{
			Name: "payment_terms", Label: "Payment Terms", Type: FieldString,
			Description: "Optional payment terms, e.g. Net 30.",
			Example:     "Net 30",
		},
	},
	Create: createVendorRow,
}

func createVendorRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}
	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}
	// Dedupe on (tenant, name).
	var existing int64
	if err := database.DB.Model(&models.Vendor{}).
		Where("tenant_id = ? AND LOWER(name) = LOWER(?)", ctx.TenantID, name).
		Count(&existing).Error; err != nil {
		return "", err
	}
	if existing > 0 {
		return "", errors.New("a vendor with this name already exists")
	}
	v := models.Vendor{
		ID: uuid.NewString(), TenantID: ctx.TenantID, Name: name,
		Code: strings.TrimSpace(row["code"]), GSTIN: strings.TrimSpace(row["gstin"]),
		ContactName: strings.TrimSpace(row["contact_name"]), Phone: strings.TrimSpace(row["phone"]),
		Email: strings.TrimSpace(row["email"]), PaymentTerms: strings.TrimSpace(row["payment_terms"]),
		Active: true,
	}
	if err := database.DB.Create(&v).Error; err != nil {
		return "", err
	}
	return v.ID, nil
}

func init() { Register(vendorsSchema) }
