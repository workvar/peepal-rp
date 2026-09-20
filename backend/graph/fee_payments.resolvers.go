package graph

// Fee payments: recording, cancelling, and the collection summary.

import (
	"context"
	"errors"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) FeePayments(ctx context.Context, studentID *string, studentFeeID *string, status *string) ([]*model.FeePayment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("fee_payments.tenant_id = ?", auth.TenantID).
		Preload("Student").Preload("Student.User").
		Preload("StudentFee").Preload("StudentFee.FeeAllocation")
	if studentID != nil && *studentID != "" {
		q = q.Where("fee_payments.student_id = ?", *studentID)
	}
	if studentFeeID != nil && *studentFeeID != "" {
		q = q.Where("fee_payments.student_fee_id = ?", *studentFeeID)
	}
	if status != nil && *status != "" {
		q = q.Where("fee_payments.status = ?", *status)
	}
	var payments []models.FeePayment
	if err := q.Order("fee_payments.created_at DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeePayment, len(payments))
	for i, p := range payments {
		out[i] = feePaymentToModel(p)
	}
	return out, nil
}

func (r *queryResolver) MyFeePayments(ctx context.Context) ([]*model.FeePayment, error) {
	// Self-service: resolves the caller's own student record.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var student models.Student
	if err := r.DB.WithContext(ctx).Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).First(&student).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	var payments []models.FeePayment
	if err := r.DB.WithContext(ctx).Where("student_id = ? AND tenant_id = ?", student.ID, auth.TenantID).
		Preload("StudentFee").Preload("StudentFee.FeeAllocation").
		Order("created_at DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeePayment, len(payments))
	for i, p := range payments {
		out[i] = feePaymentToModel(p)
	}
	return out, nil
}

func (r *queryResolver) FeeCollectionSummary(ctx context.Context) (*model.FeeCollectionSummary, error) {
	// Tenant-wide collection figures: fee-office roles only.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var totalCollected float64
	var paymentCount int64
	pq := r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("tenant_id = ? AND status = ?", auth.TenantID, "paid")
	if err := pq.Select("COALESCE(SUM(amount), 0)").Scan(&totalCollected).Error; err != nil {
		return nil, err
	}
	if err := pq.Count(&paymentCount).Error; err != nil {
		return nil, err
	}
	var totals struct {
		Expected float64
		Pending  float64
	}
	if err := r.DB.WithContext(ctx).Model(&models.StudentFee{}).
		Where("tenant_id = ?", auth.TenantID).
		Select("COALESCE(SUM(net_amount), 0) as expected, COALESCE(SUM(net_amount - paid_amount), 0) as pending").
		Scan(&totals).Error; err != nil {
		return nil, err
	}
	return &model.FeeCollectionSummary{
		TotalCollected: totalCollected,
		PaymentCount:   int(paymentCount),
		PendingDues:    totals.Pending,
		TotalExpected:  totals.Expected,
	}, nil
}

// ─── Mutations ────────────────────────────────────────────────────────────────

func (r *mutationResolver) RecordFeePayment(ctx context.Context, input model.RecordFeePaymentInput) (*model.FeePayment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if input.Amount <= 0 {
		return nil, GQLErr("amount must be greater than zero")
	}
	sf, err := r.loadStudentFee(ctx, auth.TenantID, input.StudentFeeID)
	if err != nil {
		return nil, err
	}
	outstanding := round2(sf.NetAmount - sf.PaidAmount)
	if input.Amount > outstanding+0.005 {
		return nil, GQLErr("amount exceeds the outstanding balance")
	}
	if input.InstallmentID != nil && *input.InstallmentID != "" {
		var inst models.StudentFeeInstallment
		if err := r.DB.WithContext(ctx).Where("id = ? AND student_fee_id = ?", *input.InstallmentID, sf.ID).First(&inst).Error; err != nil {
			return nil, GQLErr("installment does not belong to this student fee")
		}
	} else {
		input.InstallmentID = nil
	}

	payDate := time.Now()
	if input.PaymentDate != nil && *input.PaymentDate != "" {
		d, err := time.Parse("2006-01-02", *input.PaymentDate)
		if err != nil {
			return nil, GQLErr("paymentDate must be YYYY-MM-DD")
		}
		payDate = d
	}
	mode := "cash"
	if input.PaymentMode != nil && *input.PaymentMode != "" {
		mode = *input.PaymentMode
	}

	payment := models.FeePayment{
		TenantID:       auth.TenantID,
		StudentFeeID:   sf.ID,
		StudentID:      sf.StudentID,
		InstallmentID:  input.InstallmentID,
		Amount:         input.Amount,
		PaymentDate:    payDate,
		PaymentMode:    mode,
		TransactionRef: strVal(input.TransactionRef),
		Status:         "paid",
		Remarks:        strVal(input.Remarks),
		ReceivedBy:     auth.UserID,
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		payment.ReceiptNumber = r.nextReceiptNumber(tx, auth.TenantID)
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}
		if err := r.rebuildPaymentApplication(tx, sf.ID); err != nil {
			return err
		}
		// GL (cash-basis AR): cash in, fee income earned.
		return postBatch(tx, auth.TenantID, payment.PaymentDate.Format("2006-01-02"),
			"Fee payment "+payment.ReceiptNumber, models.LedgerSourceFeePayment, payment.ID,
			[]postLine{
				{AccountKey: "cash", Debit: payment.Amount},
				{AccountKey: "fee_income", Credit: payment.Amount},
			})
	})
	if err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Student").Preload("Student.User").
		Preload("StudentFee").Preload("StudentFee.FeeAllocation").
		Where("id = ?", payment.ID).First(&payment).Error; err != nil {
		return nil, err
	}
	return feePaymentToModel(payment), nil
}

func (r *mutationResolver) CancelFeePayment(ctx context.Context, id string) (*model.FeePayment, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var payment models.FeePayment
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if payment.Status == "cancelled" {
		return nil, GQLErr("payment is already cancelled")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&payment).Update("status", "cancelled").Error; err != nil {
			return err
		}
		if err := r.rebuildPaymentApplication(tx, payment.StudentFeeID); err != nil {
			return err
		}
		// GL: unwind the posting this payment created.
		return reverseBatch(tx, auth.TenantID, models.LedgerSourceFeePayment, payment.ID)
	})
	if err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Student").Preload("Student.User").
		Preload("StudentFee").Preload("StudentFee.FeeAllocation").
		Where("id = ?", payment.ID).First(&payment).Error; err != nil {
		return nil, err
	}
	return feePaymentToModel(payment), nil
}
