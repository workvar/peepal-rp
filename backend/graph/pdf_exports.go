package graph

// Exported entry points that let REST handlers (which stream binary PDFs, a
// case GraphQL does not serve well) reuse the resolver logic that computes
// academic results and materialises student fees. Keeping these here means the
// PDF handlers never re-implement the grading or fee maths.

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// LoadStudentByUser returns the caller's own student row (with user + course),
// used to build the identity header on fee/grade PDFs.
func LoadStudentByUser(ctx context.Context, db *gorm.DB, tenantID, userID string) (models.Student, error) {
	var st models.Student
	err := db.WithContext(ctx).Preload("User").Preload("Course").
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&st).Error
	return st, err
}

// LoadStudentByID returns a student row by id (admin/teacher downloading on a
// student's behalf).
func LoadStudentByID(ctx context.Context, db *gorm.DB, tenantID, studentID string) (models.Student, error) {
	var st models.Student
	err := db.WithContext(ctx).Preload("User").Preload("Course").
		Where("tenant_id = ? AND id = ?", tenantID, studentID).First(&st).Error
	return st, err
}

// AcademicResultForStudent computes the full semester-wise + cumulative result
// for a student, applying the tenant's grading scheme.
func AcademicResultForStudent(ctx context.Context, db *gorm.DB, tenantID string, student models.Student) (*model.AcademicResult, error) {
	scheme, err := loadOrCreateScheme(ctx, db, tenantID)
	if err != nil {
		return nil, err
	}
	return computeAcademicResult(ctx, db, tenantID, student, scheme)
}

// StudentFeesForStudent returns a student's fees with installments, add-ons, and
// discounts preloaded — the same shape the My Fees page consumes.
func StudentFeesForStudent(ctx context.Context, db *gorm.DB, tenantID, studentID string) ([]*model.StudentFee, error) {
	var fees []models.StudentFee
	if err := studentFeeQuery(db.WithContext(ctx)).
		Where("student_fees.tenant_id = ? AND student_fees.student_id = ?", tenantID, studentID).
		Order("student_fees.created_at DESC").Find(&fees).Error; err != nil {
		return nil, err
	}
	out := make([]*model.StudentFee, len(fees))
	for i, sf := range fees {
		out[i] = studentFeeToModel(sf)
	}
	return out, nil
}

// FeePaymentsForStudent returns a student's payments (newest first).
func FeePaymentsForStudent(ctx context.Context, db *gorm.DB, tenantID, studentID string) ([]*model.FeePayment, error) {
	var payments []models.FeePayment
	if err := db.WithContext(ctx).
		Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
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

// FeePaymentByID returns a single payment (with its fee allocation) by id,
// scoped to the tenant. The model carries StudentID for ownership checks.
func FeePaymentByID(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.FeePayment, error) {
	var p models.FeePayment
	err := db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("Student").Preload("Student.User").
		Preload("StudentFee").Preload("StudentFee.FeeAllocation").
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return feePaymentToModel(p), nil
}

// AdmissionForPDF loads one admission (with patient, clinician, ward, bed, and
// transfers) as the GraphQL model, so the discharge-summary PDF handler reuses
// the same shape the IPD page renders. Scoped to the tenant; cross-tenant ids
// return an error.
func AdmissionForPDF(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.Admission, error) {
	var a models.Admission
	if err := admissionQuery(db.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&a).Error; err != nil {
		return nil, err
	}
	r := &Resolver{DB: db}
	return admissionToModel(a, r.bedNameLookup(ctx, tenantID)), nil
}

// PurchaseOrderForPDF loads one purchase order (with vendor + line items) as
// the GraphQL model so the PO PDF handler renders the same shape the page does.
// Scoped to the tenant; cross-tenant ids return an error.
func PurchaseOrderForPDF(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.PurchaseOrder, error) {
	var p models.PurchaseOrder
	if err := db.WithContext(ctx).
		Preload("Vendor").Preload("Items").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&p).Error; err != nil {
		return nil, err
	}
	return purchaseOrderToModel(p), nil
}

// QuestionPaperForPDF loads one paper with its frozen items, subject and exam
// type as the GraphQL model, so the printed paper matches the on-screen
// preview exactly. Scoped to the tenant; cross-tenant ids return an error.
func QuestionPaperForPDF(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.QuestionPaper, error) {
	paper, err := loadQuestionPaper(ctx, db, tenantID, id)
	if err != nil {
		return nil, err
	}
	m := paperToModel(paper)

	// The header links subject and exam type by id only; the PDF wants their
	// names, so resolve them here rather than widening the model everywhere.
	if paper.SubjectID != "" {
		var subject models.Subject
		if err := db.WithContext(ctx).
			Where("id = ? AND tenant_id = ?", paper.SubjectID, tenantID).
			First(&subject).Error; err == nil {
			m.Subject = subjectToModel(subject)
		}
	}
	if paper.ExamTypeID != "" {
		var examType models.ExamType
		if err := db.WithContext(ctx).
			Where("id = ? AND tenant_id = ?", paper.ExamTypeID, tenantID).
			First(&examType).Error; err == nil {
			m.ExamType = examTypeToModel(examType)
		}
	}
	return m, nil
}

// HallTicketForPDF loads one hall ticket with the student and exam schedule
// the card prints. Scoped to the tenant.
func HallTicketForPDF(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.HallTicket, error) {
	var t models.HallTicket
	if err := db.WithContext(ctx).
		Preload("Student").Preload("Student.User").Preload("Student.Course").
		Preload("ExamSchedule").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&t).Error; err != nil {
		return nil, err
	}
	return hallTicketToModel(t), nil
}

// HallTicketForStudent finds a student's own ticket for one exam schedule —
// the self-service portal download.
func HallTicketForStudent(ctx context.Context, db *gorm.DB, tenantID, studentID, examScheduleID string) (*model.HallTicket, error) {
	var t models.HallTicket
	if err := db.WithContext(ctx).
		Preload("Student").Preload("Student.User").Preload("Student.Course").
		Preload("ExamSchedule").
		Where("tenant_id = ? AND student_id = ? AND exam_schedule_id = ?", tenantID, studentID, examScheduleID).
		First(&t).Error; err != nil {
		return nil, err
	}
	return hallTicketToModel(t), nil
}

// InstallmentLabelsForStudent maps each of a student's installment ids to its
// human label, so receipts can name the installment that was paid.
func InstallmentLabelsForStudent(ctx context.Context, db *gorm.DB, tenantID, studentID string) map[string]string {
	var installments []models.StudentFeeInstallment
	db.WithContext(ctx).
		Joins("JOIN student_fees ON student_fees.id = student_fee_installments.student_fee_id").
		Where("student_fees.tenant_id = ? AND student_fees.student_id = ?", tenantID, studentID).
		Find(&installments)
	labels := make(map[string]string, len(installments))
	for _, in := range installments {
		labels[in.ID] = in.Label
	}
	return labels
}
