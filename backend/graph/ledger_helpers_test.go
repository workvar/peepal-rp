package graph

// Unit tests for the double-entry posting helper. These use a pure-Go, in-memory
// sqlite so they run everywhere without a Postgres instance.

import (
	"testing"

	"collegeerp/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// newLedgerDB opens an in-memory DB with just the finance tables migrated.
func newLedgerDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Account{}, &models.LedgerBatch{}, &models.LedgerEntry{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

// accountNet returns debit-minus-credit summed for a system account.
func accountNet(t *testing.T, db *gorm.DB, tenantID, systemKey string) float64 {
	t.Helper()
	var acc models.Account
	if err := db.Where("tenant_id = ? AND system_key = ?", tenantID, systemKey).First(&acc).Error; err != nil {
		t.Fatalf("account %s: %v", systemKey, err)
	}
	var res struct{ Debit, Credit float64 }
	db.Table("ledger_entries").
		Select("COALESCE(SUM(debit),0) as debit, COALESCE(SUM(credit),0) as credit").
		Where("tenant_id = ? AND account_id = ?", tenantID, acc.ID).Scan(&res)
	return round2fin(res.Debit - res.Credit)
}

func TestPostBatch_RejectsUnbalanced(t *testing.T) {
	db := newLedgerDB(t)
	err := postBatch(db, "t1", "2020-01-01", "bad", models.LedgerSourceManual, "x1", []postLine{
		{AccountKey: "cash", Debit: 100},
		{AccountKey: "fee_income", Credit: 50},
	})
	if err == nil {
		t.Fatal("expected an unbalanced batch to be rejected")
	}
	var n int64
	db.Model(&models.LedgerBatch{}).Count(&n)
	if n != 0 {
		t.Fatalf("no batch should have been written, found %d", n)
	}
}

func TestPostBatch_IdempotentPerSource(t *testing.T) {
	db := newLedgerDB(t)
	lines := []postLine{{AccountKey: "cash", Debit: 100}, {AccountKey: "fee_income", Credit: 100}}
	for i := 0; i < 2; i++ {
		if err := postBatch(db, "t1", "2020-01-01", "fee", models.LedgerSourceFeePayment, "pay1", lines); err != nil {
			t.Fatalf("post %d: %v", i, err)
		}
	}
	var batches int64
	db.Model(&models.LedgerBatch{}).
		Where("source_type = ? AND source_id = ?", models.LedgerSourceFeePayment, "pay1").Count(&batches)
	if batches != 1 {
		t.Fatalf("expected exactly one batch for the source, got %d", batches)
	}
	if got := accountNet(t, db, "t1", "cash"); got != 100 {
		t.Fatalf("cash net = %v, want 100 (no double post)", got)
	}
}

func TestReverseBatch_NetsToZero(t *testing.T) {
	db := newLedgerDB(t)
	lines := []postLine{{AccountKey: "cash", Debit: 100}, {AccountKey: "fee_income", Credit: 100}}
	if err := postBatch(db, "t1", "2020-01-01", "fee", models.LedgerSourceFeePayment, "pay1", lines); err != nil {
		t.Fatalf("post: %v", err)
	}
	if err := reverseBatch(db, "t1", models.LedgerSourceFeePayment, "pay1"); err != nil {
		t.Fatalf("reverse: %v", err)
	}
	if got := accountNet(t, db, "t1", "cash"); got != 0 {
		t.Fatalf("cash net after reversal = %v, want 0", got)
	}
	if got := accountNet(t, db, "t1", "fee_income"); got != 0 {
		t.Fatalf("fee_income net after reversal = %v, want 0", got)
	}
	// The original is flagged, so a re-post for the same source is allowed again.
	var reversed bool
	db.Model(&models.LedgerBatch{}).
		Where("source_type = ? AND source_id = ? AND reversed = ?", models.LedgerSourceFeePayment, "pay1", false).
		Select("count(*) > 0").Scan(&reversed)
	if reversed {
		t.Fatal("expected no active (non-reversed) batch to remain for the source")
	}
}
