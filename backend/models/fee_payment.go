package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeePayment is money received against a student fee. The amount is applied
// to the fee's installments oldest-first (or to one specific installment if
// InstallmentID is set). Cancelling a payment reverses that application.
type FeePayment struct {
	ID             string     `gorm:"primaryKey" json:"id"`
	TenantID       string     `gorm:"not null;index" json:"tenant_id"`
	StudentFeeID   string     `gorm:"not null;index" json:"student_fee_id"`
	StudentFee     StudentFee `gorm:"foreignKey:StudentFeeID" json:"student_fee,omitempty"`
	StudentID      string     `gorm:"not null;index" json:"student_id"`
	Student        Student    `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	InstallmentID  *string    `gorm:"index" json:"installment_id"`
	Amount         float64    `gorm:"not null" json:"amount"`
	PaymentDate    time.Time  `json:"payment_date"`
	PaymentMode    string     `gorm:"default:'cash'" json:"payment_mode"` // cash | online | cheque | dd
	TransactionRef string     `json:"transaction_ref"`
	Status         string     `gorm:"default:'paid'" json:"status"` // paid | cancelled
	Remarks        string     `json:"remarks"`
	ReceivedBy     string     `gorm:"index" json:"received_by"`
	ReceiptNumber  string     `gorm:"uniqueIndex:idx_receipt_num" json:"receipt_number"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (f *FeePayment) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	return nil
}
