package graph

import (
	"context"
	"errors"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Queries ───────────────────────────────────────────────────────────────────

func (r *queryResolver) HostelBlocks(ctx context.Context) ([]*model.HostelBlock, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var blocks []models.HostelBlock
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Order("name asc").Find(&blocks).Error; err != nil {
		return nil, err
	}
	out := make([]*model.HostelBlock, len(blocks))
	for i, b := range blocks {
		out[i] = hostelBlockToModel(b)
	}
	return out, nil
}

func (r *queryResolver) HostelRooms(ctx context.Context, blockID *string) ([]*model.HostelRoom, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).Preload("Block").Preload("RoomClass")
	if blockID != nil && *blockID != "" {
		q = q.Where("block_id = ?", *blockID)
	}
	var rooms []models.HostelRoom
	if err := q.Order("block_id, room_number asc").Find(&rooms).Error; err != nil {
		return nil, err
	}
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	out := make([]*model.HostelRoom, len(rooms))
	for i, rm := range rooms {
		out[i] = hostelRoomToModel(rm, n)
	}
	return out, nil
}

func (r *queryResolver) HostelAllocations(ctx context.Context, status *string) ([]*model.HostelAllocation, error) {
	// Cross-student allocation list: hostel office roles only.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("Student").Preload("Student.User").Preload("Room").Preload("Room.Block").Preload("Room.RoomClass")
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var allocs []models.HostelAllocation
	if err := q.Order("alloc_date desc").Find(&allocs).Error; err != nil {
		return nil, err
	}
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	out := make([]*model.HostelAllocation, len(allocs))
	for i, a := range allocs {
		out[i] = hostelAllocationToModel(a, n)
	}
	return out, nil
}

// ── Mutations ─────────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateHostelBlock(ctx context.Context, input model.CreateHostelBlockInput) (*model.HostelBlock, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Name == "" || input.Type == "" || input.Floors == 0 {
		return nil, GQLErr("name, type, and floors are required")
	}
	b := models.HostelBlock{
		TenantID: auth.TenantID,
		Name:     input.Name,
		Type:     input.Type,
		Floors:   input.Floors,
	}
	if err := r.DB.Create(&b).Error; err != nil {
		return nil, err
	}
	return hostelBlockToModel(b), nil
}

func (r *mutationResolver) BulkDeleteHostelBlocks(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	res := r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.HostelBlock{})
	return int(res.RowsAffected), res.Error
}

func (r *mutationResolver) BulkDeleteHostelRooms(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	var n int64
	err = r.DB.Transaction(func(tx *gorm.DB) error {
		// Remove allocations for these rooms first so none are left dangling.
		if err := tx.Where("tenant_id = ? AND room_id IN ?", auth.TenantID, ids).
			Delete(&models.HostelAllocation{}).Error; err != nil {
			return err
		}
		res := tx.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.HostelRoom{})
		n = res.RowsAffected
		return res.Error
	})
	return int(n), err
}

func (r *mutationResolver) BulkDeleteHostelAllocations(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	var n int64
	err = r.DB.Transaction(func(tx *gorm.DB) error {
		var allocs []models.HostelAllocation
		if err := tx.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Find(&allocs).Error; err != nil {
			return err
		}
		// Free a bed for every active allocation being deleted.
		for _, a := range allocs {
			if a.Status != "active" {
				continue
			}
			var rm models.HostelRoom
			if err := tx.Where("id = ?", a.RoomID).First(&rm).Error; err != nil {
				continue
			}
			if rm.Occupied > 0 {
				rm.Occupied--
			}
			if rm.Occupied < rm.Capacity {
				rm.Status = "available"
			}
			tx.Save(&rm)
		}
		res := tx.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.HostelAllocation{})
		n = res.RowsAffected
		return res.Error
	})
	return int(n), err
}

func (r *mutationResolver) CreateHostelRoom(ctx context.Context, input model.CreateHostelRoomInput) (*model.HostelRoom, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var block models.HostelBlock
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.BlockID, auth.TenantID).First(&block).Error; err != nil {
		return nil, GQLErr("hostel block not found")
	}
	// One room number per block, to avoid confusing duplicates.
	var dup models.HostelRoom
	if err := r.DB.Where("tenant_id = ? AND block_id = ? AND room_number = ?", auth.TenantID, input.BlockID, input.RoomNumber).
		First(&dup).Error; err == nil {
		return nil, GQLErr("room " + input.RoomNumber + " already exists in this block")
	}
	floor := 0
	if input.Floor != nil {
		floor = *input.Floor
	}
	roomType := "single"
	if input.RoomType != nil {
		roomType = *input.RoomType
	}
	rm := models.HostelRoom{
		TenantID:   auth.TenantID,
		BlockID:    input.BlockID,
		RoomNumber: input.RoomNumber,
		Floor:      floor,
		Capacity:   input.Capacity,
		Occupied:   0,
		RoomType:   roomType,
		Status:     "available",
		MonthlyFee: input.MonthlyFee,
	}
	if input.RoomClassID != nil && *input.RoomClassID != "" {
		rm.RoomClassID = input.RoomClassID
	}
	if input.RateType != nil {
		rm.RateType = normalizeRateType(*input.RateType)
	}
	if input.RateAmount != nil {
		rm.RateAmount = *input.RateAmount
	}
	if err := r.DB.Create(&rm).Error; err != nil {
		return nil, err
	}
	_ = block
	r.DB.Preload("Block").Preload("RoomClass").First(&rm, "id = ?", rm.ID)
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return hostelRoomToModel(rm, n), nil
}

func (r *mutationResolver) UpdateHostelRoom(ctx context.Context, id string, input model.UpdateHostelRoomInput) (*model.HostelRoom, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var rm models.HostelRoom
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&rm).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.RoomNumber != nil {
		var dup models.HostelRoom
		if err := r.DB.Where("tenant_id = ? AND block_id = ? AND room_number = ? AND id <> ?", auth.TenantID, rm.BlockID, *input.RoomNumber, rm.ID).
			First(&dup).Error; err == nil {
			return nil, GQLErr("room " + *input.RoomNumber + " already exists in this block")
		}
		rm.RoomNumber = *input.RoomNumber
	}
	if input.Floor != nil {
		rm.Floor = *input.Floor
	}
	if input.Capacity != nil && *input.Capacity > 0 {
		rm.Capacity = *input.Capacity
	}
	if input.RoomType != nil {
		rm.RoomType = *input.RoomType
	}
	if input.Status != nil {
		rm.Status = *input.Status
	}
	if input.MonthlyFee != nil && *input.MonthlyFee > 0 {
		rm.MonthlyFee = *input.MonthlyFee
	}
	if input.RoomClassID != nil {
		if *input.RoomClassID == "" {
			rm.RoomClassID = nil
		} else {
			rm.RoomClassID = input.RoomClassID
		}
	}
	if input.RateType != nil {
		rm.RateType = normalizeRateType(*input.RateType)
	}
	if input.RateAmount != nil {
		rm.RateAmount = *input.RateAmount
	}
	if err := r.DB.Save(&rm).Error; err != nil {
		return nil, err
	}
	r.DB.Preload("Block").Preload("RoomClass").First(&rm, "id = ?", id)
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return hostelRoomToModel(rm, n), nil
}

func (r *mutationResolver) AllocateHostelRoom(ctx context.Context, input model.AllocateHostelRoomInput) (*model.HostelAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var student models.Student
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.StudentID, auth.TenantID).
		Preload("User").First(&student).Error; err != nil {
		return nil, GQLErr("student not found")
	}
	var rm models.HostelRoom
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.RoomID, auth.TenantID).
		Preload("Block").First(&rm).Error; err != nil {
		return nil, GQLErr("hostel room not found")
	}
	if rm.Occupied >= rm.Capacity {
		return nil, GQLErr("room is full")
	}
	// Gender eligibility: a boys block takes only male students, a girls block
	// only female; mixed/co-ed blocks take anyone.
	if !genderAllowedInBlock(rm.Block.Type, student.Gender) {
		return nil, GQLErr(blockGenderError(rm.Block.Type))
	}
	allocDate, err := time.Parse("2006-01-02", input.AllocDate)
	if err != nil {
		return nil, GQLErr("invalid alloc_date — use YYYY-MM-DD")
	}
	// Check existing active allocation.
	var existing models.HostelAllocation
	if err := r.DB.Where("tenant_id = ? AND student_id = ? AND status = 'active'", auth.TenantID, input.StudentID).
		First(&existing).Error; err == nil {
		return nil, GQLErr("student already has an active hostel allocation")
	}
	// Resolve the bed slot: use the requested bed if free, else the lowest free
	// bed in the room. Active allocations hold their bed numbers.
	var activeBeds []models.HostelAllocation
	r.DB.Where("tenant_id = ? AND room_id = ? AND status = 'active'", auth.TenantID, input.RoomID).Find(&activeBeds)
	taken := map[int]bool{}
	for _, b := range activeBeds {
		if b.BedNumber > 0 {
			taken[b.BedNumber] = true
		}
	}
	bed := 0
	if input.BedNumber != nil && *input.BedNumber > 0 {
		if *input.BedNumber > rm.Capacity {
			return nil, GQLErr("bed number is beyond the room's capacity")
		}
		if taken[*input.BedNumber] {
			return nil, GQLErr("that bed is already taken")
		}
		bed = *input.BedNumber
	} else {
		for i := 1; i <= rm.Capacity; i++ {
			if !taken[i] {
				bed = i
				break
			}
		}
	}
	if bed == 0 {
		return nil, GQLErr("no free bed in this room")
	}
	alloc := models.HostelAllocation{
		TenantID:  auth.TenantID,
		StudentID: input.StudentID,
		RoomID:    input.RoomID,
		BedNumber: bed,
		AllocDate: allocDate,
		Status:    "active",
	}
	if err := r.DB.Create(&alloc).Error; err != nil {
		return nil, err
	}
	rm.Occupied++
	if rm.Occupied >= rm.Capacity {
		rm.Status = "full"
	}
	r.DB.Save(&rm)
	alloc.Student = student
	alloc.Room = rm
	// Seamless fees: auto-attach the hostel add-on to the student's current
	// course year, priced from the allocated room's annual rate.
	r.attachFacilityAddOn(auth.TenantID, input.StudentID, models.FeeAddOnHostel, r.roomAnnualRate(r.DB, auth.TenantID, rm), auth.UserID)
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return hostelAllocationToModel(alloc, n), nil
}

func (r *mutationResolver) VacateHostelRoom(ctx context.Context, id string, input model.VacateHostelRoomInput) (*model.HostelAllocation, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var alloc models.HostelAllocation
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&alloc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	vacateDate, err := time.Parse("2006-01-02", input.VacateDate)
	if err != nil {
		return nil, GQLErr(fmt.Sprintf("invalid vacate_date: %v", err))
	}
	alloc.VacateDate = &vacateDate
	alloc.Status = "vacated"
	if err := r.DB.Save(&alloc).Error; err != nil {
		return nil, err
	}
	var rm models.HostelRoom
	if err := r.DB.Where("id = ?", alloc.RoomID).First(&rm).Error; err == nil {
		if rm.Occupied > 0 {
			rm.Occupied--
		}
		if rm.Occupied < rm.Capacity {
			rm.Status = "available"
		}
		r.DB.Save(&rm)
	}
	// Seamless fees: detach the hostel add-on for unpaid current-year fees.
	r.detachFacilityAddOn(auth.TenantID, alloc.StudentID, models.FeeAddOnHostel)
	r.DB.Preload("Student").Preload("Room").Preload("Room.Block").Preload("Room.RoomClass").First(&alloc, "id = ?", id)
	n := currentAYSemesterCount(r.DB, auth.TenantID)
	return hostelAllocationToModel(alloc, n), nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func hostelBlockToModel(b models.HostelBlock) *model.HostelBlock {
	return &model.HostelBlock{ID: b.ID, Name: b.Name, Type: b.Type, Floors: b.Floors}
}

func hostelRoomToModel(rm models.HostelRoom, n int) *model.HostelRoom {
	rateType, amount := roomEffectiveBase(rm)
	sem, ann, mon := deriveRates(rateType, amount, n)
	m := &model.HostelRoom{
		ID:                rm.ID,
		BlockID:           rm.BlockID,
		RoomNumber:        rm.RoomNumber,
		Floor:             rm.Floor,
		Capacity:          rm.Capacity,
		Occupied:          rm.Occupied,
		RoomType:          rm.RoomType,
		Status:            rm.Status,
		MonthlyFee:        rm.MonthlyFee,
		RoomClassID:       rm.RoomClassID,
		EffectiveRateType: rateType,
		SemesterRate:      sem,
		AnnualRate:        ann,
		MonthlyRate:       mon,
	}
	if rm.RateType != "" {
		rt := rm.RateType
		amt := rm.RateAmount
		m.RateType = &rt
		m.RateAmount = &amt
	}
	if rm.RoomClass != nil && rm.RoomClass.ID != "" {
		m.RoomClass = roomClassToModel(*rm.RoomClass, n)
	}
	if rm.Block.ID != "" {
		m.Block = hostelBlockToModel(rm.Block)
	}
	return m
}

// roomEffectiveBase resolves which (rateType, amount) actually applies to a
// room: a per-room override wins, else the linked class rate, else the legacy
// monthly fee.
func roomEffectiveBase(rm models.HostelRoom) (string, float64) {
	if rm.RateType != "" {
		return rm.RateType, rm.RateAmount
	}
	if rm.RoomClass != nil && rm.RoomClass.ID != "" {
		return rm.RoomClass.RateType, rm.RoomClass.RateAmount
	}
	return "monthly", rm.MonthlyFee
}

func hostelAllocationToModel(a models.HostelAllocation, n int) *model.HostelAllocation {
	m := &model.HostelAllocation{
		ID:        a.ID,
		StudentID: a.StudentID,
		RoomID:    a.RoomID,
		BedNumber: a.BedNumber,
		AllocDate: a.AllocDate.Format("2006-01-02"),
		Status:    a.Status,
	}
	if a.VacateDate != nil {
		s := a.VacateDate.Format("2006-01-02")
		m.VacateDate = &s
	}
	if a.Student.ID != "" {
		m.Student = studentToModel(a.Student)
	}
	if a.Room.ID != "" {
		m.Room = hostelRoomToModel(a.Room, n)
	}
	return m
}
