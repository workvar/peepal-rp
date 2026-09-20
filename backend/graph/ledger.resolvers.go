package graph

// Read side of the general ledger: batches, per-account running balances, trial
// balance, and the two financial statements. The statement builders are exported
// so the PDF handlers can reuse the exact same figures.

import (
	"context"
	"errors"
	"math"

	"collegeerp/database"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Batch list + single-batch loader ───────────────────────────────────────

func (r *queryResolver) LedgerBatches(ctx context.Context, from *string, to *string, sourceType *string) ([]*model.LedgerBatch, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Lines").Preload("Lines.Account").
		Where("tenant_id = ?", auth.TenantID)
	if from != nil && *from != "" {
		q = q.Where("date >= ?", *from)
	}
	if to != nil && *to != "" {
		q = q.Where("date <= ?", *to)
	}
	if sourceType != nil && *sourceType != "" {
		q = q.Where("source_type = ?", *sourceType)
	}
	var rows []models.LedgerBatch
	if err := q.Order("date desc, created_at desc").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LedgerBatch, len(rows))
	for i, b := range rows {
		out[i] = ledgerBatchToModel(b)
	}
	return out, nil
}

func (r *mutationResolver) loadLedgerBatch(ctx context.Context, tenantID, id string) (*model.LedgerBatch, error) {
	var b models.LedgerBatch
	if err := r.DB.WithContext(ctx).Preload("Lines").Preload("Lines.Account").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&b).Error; err != nil {
		return nil, err
	}
	return ledgerBatchToModel(b), nil
}

// ─── Account running-balance ledger ─────────────────────────────────────────

func (r *queryResolver) AccountLedger(ctx context.Context, accountID string, from *string, to *string) (*model.AccountLedger, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var acc models.Account
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", accountID, auth.TenantID).First(&acc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	fromS, toS := strVal(from), strVal(to)

	// Opening balance = signed net of everything strictly before `from`.
	opening := 0.0
	if fromS != "" {
		d, c, err := accountSum(r.DB.WithContext(ctx), auth.TenantID, accountID, "", fromS, true)
		if err != nil {
			return nil, err
		}
		opening = signedNet(acc, d, c)
	}

	type entryRow struct {
		BatchID string
		Date    string
		Memo    string
		Debit   float64
		Credit  float64
	}
	q := r.DB.WithContext(ctx).Table("ledger_entries as e").
		Select("e.batch_id as batch_id, b.date as date, b.memo as memo, e.debit as debit, e.credit as credit").
		Joins("JOIN ledger_batches b ON b.id = e.batch_id").
		Where("e.tenant_id = ? AND e.account_id = ? AND b.posted = ?", auth.TenantID, accountID, true)
	if fromS != "" {
		q = q.Where("b.date >= ?", fromS)
	}
	if toS != "" {
		q = q.Where("b.date <= ?", toS)
	}
	var rows []entryRow
	if err := q.Order("b.date asc, b.created_at asc").Scan(&rows).Error; err != nil {
		return nil, err
	}

	running := opening
	out := make([]*model.AccountLedgerRow, len(rows))
	for i, e := range rows {
		running += signedNet(acc, e.Debit, e.Credit)
		out[i] = &model.AccountLedgerRow{
			BatchID: e.BatchID, Date: e.Date, Memo: toStrPtr(e.Memo),
			Debit: e.Debit, Credit: e.Credit, Balance: round2fin(running),
		}
	}
	return &model.AccountLedger{
		Account:        accountToModel(acc),
		OpeningBalance: round2fin(opening),
		ClosingBalance: round2fin(running),
		Rows:           out,
	}, nil
}

// ─── Trial balance + statements (resolvers delegate to exported builders) ────

func (r *queryResolver) TrialBalance(ctx context.Context, asOf *string) ([]*model.TrialBalanceRow, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	return TrialBalanceData(r.DB.WithContext(ctx), auth.TenantID, orToday(asOf))
}

func (r *queryResolver) ProfitAndLoss(ctx context.Context, from string, to string) (*model.FinancialStatement, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	return ProfitAndLossData(r.DB.WithContext(ctx), auth.TenantID, from, to)
}

func (r *queryResolver) BalanceSheet(ctx context.Context, asOf string) (*model.FinancialStatement, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	return BalanceSheetData(r.DB.WithContext(ctx), auth.TenantID, asOf)
}

// ─── Exported statement builders (shared by GraphQL + PDF) ───────────────────

type balRow struct {
	AccountID, Code, Name, Type string
	Debit, Credit               float64
}

// computeBalances returns every account with its summed debit/credit over the
// [from, to] posting-date window (blank bound = open-ended). Accounts with no
// activity are included with zeros so callers can decide whether to show them.
func computeBalances(db *gorm.DB, tenantID, from, to string) ([]balRow, error) {
	_ = database.EnsureTenantAccounts(db, tenantID)
	var accounts []models.Account
	if err := db.Where("tenant_id = ?", tenantID).Order("code asc").Find(&accounts).Error; err != nil {
		return nil, err
	}
	type sumRow struct {
		AccountID string
		Debit     float64
		Credit    float64
	}
	q := db.Table("ledger_entries as e").
		Select("e.account_id as account_id, COALESCE(SUM(e.debit),0) as debit, COALESCE(SUM(e.credit),0) as credit").
		Joins("JOIN ledger_batches b ON b.id = e.batch_id").
		Where("e.tenant_id = ? AND b.posted = ?", tenantID, true)
	if from != "" {
		q = q.Where("b.date >= ?", from)
	}
	if to != "" {
		q = q.Where("b.date <= ?", to)
	}
	var sums []sumRow
	if err := q.Group("e.account_id").Scan(&sums).Error; err != nil {
		return nil, err
	}
	byID := map[string]sumRow{}
	for _, s := range sums {
		byID[s.AccountID] = s
	}
	out := make([]balRow, len(accounts))
	for i, a := range accounts {
		s := byID[a.ID]
		out[i] = balRow{AccountID: a.ID, Code: a.Code, Name: a.Name, Type: a.Type, Debit: s.Debit, Credit: s.Credit}
	}
	return out, nil
}

// TrialBalanceData lists every account carrying a balance as of `asOf`, each
// placed in its natural column. Total debit always equals total credit.
func TrialBalanceData(db *gorm.DB, tenantID, asOf string) ([]*model.TrialBalanceRow, error) {
	rows, err := computeBalances(db, tenantID, "", asOf)
	if err != nil {
		return nil, err
	}
	out := []*model.TrialBalanceRow{}
	for _, r := range rows {
		net := round2fin(r.Debit - r.Credit)
		if net == 0 {
			continue
		}
		tr := &model.TrialBalanceRow{AccountID: r.AccountID, Code: r.Code, Name: r.Name, Type: r.Type}
		if net >= 0 {
			tr.Debit = net
		} else {
			tr.Credit = -net
		}
		out = append(out, tr)
	}
	return out, nil
}

// ProfitAndLossData builds an income-statement over [from, to]: income less
// expense. Income lines carry credit-normal amounts, expenses debit-normal.
func ProfitAndLossData(db *gorm.DB, tenantID, from, to string) (*model.FinancialStatement, error) {
	rows, err := computeBalances(db, tenantID, from, to)
	if err != nil {
		return nil, err
	}
	income := &model.StatementSection{Title: "Income"}
	expense := &model.StatementSection{Title: "Expenses"}
	for _, r := range rows {
		switch r.Type {
		case models.AccountIncome:
			amt := round2fin(r.Credit - r.Debit)
			if amt == 0 {
				continue
			}
			income.Lines = append(income.Lines, &model.StatementLine{Code: r.Code, Name: r.Name, Amount: amt})
			income.Total += amt
		case models.AccountExpense:
			amt := round2fin(r.Debit - r.Credit)
			if amt == 0 {
				continue
			}
			expense.Lines = append(expense.Lines, &model.StatementLine{Code: r.Code, Name: r.Name, Amount: amt})
			expense.Total += amt
		}
	}
	income.Total = round2fin(income.Total)
	expense.Total = round2fin(expense.Total)
	fromS, toS := from, to
	return &model.FinancialStatement{
		Title:    "Profit & Loss",
		From:     &fromS,
		To:       &toS,
		Sections: []*model.StatementSection{income, expense},
		Total:    round2fin(income.Total - expense.Total), // net profit
		Balanced: true,
	}, nil
}

// BalanceSheetData builds assets = liabilities + equity as of `asOf`. Current
// earnings (cumulative income − expense) fold into equity so the sheet balances.
func BalanceSheetData(db *gorm.DB, tenantID, asOf string) (*model.FinancialStatement, error) {
	rows, err := computeBalances(db, tenantID, "", asOf)
	if err != nil {
		return nil, err
	}
	assets := &model.StatementSection{Title: "Assets"}
	liabilities := &model.StatementSection{Title: "Liabilities"}
	equity := &model.StatementSection{Title: "Equity"}
	var netEarnings float64
	for _, r := range rows {
		switch r.Type {
		case models.AccountAsset:
			amt := round2fin(r.Debit - r.Credit)
			if amt != 0 {
				assets.Lines = append(assets.Lines, &model.StatementLine{Code: r.Code, Name: r.Name, Amount: amt})
				assets.Total += amt
			}
		case models.AccountLiability:
			amt := round2fin(r.Credit - r.Debit)
			if amt != 0 {
				liabilities.Lines = append(liabilities.Lines, &model.StatementLine{Code: r.Code, Name: r.Name, Amount: amt})
				liabilities.Total += amt
			}
		case models.AccountEquity:
			amt := round2fin(r.Credit - r.Debit)
			if amt != 0 {
				equity.Lines = append(equity.Lines, &model.StatementLine{Code: r.Code, Name: r.Name, Amount: amt})
				equity.Total += amt
			}
		case models.AccountIncome:
			netEarnings += r.Credit - r.Debit
		case models.AccountExpense:
			netEarnings -= r.Debit - r.Credit
		}
	}
	netEarnings = round2fin(netEarnings)
	if netEarnings != 0 {
		equity.Lines = append(equity.Lines, &model.StatementLine{Code: "", Name: "Current Earnings", Amount: netEarnings})
		equity.Total += netEarnings
	}
	assets.Total = round2fin(assets.Total)
	liabilities.Total = round2fin(liabilities.Total)
	equity.Total = round2fin(equity.Total)
	asOfS := asOf
	return &model.FinancialStatement{
		Title:    "Balance Sheet",
		AsOf:     &asOfS,
		Sections: []*model.StatementSection{assets, liabilities, equity},
		Total:    assets.Total,
		Balanced: math.Abs(assets.Total-(liabilities.Total+equity.Total)) < 0.01,
	}, nil
}

// ─── Shared small helpers ───────────────────────────────────────────────────

// accountSum returns raw debit/credit totals for one account over a date window.
// When beforeExclusive is true, `to` is treated as an exclusive upper bound
// (date < to) — used to compute an opening balance.
func accountSum(db *gorm.DB, tenantID, accountID, from, to string, beforeExclusive bool) (float64, float64, error) {
	type sumRow struct{ Debit, Credit float64 }
	var s sumRow
	q := db.Table("ledger_entries as e").
		Select("COALESCE(SUM(e.debit),0) as debit, COALESCE(SUM(e.credit),0) as credit").
		Joins("JOIN ledger_batches b ON b.id = e.batch_id").
		Where("e.tenant_id = ? AND e.account_id = ? AND b.posted = ?", tenantID, accountID, true)
	if from != "" {
		q = q.Where("b.date >= ?", from)
	}
	if to != "" {
		if beforeExclusive {
			q = q.Where("b.date < ?", to)
		} else {
			q = q.Where("b.date <= ?", to)
		}
	}
	if err := q.Scan(&s).Error; err != nil {
		return 0, 0, err
	}
	return s.Debit, s.Credit, nil
}

func signedNet(a models.Account, debit, credit float64) float64 {
	if a.NormalIsDebit() {
		return debit - credit
	}
	return credit - debit
}

func round2fin(v float64) float64 { return math.Round(v*100) / 100 }

func orToday(s *string) string {
	if s == nil || *s == "" {
		return todayYMD()
	}
	return *s
}

// ─── Model conversion ────────────────────────────────────────────────────────

func ledgerBatchToModel(b models.LedgerBatch) *model.LedgerBatch {
	m := &model.LedgerBatch{
		ID: b.ID, Date: b.Date, Memo: toStrPtr(b.Memo),
		SourceType: toStrPtr(b.SourceType), SourceID: toStrPtr(b.SourceID),
		Posted: b.Posted, Reversed: b.Reversed,
		CreatedAt: toStrPtr(b.CreatedAt.Format("2006-01-02")),
	}
	m.Lines = make([]*model.LedgerEntry, len(b.Lines))
	for i, l := range b.Lines {
		m.Lines[i] = ledgerEntryToModel(l)
	}
	return m
}

func ledgerEntryToModel(e models.LedgerEntry) *model.LedgerEntry {
	m := &model.LedgerEntry{
		ID: e.ID, BatchID: e.BatchID, AccountID: e.AccountID,
		Debit: e.Debit, Credit: e.Credit, Memo: toStrPtr(e.Memo),
	}
	if e.Account.ID != "" {
		m.AccountCode = toStrPtr(e.Account.Code)
		m.AccountName = toStrPtr(e.Account.Name)
	}
	return m
}
