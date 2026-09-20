package database

import (
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Pathology test-template library (Phase 4).
//
// A curated starter set of standard test templates, seeded into the existing
// LabTest catalog so a lab doesn't start from a blank list. Additive
// (insert-if-missing by tenant + panel + name) and re-runnable — an admin's
// edits or deletions are never overwritten. Kept as a small in-repo table
// (not a full NABL catalog) so it stays reviewable; labs extend it further via
// the lab_tests bulk upload (handlers/bulk/schema_lab_tests.go).

// labTemplate is one seeded catalog row.
type labTemplate struct {
	Panel, Code, Name, Category, SampleType, Unit, RefText, Method string
	RefLow, RefHigh                                                float64
}

// DefaultLabTestTemplates groups the common panels every lab starts with:
// CBC, LFT, KFT, Lipid Profile, and Thyroid — standard adult reference ranges.
var DefaultLabTestTemplates = []labTemplate{
	// ── CBC (Complete Blood Count) — haematology ──────────────────────
	{Panel: "CBC", Code: "HB", Name: "Haemoglobin", Category: "haematology", SampleType: "blood", Unit: "g/dL", RefLow: 13, RefHigh: 17, RefText: "13-17 g/dL"},
	{Panel: "CBC", Code: "WBC", Name: "Total WBC Count", Category: "haematology", SampleType: "blood", Unit: "cells/cumm", RefLow: 4000, RefHigh: 11000, RefText: "4,000-11,000 cells/cumm"},
	{Panel: "CBC", Code: "PLT", Name: "Platelet Count", Category: "haematology", SampleType: "blood", Unit: "lakh/cumm", RefLow: 1.5, RefHigh: 4.5, RefText: "1.5-4.5 lakh/cumm"},
	{Panel: "CBC", Code: "RBC", Name: "RBC Count", Category: "haematology", SampleType: "blood", Unit: "million/cumm", RefLow: 4.5, RefHigh: 5.9, RefText: "4.5-5.9 million/cumm"},
	{Panel: "CBC", Code: "HCT", Name: "Haematocrit (PCV)", Category: "haematology", SampleType: "blood", Unit: "%", RefLow: 40, RefHigh: 50, RefText: "40-50%"},

	// ── LFT (Liver Function Test) — biochemistry ──────────────────────
	{Panel: "LFT", Code: "SGOT", Name: "AST (SGOT)", Category: "biochemistry", SampleType: "blood", Unit: "U/L", RefLow: 5, RefHigh: 40, RefText: "5-40 U/L"},
	{Panel: "LFT", Code: "SGPT", Name: "ALT (SGPT)", Category: "biochemistry", SampleType: "blood", Unit: "U/L", RefLow: 7, RefHigh: 56, RefText: "7-56 U/L"},
	{Panel: "LFT", Code: "TBIL", Name: "Total Bilirubin", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 0.1, RefHigh: 1.2, RefText: "0.1-1.2 mg/dL"},
	{Panel: "LFT", Code: "ALP", Name: "Alkaline Phosphatase", Category: "biochemistry", SampleType: "blood", Unit: "U/L", RefLow: 44, RefHigh: 147, RefText: "44-147 U/L"},
	{Panel: "LFT", Code: "TPROT", Name: "Total Protein", Category: "biochemistry", SampleType: "blood", Unit: "g/dL", RefLow: 6.0, RefHigh: 8.3, RefText: "6.0-8.3 g/dL"},
	{Panel: "LFT", Code: "ALB", Name: "Albumin", Category: "biochemistry", SampleType: "blood", Unit: "g/dL", RefLow: 3.5, RefHigh: 5.0, RefText: "3.5-5.0 g/dL"},

	// ── KFT (Kidney Function Test) — biochemistry ─────────────────────
	{Panel: "KFT", Code: "UREA", Name: "Blood Urea", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 15, RefHigh: 40, RefText: "15-40 mg/dL"},
	{Panel: "KFT", Code: "CREAT", Name: "Serum Creatinine", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 0.6, RefHigh: 1.3, RefText: "0.6-1.3 mg/dL"},
	{Panel: "KFT", Code: "URICA", Name: "Uric Acid", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 3.5, RefHigh: 7.2, RefText: "3.5-7.2 mg/dL"},
	{Panel: "KFT", Code: "NA", Name: "Sodium", Category: "biochemistry", SampleType: "blood", Unit: "mEq/L", RefLow: 135, RefHigh: 145, RefText: "135-145 mEq/L"},
	{Panel: "KFT", Code: "K", Name: "Potassium", Category: "biochemistry", SampleType: "blood", Unit: "mEq/L", RefLow: 3.5, RefHigh: 5.1, RefText: "3.5-5.1 mEq/L"},

	// ── Lipid Profile — biochemistry ──────────────────────────────────
	{Panel: "Lipid Profile", Code: "TCHOL", Name: "Total Cholesterol", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 0, RefHigh: 200, RefText: "<200 mg/dL"},
	{Panel: "Lipid Profile", Code: "TRIG", Name: "Triglycerides", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 0, RefHigh: 150, RefText: "<150 mg/dL"},
	{Panel: "Lipid Profile", Code: "HDL", Name: "HDL Cholesterol", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 40, RefHigh: 60, RefText: "40-60 mg/dL"},
	{Panel: "Lipid Profile", Code: "LDL", Name: "LDL Cholesterol", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 0, RefHigh: 100, RefText: "<100 mg/dL"},
	{Panel: "Lipid Profile", Code: "VLDL", Name: "VLDL Cholesterol", Category: "biochemistry", SampleType: "blood", Unit: "mg/dL", RefLow: 5, RefHigh: 40, RefText: "5-40 mg/dL"},

	// ── Thyroid Profile — biochemistry (immunoassay) ──────────────────
	{Panel: "Thyroid", Code: "TSH", Name: "TSH", Category: "biochemistry", SampleType: "blood", Unit: "µIU/mL", RefLow: 0.4, RefHigh: 4.0, RefText: "0.4-4.0 µIU/mL", Method: "CLIA"},
	{Panel: "Thyroid", Code: "T3", Name: "Total T3", Category: "biochemistry", SampleType: "blood", Unit: "ng/dL", RefLow: 80, RefHigh: 200, RefText: "80-200 ng/dL", Method: "CLIA"},
	{Panel: "Thyroid", Code: "T4", Name: "Total T4", Category: "biochemistry", SampleType: "blood", Unit: "µg/dL", RefLow: 5.0, RefHigh: 12.0, RefText: "5.0-12.0 µg/dL", Method: "CLIA"},
}

// EnsureLabTestTemplates inserts any of the default templates a tenant is
// still missing (matched by tenant + panel + name, since two panels may share
// a test name in principle). Called lazily the first time the lab catalog is
// read (mirrors EnsureTenantAccounts), so no tenant-type migration hook is
// needed — any tenant that opens the Laboratory page gets the starter set.
func EnsureLabTestTemplates(tx *gorm.DB, tenantID string) error {
	if tenantID == "" {
		return nil
	}
	for _, tpl := range DefaultLabTestTemplates {
		var count int64
		if err := tx.Model(&models.LabTest{}).
			Where("tenant_id = ? AND panel = ? AND name = ?", tenantID, tpl.Panel, tpl.Name).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		row := models.LabTest{
			ID: uuid.NewString(), TenantID: tenantID,
			Code: tpl.Code, Name: tpl.Name, Category: tpl.Category, Panel: tpl.Panel,
			Method: tpl.Method, SampleType: tpl.SampleType, Unit: tpl.Unit,
			RefLow: tpl.RefLow, RefHigh: tpl.RefHigh, RefText: tpl.RefText, Active: true,
		}
		// The catalog's code column is also unique per tenant; a code collision
		// (an admin already added a test under this code) shouldn't block the
		// rest of the seed run, so skip that one row and continue.
		_ = tx.Create(&row).Error
	}
	return nil
}
