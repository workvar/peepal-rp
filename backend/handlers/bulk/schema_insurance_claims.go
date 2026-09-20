package bulk

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Bulk upload for insurance claims (healthcare, Phase 4). Each row is one claim,
// created in the "draft" status just like the CreateInsuranceClaim resolver —
// submitting a claim for approval remains a per-claim action. Patient and payer
// are referenced by MRN and payer code (or UUID) so no one types raw UUIDs.
var insuranceClaimsSchema = &Schema{
	Resource:    "insurance_claims",
	Title:       "Insurance Claims",
	Description: "Raise insurance claims in bulk as drafts. Reference the patient by MRN and the payer by its code. Claim numbers (CLM-00001, …) are generated automatically. Submit each claim for approval afterwards.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "patient", Label: "Patient (MRN)", Type: FieldString, Required: true,
			Description: "Patient's MRN (or UUID). Must already exist.",
			Example:     "MRN-00001",
		},
		{
			Name: "payer", Label: "Payer (Code)", Type: FieldString, Required: true,
			Description: "Insurance payer code (or UUID). Must already exist.",
			Example:     "STAR-HEALTH",
		},
		{
			Name: "claim_amount", Label: "Claim Amount", Type: FieldFloat, Required: true,
			Description: "Amount claimed, greater than zero.",
			Example:     "25000",
		},
		{
			Name: "policy_number", Label: "Policy Number", Type: FieldString,
			Description: "Optional insurance policy number.",
			Example:     "POL-99887766",
		},
		{
			Name: "diagnosis", Label: "Diagnosis", Type: FieldString,
			Description: "Optional diagnosis / reason for the claim.",
			Example:     "Appendectomy",
		},
		{
			Name: "notes", Label: "Notes", Type: FieldString,
			Description: "Optional free-text notes.",
			Example:     "Pre-authorised",
		},
	},
	Create: createInsuranceClaimRow,
}

func createInsuranceClaimRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}

	patientID, err := resolvePatientID(ctx.TenantID, row["patient"])
	if err != nil {
		return "", err
	}
	payerID, err := resolvePayerID(ctx.TenantID, row["payer"])
	if err != nil {
		return "", err
	}

	amtRaw := strings.TrimSpace(row["claim_amount"])
	amt, err := strconv.ParseFloat(amtRaw, 64)
	if err != nil || amt <= 0 {
		return "", errors.New("claim_amount must be a number greater than zero")
	}

	c := models.InsuranceClaim{
		TenantID:     ctx.TenantID,
		PatientID:    patientID,
		PayerID:      payerID,
		PolicyNumber: strings.TrimSpace(row["policy_number"]),
		Diagnosis:    strings.TrimSpace(row["diagnosis"]),
		ClaimAmount:  amt,
		Status:       models.ClaimDraft,
		Notes:        strings.TrimSpace(row["notes"]),
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		num, nerr := nextBulkClaimNumber(tx, ctx.TenantID)
		if nerr != nil {
			return nerr
		}
		c.ClaimNumber = num
		return tx.Create(&c).Error
	})
	if err != nil {
		return "", errors.New("could not create claim")
	}
	return c.ID, nil
}

// nextBulkClaimNumber mirrors the resolver's claim-number generator (graph
// package) without importing it — handlers/bulk must stay independent of graph.
func nextBulkClaimNumber(tx *gorm.DB, tenantID string) (string, error) {
	var n int64
	if err := tx.Model(&models.InsuranceClaim{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("CLM-%05d", n+1+int64(i))
		var exists int64
		if err := tx.Model(&models.InsuranceClaim{}).
			Where("tenant_id = ? AND claim_number = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique claim number")
}

func init() { Register(insuranceClaimsSchema) }
