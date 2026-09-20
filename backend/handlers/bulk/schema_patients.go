package bulk

import (
	"errors"
	"fmt"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var patientsSchema = &Schema{
	Resource:    "patients",
	Title:       "Patients",
	Description: "Register patients in bulk — demographics, contacts, and clinical flags. Leave mrn blank to auto-generate a Medical Record Number; when supplied it must be unique within your organisation.",
	RequireRole: []string{"admin", "staff", "teacher"},
	Fields: []Field{
		{
			Name: "first_name", Label: "First Name", Type: FieldString, Required: true,
			Description: "Patient's first name.",
			Example:     "Asha",
		},
		{
			Name: "last_name", Label: "Last Name", Type: FieldString,
			Description: "Patient's last name.",
			Example:     "Verma",
		},
		{
			Name: "mrn", Label: "MRN", Type: FieldString,
			Description: "Medical Record Number. Leave blank to auto-generate (MRN-00001, …).",
			Example:     "",
		},
		{
			Name: "gender", Label: "Gender", Type: FieldEnum,
			AllowedValues: []string{"male", "female", "other"},
			Description:   "Patient's gender.",
			Example:       "female",
		},
		{
			Name: "date_of_birth", Label: "Date of Birth", Type: FieldDate,
			Description: "Date of birth (YYYY-MM-DD).",
			Example:     "1990-04-18",
		},
		{
			Name: "blood_group", Label: "Blood Group", Type: FieldEnum,
			AllowedValues: []string{"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"},
			Description:   "Blood group.",
			Example:       "O+",
		},
		{
			Name: "phone", Label: "Phone", Type: FieldString,
			Description: "Contact phone number.",
			Example:     "9876543210",
		},
		{
			Name: "email", Label: "Email", Type: FieldEmail,
			Description: "Contact email address.",
			Example:     "asha.verma@example.com",
		},
		{
			Name: "address", Label: "Address", Type: FieldString,
			Description: "Street address.",
			Example:     "12 MG Road",
		},
		{
			Name: "city", Label: "City", Type: FieldString,
			Description: "City.",
			Example:     "Pune",
		},
		{
			Name: "emergency_name", Label: "Emergency Contact Name", Type: FieldString,
			Description: "Who to call in an emergency.",
			Example:     "Rohit Verma",
		},
		{
			Name: "emergency_phone", Label: "Emergency Contact Phone", Type: FieldString,
			Description: "Emergency contact's phone number.",
			Example:     "9812345678",
		},
		{
			Name: "allergies", Label: "Allergies", Type: FieldString,
			Description: "Known allergies — surfaced on every visit for safety.",
			Example:     "Penicillin",
		},
		{
			Name: "chronic_conditions", Label: "Chronic Conditions", Type: FieldString,
			Description: "Long-running conditions (diabetes, hypertension, …).",
			Example:     "Diabetes",
		},
	},
	Create: createPatientRow,
}

func createPatientRow(ctx Ctx, row map[string]string) (string, error) {
	first := strings.TrimSpace(row["first_name"])
	if first == "" {
		return "", errors.New("first_name is required")
	}

	mrn := strings.TrimSpace(row["mrn"])
	if mrn == "" {
		var err error
		mrn, err = nextBulkMRN(ctx.TenantID)
		if err != nil {
			return "", err
		}
	}
	uhid, err := nextBulkUHID(ctx.TenantID)
	if err != nil {
		return "", err
	}

	p := models.Patient{
		TenantID:          ctx.TenantID,
		MRN:               mrn,
		UHID:              uhid,
		FirstName:         first,
		LastName:          strings.TrimSpace(row["last_name"]),
		Gender:            strings.ToLower(strings.TrimSpace(row["gender"])),
		DateOfBirth:       strings.TrimSpace(row["date_of_birth"]),
		BloodGroup:        strings.TrimSpace(row["blood_group"]),
		Phone:             strings.TrimSpace(row["phone"]),
		Email:             strings.TrimSpace(row["email"]),
		Address:           strings.TrimSpace(row["address"]),
		City:              strings.TrimSpace(row["city"]),
		EmergencyName:     strings.TrimSpace(row["emergency_name"]),
		EmergencyPhone:    strings.TrimSpace(row["emergency_phone"]),
		Allergies:         strings.TrimSpace(row["allergies"]),
		ChronicConditions: strings.TrimSpace(row["chronic_conditions"]),
		Status:            "active",
	}
	if err := database.DB.Create(&p).Error; err != nil {
		return "", errors.New("could not create patient — the MRN may already exist")
	}
	return p.ID, nil
}

// nextBulkMRN mirrors the resolver's MRN generator (graph package) without
// importing it — handlers/bulk must stay independent of graph.
func nextBulkMRN(tenantID string) (string, error) {
	var n int64
	if err := database.DB.Model(&models.Patient{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("MRN-%05d", n+1+int64(i))
		var exists int64
		if err := database.DB.Model(&models.Patient{}).
			Where("tenant_id = ? AND mrn = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique MRN")
}

// nextBulkUHID mirrors the resolver's UHID generator (graph package) without
// importing it — handlers/bulk must stay independent of graph.
func nextBulkUHID(tenantID string) (string, error) {
	var n int64
	if err := database.DB.Model(&models.Patient{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("UH-%06d", n+1+int64(i))
		var exists int64
		if err := database.DB.Model(&models.Patient{}).
			Where("tenant_id = ? AND uhid = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique UHID")
}

func init() { Register(patientsSchema) }
