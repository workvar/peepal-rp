package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
)

var labSampleTypes = []string{"blood", "urine", "stool", "swab", "other"}

var labTestsSchema = &Schema{
	Resource:    "lab_tests",
	Title:       "Lab Tests",
	Description: "Extend the pathology test-template catalog in bulk — panel, name, unit, and reference range. Rows are skipped (not overwritten) when a test with the same panel + name already exists for your organisation.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "panel", Label: "Panel", Type: FieldString,
			Description: "Order-set grouping (CBC, LFT, KFT, …). Leave blank for a standalone test.",
			Example:     "CBC",
		},
		{
			Name: "name", Label: "Test Name", Type: FieldString, Required: true,
			Description: "Test name, as it appears on the report.",
			Example:     "Haemoglobin",
		},
		{
			Name: "code", Label: "Code", Type: FieldString,
			Description: "Short handle, unique within your organisation. Leave blank to derive one from the name.",
			Example:     "HB",
		},
		{
			Name: "category", Label: "Category", Type: FieldString,
			Description: "Discipline (haematology, biochemistry, microbiology, …).",
			Example:     "haematology",
		},
		{
			Name: "sample_type", Label: "Sample Type", Type: FieldEnum,
			AllowedValues: labSampleTypes,
			Description:   "Specimen required.",
			Example:       "blood",
		},
		{
			Name: "unit", Label: "Unit", Type: FieldString,
			Description: "Result unit.",
			Example:     "g/dL",
		},
		{
			Name: "ref_low", Label: "Ref Low", Type: FieldFloat, SkipIfBlank: true,
			Description: "Lower bound of the normal range (leave both bounds blank for a qualitative test).",
			Example:     "13",
		},
		{
			Name: "ref_high", Label: "Ref High", Type: FieldFloat, SkipIfBlank: true,
			Description: "Upper bound of the normal range.",
			Example:     "17",
		},
		{
			Name: "normal_range_text", Label: "Reference Text", Type: FieldString,
			Description: "Human-readable range shown on the report, e.g. \"13-17 g/dL\".",
			Example:     "13-17 g/dL",
		},
		{
			Name: "method", Label: "Method", Type: FieldString,
			Description: "Assay/technique used (e.g. ELISA, CLIA).",
			Example:     "CLIA",
		},
	},
	Create: createLabTestRow,
}

func createLabTestRow(ctx Ctx, row map[string]string) (string, error) {
	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}
	panel := strings.TrimSpace(row["panel"])

	// Dedupe on (tenant, panel, name) — same convention as the template seed.
	var existing int64
	if err := database.DB.Model(&models.LabTest{}).
		Where("tenant_id = ? AND panel = ? AND name = ?", ctx.TenantID, panel, name).
		Count(&existing).Error; err != nil {
		return "", err
	}
	if existing > 0 {
		return "", errors.New("a test with this panel and name already exists — skipped")
	}

	code := strings.TrimSpace(row["code"])
	if code == "" {
		code = strings.ToUpper(strings.ReplaceAll(name, " ", "_"))
		if len(code) > 20 {
			code = code[:20]
		}
	}
	sample := strings.ToLower(strings.TrimSpace(row["sample_type"]))
	if sample == "" {
		sample = "blood"
	}

	t := models.LabTest{
		ID: uuid.NewString(), TenantID: ctx.TenantID,
		Code: code, Name: name, Category: strings.TrimSpace(row["category"]),
		Panel: panel, Method: strings.TrimSpace(row["method"]),
		SampleType: sample, Unit: strings.TrimSpace(row["unit"]),
		RefLow: ParseFloat(row["ref_low"]), RefHigh: ParseFloat(row["ref_high"]),
		RefText: strings.TrimSpace(row["normal_range_text"]), Active: true,
	}
	if err := database.DB.Create(&t).Error; err != nil {
		return "", errors.New("could not create test — the code may already exist")
	}
	return t.ID, nil
}

func init() { Register(labTestsSchema) }
