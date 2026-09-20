package graph

// Chart-of-accounts read + write, and manual journals. All admin-gated; system
// accounts are immutable and accounts with ledger history cannot be deleted.

import (
	"context"
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries ────────────────────────────────────────────────────────────────

func (r *queryResolver) Accounts(ctx context.Context, typeArg *string, activeOnly *bool) ([]*model.Account, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if err := r.ensureAccounts(ctx, auth.TenantID); err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if typeArg != nil && *typeArg != "" {
		q = q.Where("type = ?", *typeArg)
	}
	if derefBool(activeOnly) {
		q = q.Where("active = ?", true)
	}
	var rows []models.Account
	if err := q.Order("code asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	tenantType := models.TenantTypeOf(r.DB.WithContext(ctx), auth.TenantID)
	out := make([]*model.Account, 0, len(rows))
	for _, a := range rows {
		// Defense-in-depth: hide system accounts seeded for a different
		// industry (e.g. a pre-fix tenant that already has both "Fee Income"
		// and "Clinical Income" rows) even though EnsureTenantAccounts no
		// longer creates them going forward.
		if a.IsSystem && a.SystemKey != "" && !database.IsSystemAccountForIndustry(a.SystemKey, tenantType) {
			continue
		}
		out = append(out, accountToModel(a))
	}
	return out, nil
}

func (r *queryResolver) Account(ctx context.Context, id string) (*model.Account, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var a models.Account
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return accountToModel(a), nil
}

// ─── Mutations ──────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateAccount(ctx context.Context, input model.CreateAccountInput) (*model.Account, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if !validAccountType(input.Type) {
		return nil, GQLErr("type must be asset, liability, equity, income, or expense")
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("code and name are required")
	}
	if err := r.ensureAccounts(ctx, auth.TenantID); err != nil {
		return nil, err
	}
	if err := r.validateParent(ctx, auth.TenantID, strVal(input.ParentID)); err != nil {
		return nil, err
	}
	acc := models.Account{
		TenantID: auth.TenantID, Code: code, Name: name, Type: input.Type,
		ParentID: strVal(input.ParentID), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&acc).Error; err != nil {
		return nil, uniqueErr(err, "an account with this code already exists")
	}
	return accountToModel(acc), nil
}

func (r *mutationResolver) UpdateAccount(ctx context.Context, id string, input model.UpdateAccountInput) (*model.Account, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var acc models.Account
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&acc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Code != nil && strings.TrimSpace(*input.Code) != "" {
		updates["code"] = strings.TrimSpace(*input.Code)
	}
	if input.Name != nil && strings.TrimSpace(*input.Name) != "" {
		updates["name"] = strings.TrimSpace(*input.Name)
	}
	if input.Active != nil {
		if acc.IsSystem && !*input.Active {
			return nil, GQLErr("a system account cannot be deactivated")
		}
		updates["active"] = *input.Active
	}
	if input.ParentID != nil {
		if acc.IsSystem {
			return nil, GQLErr("a system account's position is locked")
		}
		if *input.ParentID == id {
			return nil, GQLErr("an account cannot be its own parent")
		}
		if err := r.validateParent(ctx, auth.TenantID, *input.ParentID); err != nil {
			return nil, err
		}
		updates["parent_id"] = *input.ParentID
	}
	if len(updates) == 0 {
		return accountToModel(acc), nil
	}
	if err := r.DB.WithContext(ctx).Model(&acc).Updates(updates).Error; err != nil {
		return nil, uniqueErr(err, "an account with this code already exists")
	}
	if err := r.DB.WithContext(ctx).Where("id = ?", id).First(&acc).Error; err != nil {
		return nil, err
	}
	return accountToModel(acc), nil
}

func (r *mutationResolver) DeleteAccount(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var acc models.Account
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&acc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	if acc.IsSystem {
		return false, GQLErr("system accounts cannot be deleted")
	}
	var refs int64
	if err := r.DB.WithContext(ctx).Model(&models.LedgerEntry{}).
		Where("tenant_id = ? AND account_id = ?", auth.TenantID, id).Count(&refs).Error; err != nil {
		return false, err
	}
	if refs > 0 {
		return false, GQLErr("this account has ledger history and cannot be deleted")
	}
	var children int64
	if err := r.DB.WithContext(ctx).Model(&models.Account{}).
		Where("tenant_id = ? AND parent_id = ?", auth.TenantID, id).Count(&children).Error; err != nil {
		return false, err
	}
	if children > 0 {
		return false, GQLErr("reparent or remove the child accounts first")
	}
	if err := r.DB.WithContext(ctx).Delete(&acc).Error; err != nil {
		return false, err
	}
	return true, nil
}

// CreateManualJournal posts an admin adjustment as a balanced manual batch.
func (r *mutationResolver) CreateManualJournal(ctx context.Context, input model.CreateManualJournalInput) (*model.LedgerBatch, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	date := strings.TrimSpace(input.Date)
	if date == "" {
		return nil, GQLErr("date is required")
	}
	if len(input.Lines) < 2 {
		return nil, GQLErr("a journal entry needs at least two lines")
	}
	if err := r.ensureAccounts(ctx, auth.TenantID); err != nil {
		return nil, err
	}
	lines := make([]models.LedgerEntry, 0, len(input.Lines))
	for _, l := range input.Lines {
		var cnt int64
		if err := r.DB.WithContext(ctx).Model(&models.Account{}).
			Where("id = ? AND tenant_id = ?", l.AccountID, auth.TenantID).Count(&cnt).Error; err != nil {
			return nil, err
		}
		if cnt == 0 {
			return nil, GQLErr("unknown account in journal line")
		}
		lines = append(lines, models.LedgerEntry{
			AccountID: l.AccountID, Debit: floatVal(l.Debit), Credit: floatVal(l.Credit), Memo: strVal(l.Memo),
		})
	}
	var batchID string
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := postBatchByAccountID(tx, auth.TenantID, date, strVal(input.Memo), lines); err != nil {
			return err
		}
		return tx.Model(&models.LedgerBatch{}).
			Where("tenant_id = ? AND source_type = ?", auth.TenantID, models.LedgerSourceManual).
			Order("created_at desc").Limit(1).Pluck("id", &batchID).Error
	})
	if err != nil {
		return nil, err
	}
	return r.loadLedgerBatch(ctx, auth.TenantID, batchID)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// ensureAccounts seeds the tenant's system chart if it is missing.
func (r *mutationResolver) ensureAccounts(ctx context.Context, tenantID string) error {
	return database.EnsureTenantAccounts(r.DB.WithContext(ctx), tenantID)
}

func (r *queryResolver) ensureAccounts(ctx context.Context, tenantID string) error {
	return database.EnsureTenantAccounts(r.DB.WithContext(ctx), tenantID)
}

func (r *mutationResolver) validateParent(ctx context.Context, tenantID, parentID string) error {
	if parentID == "" {
		return nil
	}
	var cnt int64
	if err := r.DB.WithContext(ctx).Model(&models.Account{}).
		Where("id = ? AND tenant_id = ?", parentID, tenantID).Count(&cnt).Error; err != nil {
		return err
	}
	if cnt == 0 {
		return GQLErr("parent account not found")
	}
	return nil
}

func validAccountType(t string) bool {
	switch t {
	case models.AccountAsset, models.AccountLiability, models.AccountEquity,
		models.AccountIncome, models.AccountExpense:
		return true
	}
	return false
}

func accountToModel(a models.Account) *model.Account {
	m := &model.Account{
		ID: a.ID, Code: a.Code, Name: a.Name, Type: a.Type,
		IsSystem: a.IsSystem, Active: a.Active,
	}
	if a.ParentID != "" {
		m.ParentID = toStrPtr(a.ParentID)
	}
	if a.SystemKey != "" {
		m.SystemKey = toStrPtr(a.SystemKey)
	}
	m.CreatedAt = toStrPtr(a.CreatedAt.Format("2006-01-02"))
	return m
}
