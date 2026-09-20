package graph

// Reporting tests: a seeded fee payment + payroll + purchase invoice must yield
// a balanced trial balance and correct P&L / balance-sheet totals.

import (
	"math"
	"testing"

	"collegeerp/models"
)

func TestFinanceReports_TrialBalanceAndStatements(t *testing.T) {
	db := newLedgerDB(t)

	// Fee payment: cash 100 / fee income 100.
	if err := postBatch(db, "t1", "2020-03-01", "fee", models.LedgerSourceFeePayment, "fp1",
		[]postLine{{AccountKey: "cash", Debit: 100}, {AccountKey: "fee_income", Credit: 100}}); err != nil {
		t.Fatalf("fee post: %v", err)
	}
	// Payroll: salary expense 40 / cash 40.
	if err := postBatch(db, "t1", "2020-03-05", "pay", models.LedgerSourcePayroll, "pr1",
		[]postLine{{AccountKey: "salary_expense", Debit: 40}, {AccountKey: "cash", Credit: 40}}); err != nil {
		t.Fatalf("payroll post: %v", err)
	}
	// Purchase invoice: purchases 30 / AP 30.
	if err := postBatch(db, "t1", "2020-03-10", "po", models.LedgerSourcePurchaseInvoice, "pi1",
		[]postLine{{AccountKey: "purchases", Debit: 30}, {AccountKey: "ap_vendors", Credit: 30}}); err != nil {
		t.Fatalf("purchase post: %v", err)
	}

	// Trial balance: total debit must equal total credit.
	tb, err := TrialBalanceData(db, "t1", "2020-12-31")
	if err != nil {
		t.Fatalf("trial balance: %v", err)
	}
	var totDebit, totCredit float64
	for _, r := range tb {
		totDebit += r.Debit
		totCredit += r.Credit
	}
	if math.Abs(totDebit-totCredit) > 0.001 {
		t.Fatalf("trial balance unbalanced: debit=%v credit=%v", totDebit, totCredit)
	}
	if math.Abs(totDebit-130) > 0.001 {
		t.Fatalf("trial balance debit total = %v, want 130", totDebit)
	}

	// P&L: income 100 − expense 70 = net 30.
	pl, err := ProfitAndLossData(db, "t1", "2020-01-01", "2020-12-31")
	if err != nil {
		t.Fatalf("p&l: %v", err)
	}
	if math.Abs(pl.Total-30) > 0.001 {
		t.Fatalf("net profit = %v, want 30", pl.Total)
	}

	// Balance sheet: assets 60 = liabilities 30 + equity 30 (current earnings).
	bs, err := BalanceSheetData(db, "t1", "2020-12-31")
	if err != nil {
		t.Fatalf("balance sheet: %v", err)
	}
	if !bs.Balanced {
		t.Fatalf("balance sheet does not balance: %+v", bs)
	}
	if math.Abs(bs.Total-60) > 0.001 {
		t.Fatalf("total assets = %v, want 60", bs.Total)
	}
}
