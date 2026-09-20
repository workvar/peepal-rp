package graph

// The general-ledger posting helper — the core of Phase 3.
//
// The ledger is a derived, append-only mirror of source documents (fee payments,
// clinical invoice payments, payroll, purchase invoices/payments). Users keep
// recording money where they do today; each source resolver calls postBatch
// inside its own transaction, so a balanced journal entry commits atomically
// with the source row. This mirrors cascade_delete.go's "one place, called from
// many resolvers" pattern and keeps the GL always reconciled.

import (
	"errors"
	"math"

	"collegeerp/database"
	"collegeerp/models"

	"gorm.io/gorm"
)

// postLine is one leg of a journal entry, addressed by the target account's
// stable SystemKey. Exactly one of Debit/Credit should be non-zero.
type postLine struct {
	AccountKey string
	Debit      float64
	Credit     float64
	Memo       string
}

// accountIDByKey resolves a system account's id by SystemKey within a tenant. It
// assumes the chart has been seeded (postBatch seeds it first).
func accountIDByKey(tx *gorm.DB, tenantID, systemKey string) (string, error) {
	var acc models.Account
	if err := tx.Where("tenant_id = ? AND system_key = ?", tenantID, systemKey).
		First(&acc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", GQLErr("ledger: system account not found for key " + systemKey)
		}
		return "", err
	}
	return acc.ID, nil
}

// ledgerRound rounds to 2dp so float noise never breaks the balance check.
func ledgerRound(v float64) float64 { return math.Round(v*100) / 100 }

// postBatch writes one balanced LedgerBatch. It rejects unbalanced input
// (sum(debit) != sum(credit)) and is idempotent on (sourceType, sourceID): if a
// posted, non-reversed batch already exists for that source, it no-ops. Lines
// whose debit and credit are both zero are dropped; a batch that ends up empty
// (e.g. a zero-amount source) is skipped entirely.
func postBatch(tx *gorm.DB, tenantID, date, memo, sourceType, sourceID string, lines []postLine) error {
	if tenantID == "" {
		return GQLErr("ledger: tenant is required")
	}
	// Idempotency: never double-post a live source event.
	if sourceType != "" && sourceID != "" {
		var existing int64
		if err := tx.Model(&models.LedgerBatch{}).
			Where("tenant_id = ? AND source_type = ? AND source_id = ? AND posted = ? AND reversed = ?",
				tenantID, sourceType, sourceID, true, false).
			Count(&existing).Error; err != nil {
			return err
		}
		if existing > 0 {
			return nil
		}
	}

	// Make sure the system chart exists before resolving keys.
	if err := database.EnsureTenantAccounts(tx, tenantID); err != nil {
		return err
	}

	var totalDebit, totalCredit float64
	entries := make([]models.LedgerEntry, 0, len(lines))
	for _, l := range lines {
		debit := ledgerRound(l.Debit)
		credit := ledgerRound(l.Credit)
		if debit == 0 && credit == 0 {
			continue
		}
		if debit < 0 || credit < 0 {
			return GQLErr("ledger: debit/credit cannot be negative")
		}
		accID, err := accountIDByKey(tx, tenantID, l.AccountKey)
		if err != nil {
			return err
		}
		totalDebit += debit
		totalCredit += credit
		entries = append(entries, models.LedgerEntry{
			TenantID:  tenantID,
			AccountID: accID,
			Debit:     debit,
			Credit:    credit,
			Memo:      l.Memo,
		})
	}
	if len(entries) == 0 {
		return nil // nothing to post (e.g. a zero-value source event)
	}
	if ledgerRound(totalDebit) != ledgerRound(totalCredit) {
		return GQLErr("ledger: batch is unbalanced (debits must equal credits)")
	}

	batch := models.LedgerBatch{
		TenantID:   tenantID,
		Date:       date,
		Memo:       memo,
		SourceType: sourceType,
		SourceID:   sourceID,
		Posted:     true,
	}
	if err := tx.Create(&batch).Error; err != nil {
		return err
	}
	for i := range entries {
		entries[i].BatchID = batch.ID
		if err := tx.Create(&entries[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

// postPaymentBatch posts a balanced batch WITHOUT the (sourceType, sourceID)
// idempotency no-op. It exists for money events that have no row of their own
// to key on — a purchase payment only bumps PurchaseInvoice.PaidAmount, so
// several partial payments share the invoice id as their source and must each
// post. Reverse them together with reverseAllBatches on invoice delete.
func postPaymentBatch(tx *gorm.DB, tenantID, date, memo, sourceType, sourceID string, lines []postLine) error {
	if err := database.EnsureTenantAccounts(tx, tenantID); err != nil {
		return err
	}
	var totalDebit, totalCredit float64
	entries := make([]models.LedgerEntry, 0, len(lines))
	for _, l := range lines {
		debit := ledgerRound(l.Debit)
		credit := ledgerRound(l.Credit)
		if debit == 0 && credit == 0 {
			continue
		}
		accID, err := accountIDByKey(tx, tenantID, l.AccountKey)
		if err != nil {
			return err
		}
		totalDebit += debit
		totalCredit += credit
		entries = append(entries, models.LedgerEntry{
			TenantID: tenantID, AccountID: accID, Debit: debit, Credit: credit, Memo: l.Memo,
		})
	}
	if len(entries) == 0 {
		return nil
	}
	if ledgerRound(totalDebit) != ledgerRound(totalCredit) {
		return GQLErr("ledger: batch is unbalanced (debits must equal credits)")
	}
	batch := models.LedgerBatch{
		TenantID: tenantID, Date: date, Memo: memo,
		SourceType: sourceType, SourceID: sourceID, Posted: true,
	}
	if err := tx.Create(&batch).Error; err != nil {
		return err
	}
	for i := range entries {
		entries[i].BatchID = batch.ID
		if err := tx.Create(&entries[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

// postBatchByAccountID is the id-addressed sibling of postBatch, used by the
// manual-journal mutation where the caller already holds account ids. It shares
// the same balance rule but skips SystemKey resolution and idempotency (manual
// entries have no source document).
func postBatchByAccountID(tx *gorm.DB, tenantID, date, memo string, lines []models.LedgerEntry) error {
	var totalDebit, totalCredit float64
	kept := make([]models.LedgerEntry, 0, len(lines))
	for _, e := range lines {
		e.Debit = ledgerRound(e.Debit)
		e.Credit = ledgerRound(e.Credit)
		if e.Debit == 0 && e.Credit == 0 {
			continue
		}
		if e.Debit < 0 || e.Credit < 0 {
			return GQLErr("ledger: debit/credit cannot be negative")
		}
		totalDebit += e.Debit
		totalCredit += e.Credit
		kept = append(kept, e)
	}
	if len(kept) < 2 {
		return GQLErr("a journal entry needs at least two lines")
	}
	if ledgerRound(totalDebit) != ledgerRound(totalCredit) {
		return GQLErr("journal entry is unbalanced (debits must equal credits)")
	}
	batch := models.LedgerBatch{
		TenantID:   tenantID,
		Date:       date,
		Memo:       memo,
		SourceType: models.LedgerSourceManual,
		Posted:     true,
	}
	if err := tx.Create(&batch).Error; err != nil {
		return err
	}
	for i := range kept {
		kept[i].TenantID = tenantID
		kept[i].BatchID = batch.ID
		if err := tx.Create(&kept[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

// reverseBatch posts an inverse batch when a source document is deleted or
// voided, then flags the original as reversed so the two net to zero and future
// idempotency checks ignore both. A missing / already-reversed source is a
// no-op, so delete paths can call it unconditionally.
func reverseBatch(tx *gorm.DB, tenantID, sourceType, sourceID string) error {
	if tenantID == "" || sourceType == "" || sourceID == "" {
		return nil
	}
	var batch models.LedgerBatch
	err := tx.Preload("Lines").
		Where("tenant_id = ? AND source_type = ? AND source_id = ? AND posted = ? AND reversed = ?",
			tenantID, sourceType, sourceID, true, false).
		First(&batch).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return reverseOne(tx, batch)
}

// reverseAllBatches reverses every posted, non-reversed batch for a source —
// used where several batches share one source id (e.g. multiple purchase
// payments keyed on their invoice).
func reverseAllBatches(tx *gorm.DB, tenantID, sourceType, sourceID string) error {
	if tenantID == "" || sourceType == "" || sourceID == "" {
		return nil
	}
	var batches []models.LedgerBatch
	if err := tx.Preload("Lines").
		Where("tenant_id = ? AND source_type = ? AND source_id = ? AND posted = ? AND reversed = ?",
			tenantID, sourceType, sourceID, true, false).
		Find(&batches).Error; err != nil {
		return err
	}
	for _, b := range batches {
		if err := reverseOne(tx, b); err != nil {
			return err
		}
	}
	return nil
}

// reverseOne writes the inverse of a single batch and flags the original.
func reverseOne(tx *gorm.DB, batch models.LedgerBatch) error {
	rev := models.LedgerBatch{
		TenantID:   batch.TenantID,
		Date:       batch.Date,
		Memo:       "Reversal of " + batch.SourceType,
		SourceType: batch.SourceType,
		SourceID:   batch.SourceID,
		Posted:     true,
		Reversed:   true, // itself a reversal — excluded from the "active" idempotency filter
	}
	if err := tx.Create(&rev).Error; err != nil {
		return err
	}
	for _, l := range batch.Lines {
		inv := models.LedgerEntry{
			TenantID:  batch.TenantID,
			BatchID:   rev.ID,
			AccountID: l.AccountID,
			Debit:     l.Credit, // swap sides
			Credit:    l.Debit,
			Memo:      l.Memo,
		}
		if err := tx.Create(&inv).Error; err != nil {
			return err
		}
	}
	return tx.Model(&models.LedgerBatch{}).Where("id = ?", batch.ID).
		Update("reversed", true).Error
}
