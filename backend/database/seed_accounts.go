package database

import (
	"collegeerp/models"

	"gorm.io/gorm"
)

// Chart-of-accounts seeding.
//
// Every tenant that keeps books needs a minimal system chart whose accounts the
// auto-posting logic resolves by SystemKey. Seeding is additive (insert-if-
// missing by SystemKey within the tenant), so it is safe to re-run and matches
// SeedModuleConfig's convention. It is called lazily the first time a tenant
// touches the ledger (postBatch / accounts query), so no per-tenant migration
// hook is required.

// systemAccount describes one seeded row of the default chart. Industries is
// the same convention as models.moduleIndustries: the industries this account
// belongs to, or nil/empty for one shared across every tenant type.
type systemAccount struct {
	Code, Name, Type, SystemKey string
	Industries                  []models.TenantType
}

// DefaultSystemAccounts is the minimal chart every tenant starts with, filtered
// per tenant by IsSystemAccountForIndustry. Admins may add children/siblings
// freely; these rows are immutable.
var DefaultSystemAccounts = []systemAccount{
	{Code: "1000", Name: "Cash / Bank", Type: models.AccountAsset, SystemKey: "cash"},
	{Code: "1100", Name: "Accounts Receivable — Students", Type: models.AccountAsset, SystemKey: "ar_students",
		Industries: []models.TenantType{models.TenantTypeEducation}},
	{Code: "1110", Name: "Accounts Receivable — Patients", Type: models.AccountAsset, SystemKey: "ar_patients",
		Industries: []models.TenantType{models.TenantTypeHealthcare}},
	{Code: "2000", Name: "Accounts Payable — Vendors", Type: models.AccountLiability, SystemKey: "ap_vendors"},
	{Code: "4000", Name: "Fee Income", Type: models.AccountIncome, SystemKey: "fee_income",
		Industries: []models.TenantType{models.TenantTypeEducation}},
	{Code: "4100", Name: "Clinical Income", Type: models.AccountIncome, SystemKey: "clinical_income",
		Industries: []models.TenantType{models.TenantTypeHealthcare}},
	{Code: "5000", Name: "Salary Expense", Type: models.AccountExpense, SystemKey: "salary_expense"},
	{Code: "5100", Name: "Purchases / COGS", Type: models.AccountExpense, SystemKey: "purchases"},
	{Code: "5200", Name: "Referral Commission Expense", Type: models.AccountExpense, SystemKey: "referral_commission_expense",
		Industries: []models.TenantType{models.TenantTypeHealthcare}},
}

// IsSystemAccountForIndustry reports whether a system account (by SystemKey)
// belongs to the given tenant type. Unknown keys and untagged accounts are
// treated as shared, matching models.ModuleAllowedForIndustry.
func IsSystemAccountForIndustry(systemKey string, t models.TenantType) bool {
	for _, sa := range DefaultSystemAccounts {
		if sa.SystemKey != systemKey {
			continue
		}
		if len(sa.Industries) == 0 {
			return true
		}
		c := t.Canonical()
		for _, ind := range sa.Industries {
			if ind == c {
				return true
			}
		}
		return false
	}
	return true
}

// EnsureTenantAccounts inserts any missing system accounts for a tenant,
// skipping the ones scoped to a different industry. It runs inside the
// caller's transaction so seeding commits atomically with whatever triggered
// it. Idempotent: an account already present (by SystemKey) is left untouched.
func EnsureTenantAccounts(tx *gorm.DB, tenantID string) error {
	if tenantID == "" {
		return nil
	}
	tenantType := models.TenantTypeOf(tx, tenantID)
	for _, sa := range DefaultSystemAccounts {
		if len(sa.Industries) > 0 && !IsSystemAccountForIndustry(sa.SystemKey, tenantType) {
			continue
		}
		var count int64
		if err := tx.Model(&models.Account{}).
			Where("tenant_id = ? AND system_key = ?", tenantID, sa.SystemKey).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		acc := models.Account{
			TenantID:  tenantID,
			Code:      sa.Code,
			Name:      sa.Name,
			Type:      sa.Type,
			IsSystem:  true,
			SystemKey: sa.SystemKey,
			Active:    true,
		}
		if err := tx.Create(&acc).Error; err != nil {
			return err
		}
	}
	return nil
}
