package graph

// Fee allocations: applying a course fee structure to students (course,
// batch, or individual) with a one-time, yearly, or semester-wise payment
// schedule. Installments are auto-generated in fee_logic.go.

import (
	"context"
	"errors"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func feeAllocationQuery(db *gorm.DB) *gorm.DB {
	return db.
		Preload("FeeStructure").Preload("FeeStructure.Course").Preload("FeeStructure.Batch").
		Preload("FeeStructure.Items", func(d *gorm.DB) *gorm.DB { return d.Order("year_number, created_at") }).
		Preload("FeeStructure.Items.FeeCategory").
		Preload("Installments", func(d *gorm.DB) *gorm.DB { return d.Order("sequence") })
}

func (r *Resolver) loadFeeAllocation(ctx context.Context, tenantID, id string) (models.FeeAllocation, error) {
	var alloc models.FeeAllocation
	err := feeAllocationQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&alloc).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return alloc, ErrNotFound
	}
	return alloc, err
}

// feeAllocationTargetName resolves the display name of an allocation target.
func (r *Resolver) feeAllocationTargetName(ctx context.Context, a models.FeeAllocation) string {
	switch a.TargetType {
	case models.FeeTargetCourse:
		var c models.Course
		r.DB.WithContext(ctx).Select("name").Where("id = ?", a.TargetID).First(&c)
		return c.Name
	case models.FeeTargetBatch:
		var b models.CourseBatch
		r.DB.WithContext(ctx).Where("id = ?", a.TargetID).First(&b)
		return b.Name
	case models.FeeTargetStudent:
		var s models.Student
		r.DB.WithContext(ctx).Preload("User").Where("id = ?", a.TargetID).First(&s)
		if s.User.ID != "" {
			return s.User.Name
		}
		return s.RollNumber
	}
	return ""
}

// feeAllocationToModelFull attaches the target name and generated-record
// count to a converted allocation.
func (r *Resolver) feeAllocationToModelFull(ctx context.Context, a models.FeeAllocation) *model.FeeAllocation {
	m := feeAllocationToModel(a)
	m.TargetName = r.feeAllocationTargetName(ctx, a)
	var count int64
	r.DB.WithContext(ctx).Model(&models.StudentFee{}).Where("fee_allocation_id = ?", a.ID).Count(&count)
	m.StudentCount = int(count)
	return m
}

// feeAllocationsToModelsBulk converts a list of allocations, resolving target
// names and student-fee counts in bulk. The per-allocation version issues one
// target lookup plus one COUNT each, so a long list became hundreds of
// sequential queries; this collapses that to a handful regardless of list size.
func (r *Resolver) feeAllocationsToModelsBulk(ctx context.Context, allocations []models.FeeAllocation) []*model.FeeAllocation {
	out := make([]*model.FeeAllocation, len(allocations))
	if len(allocations) == 0 {
		return out
	}

	allocIDs := make([]string, 0, len(allocations))
	var courseIDs, batchIDs, studentIDs []string
	for _, a := range allocations {
		allocIDs = append(allocIDs, a.ID)
		switch a.TargetType {
		case models.FeeTargetCourse:
			courseIDs = append(courseIDs, a.TargetID)
		case models.FeeTargetBatch:
			batchIDs = append(batchIDs, a.TargetID)
		case models.FeeTargetStudent:
			studentIDs = append(studentIDs, a.TargetID)
		}
	}

	// One grouped COUNT for all allocations instead of one COUNT each.
	countByAlloc := map[string]int{}
	var countRows []struct {
		FeeAllocationID string
		N               int64
	}
	r.DB.WithContext(ctx).Model(&models.StudentFee{}).
		Select("fee_allocation_id, COUNT(*) AS n").
		Where("fee_allocation_id IN ?", allocIDs).
		Group("fee_allocation_id").Scan(&countRows)
	for _, c := range countRows {
		countByAlloc[c.FeeAllocationID] = int(c.N)
	}

	// One lookup per target type instead of one per allocation.
	courseName := map[string]string{}
	if len(courseIDs) > 0 {
		var cs []models.Course
		r.DB.WithContext(ctx).Select("id, name").Where("id IN ?", courseIDs).Find(&cs)
		for _, c := range cs {
			courseName[c.ID] = c.Name
		}
	}
	batchName := map[string]string{}
	if len(batchIDs) > 0 {
		var bs []models.CourseBatch
		r.DB.WithContext(ctx).Select("id, name").Where("id IN ?", batchIDs).Find(&bs)
		for _, b := range bs {
			batchName[b.ID] = b.Name
		}
	}
	studentName := map[string]string{}
	if len(studentIDs) > 0 {
		var sts []models.Student
		r.DB.WithContext(ctx).Preload("User").Where("id IN ?", studentIDs).Find(&sts)
		for _, st := range sts {
			if st.User.ID != "" {
				studentName[st.ID] = st.User.Name
			} else {
				studentName[st.ID] = st.RollNumber
			}
		}
	}

	for i, a := range allocations {
		m := feeAllocationToModel(a)
		switch a.TargetType {
		case models.FeeTargetCourse:
			m.TargetName = courseName[a.TargetID]
		case models.FeeTargetBatch:
			m.TargetName = batchName[a.TargetID]
		case models.FeeTargetStudent:
			m.TargetName = studentName[a.TargetID]
		}
		m.StudentCount = countByAlloc[a.ID]
		out[i] = m
	}
	return out
}

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) FeeAllocations(ctx context.Context, feeStructureID *string, courseID *string) ([]*model.FeeAllocation, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := feeAllocationQuery(r.DB.WithContext(ctx)).Where("fee_allocations.tenant_id = ?", auth.TenantID)
	if feeStructureID != nil && *feeStructureID != "" {
		q = q.Where("fee_allocations.fee_structure_id = ?", *feeStructureID)
	}
	if courseID != nil && *courseID != "" {
		q = q.Joins("JOIN fee_structures ON fee_structures.id = fee_allocations.fee_structure_id").
			Where("fee_structures.course_id = ?", *courseID)
	}
	var allocations []models.FeeAllocation
	if err := q.Order("fee_allocations.created_at DESC").Find(&allocations).Error; err != nil {
		return nil, err
	}
	return r.feeAllocationsToModelsBulk(ctx, allocations), nil
}

func (r *queryResolver) FeeAllocation(ctx context.Context, id string) (*model.FeeAllocation, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	alloc, err := r.loadFeeAllocation(ctx, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	return r.feeAllocationToModelFull(ctx, alloc), nil
}

// ─── Mutations ────────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateFeeAllocation(ctx context.Context, input model.CreateFeeAllocationInput) (*model.FeeAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var structure models.FeeStructure
	if err := feeStructureQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", input.FeeStructureID, auth.TenantID).
		First(&structure).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, GQLErr("fee structure not found")
		}
		return nil, err
	}
	if !structure.IsActive {
		return nil, GQLErr("structure is inactive")
	}

	var firstDue time.Time
	if input.FirstDueDate != nil && *input.FirstDueDate != "" {
		d, err := time.Parse("2006-01-02", *input.FirstDueDate)
		if err != nil {
			return nil, GQLErr("firstDueDate must be YYYY-MM-DD")
		}
		firstDue = d
	}
	installments, total, err := buildAllocationInstallments(structure, input.Frequency, firstDue, input.Installments)
	if err != nil {
		return nil, err
	}

	name := strVal(input.Name)
	if name == "" {
		name = fmt.Sprintf("%s — %s (%s)", structure.Course.Name, structure.Name, feeFrequencyLabel(input.Frequency))
	}
	alloc := models.FeeAllocation{
		TenantID:       auth.TenantID,
		FeeStructureID: structure.ID,
		Name:           name,
		Frequency:      input.Frequency,
		TargetType:     input.TargetType,
		TargetID:       input.TargetID,
		TotalAmount:    total,
		IsActive:       true,
		CreatedBy:      auth.UserID,
	}
	// Validate the target resolves before persisting anything.
	if _, err := r.resolveAllocationStudents(ctx, auth.TenantID, alloc); err != nil {
		return nil, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&alloc).Error; err != nil {
			return err
		}
		for i := range installments {
			installments[i].FeeAllocationID = alloc.ID
			if err := tx.Create(&installments[i]).Error; err != nil {
				return err
			}
		}
		alloc.Installments = installments
		_, err := r.generateStudentFees(ctx, tx, alloc)
		return err
	})
	if err != nil {
		return nil, err
	}
	return r.Query().FeeAllocation(ctx, alloc.ID)
}

func (r *mutationResolver) UpdateFeeAllocation(ctx context.Context, id string, input model.UpdateFeeAllocationInput) (*model.FeeAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	alloc, err := r.loadFeeAllocation(ctx, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{}
		if input.Name != nil && *input.Name != "" {
			updates["name"] = *input.Name
		}
		if input.IsActive != nil {
			updates["is_active"] = *input.IsActive
		}
		if input.Installments != nil {
			var payments int64
			tx.Model(&models.FeePayment{}).
				Joins("JOIN student_fees ON student_fees.id = fee_payments.student_fee_id").
				Where("student_fees.fee_allocation_id = ? AND fee_payments.status = ?", alloc.ID, "paid").
				Count(&payments)
			if payments > 0 {
				return GQLErr("the schedule is locked because payments exist under this allocation")
			}
			installments, total, err := buildOverrideInstallments(auth.TenantID, alloc.TotalAmount, input.Installments)
			if err != nil {
				return err
			}
			if err := tx.Where("fee_allocation_id = ?", alloc.ID).Delete(&models.FeeAllocationInstallment{}).Error; err != nil {
				return err
			}
			for i := range installments {
				installments[i].FeeAllocationID = alloc.ID
				if err := tx.Create(&installments[i]).Error; err != nil {
					return err
				}
			}
			alloc.Installments = installments
			alloc.TotalAmount = total
			if err := r.resyncUnpaidStudentFees(tx, alloc); err != nil {
				return err
			}
		}
		if len(updates) > 0 {
			if err := tx.Model(&models.FeeAllocation{}).Where("id = ?", alloc.ID).Updates(updates).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.Query().FeeAllocation(ctx, alloc.ID)
}

func (r *mutationResolver) DeleteFeeAllocation(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var alloc models.FeeAllocation
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&alloc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	var paid int64
	r.DB.WithContext(ctx).Model(&models.StudentFee{}).
		Where("fee_allocation_id = ? AND paid_amount > 0", alloc.ID).Count(&paid)
	if paid > 0 {
		return false, GQLErr("allocation has student fees with payments; cancel those payments first")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var fees []models.StudentFee
		if err := tx.Where("fee_allocation_id = ?", alloc.ID).Find(&fees).Error; err != nil {
			return err
		}
		for _, sf := range fees {
			if err := tx.Where("student_fee_id = ?", sf.ID).Delete(&models.StudentFeeInstallment{}).Error; err != nil {
				return err
			}
			if err := tx.Where("student_fee_id = ?", sf.ID).Delete(&models.StudentFeeDiscount{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&sf).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("fee_allocation_id = ?", alloc.ID).Delete(&models.FeeAllocationInstallment{}).Error; err != nil {
			return err
		}
		return tx.Delete(&alloc).Error
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) SyncFeeAllocation(ctx context.Context, id string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	alloc, err := r.loadFeeAllocation(ctx, auth.TenantID, id)
	if err != nil {
		return 0, err
	}
	created := 0
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		n, err := r.generateStudentFees(ctx, tx, alloc)
		created = n
		return err
	})
	if err != nil {
		return 0, err
	}
	return created, nil
}
