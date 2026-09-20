package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Fee payments record money received against a student's fee. The amount is
// applied to installments oldest-first, exactly like the Record Payment UI.
// An allocation must already cover the student. One row = one payment.
var feePaymentsSchema = &Schema{
	Resource: "fee_payments",
	Title:    "Fee Payments",
	Description: "Record fee payments in bulk. Each row is one payment against a student's allocated fee.\n\n" +
		"Identify the student by roll_number. If the student has more than one fee, name the allocation in allocation; " +
		"if they have exactly one, leave it blank. The amount is applied to installments oldest-first and cannot exceed the outstanding balance. " +
		"A receipt number is generated automatically.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "roll_number", Label: "Roll Number", Type: FieldString, Required: true,
			Description: "Student roll number.",
			Example:     "CS2024001",
		},
		{
			Name: "allocation", Label: "Allocation", Type: FieldString,
			Description: "Allocation name (or UUID). Optional when the student has only one fee.",
			Example:     "B.Tech CSE — Regular (Yearly)",
		},
		{
			Name: "amount", Label: "Amount", Type: FieldFloat, Required: true,
			Description: "Amount received. Must be > 0 and within the outstanding balance.",
			Example:     "29000",
		},
		{
			Name: "payment_date", Label: "Payment Date", Type: FieldDate,
			Description: "Date received, YYYY-MM-DD. Defaults to today.",
			Example:     "2026-07-05",
		},
		{
			Name: "payment_mode", Label: "Payment Mode", Type: FieldEnum,
			AllowedValues: []string{"cash", "online", "cheque", "dd"},
			Description:   "How the money was received. Defaults to cash.",
			Example:       "online",
		},
		{
			Name: "transaction_ref", Label: "Transaction Ref", Type: FieldString,
			Description: "Cheque/DD/UTR reference number. Optional.",
			Example:     "UTR123456789",
		},
		{
			Name: "remarks", Label: "Remarks", Type: FieldString,
			Description: "Optional note.",
			Example:     "First installment",
		},
	},
	ExampleRows: [][]string{
		{"CS2024001", "", "29000", "2026-07-05", "online", "UTR123456789", "First installment"},
	},
	Create: createFeePaymentRow,
}

func createFeePaymentRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleStaff) {
		return "", errors.New("admin or staff role required")
	}

	st, err := resolveStudentForFee(ctx.TenantID, row["roll_number"], "")
	if err != nil {
		return "", err
	}
	sf, err := resolveStudentFee(ctx.TenantID, st.ID, row["allocation"])
	if err != nil {
		return "", err
	}

	amount := ParseFloat(row["amount"])
	if amount <= 0 {
		return "", errors.New("amount must be greater than 0")
	}
	outstanding := feeRound2(sf.NetAmount - sf.PaidAmount)
	if amount > outstanding+0.005 {
		return "", fmt.Errorf("amount %.2f exceeds the outstanding balance %.2f", amount, outstanding)
	}

	payDate := time.Now()
	if d := ParseDate(row["payment_date"]); !d.IsZero() {
		payDate = d
	}
	mode := strings.ToLower(strings.TrimSpace(row["payment_mode"]))
	if mode == "" {
		mode = "cash"
	}

	payment := models.FeePayment{
		TenantID:       ctx.TenantID,
		StudentFeeID:   sf.ID,
		StudentID:      sf.StudentID,
		Amount:         amount,
		PaymentDate:    payDate,
		PaymentMode:    mode,
		TransactionRef: strings.TrimSpace(row["transaction_ref"]),
		Status:         "paid",
		Remarks:        strings.TrimSpace(row["remarks"]),
		ReceivedBy:     ctx.ActorID,
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		payment.ReceiptNumber = nextFeeReceiptNumber(tx, ctx.TenantID)
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}
		return rebuildFeePaymentApplication(tx, sf.ID)
	})
	if err != nil {
		return "", err
	}
	return payment.ID, nil
}

func init() { Register(feePaymentsSchema) }
