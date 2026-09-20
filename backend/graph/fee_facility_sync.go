package graph

// Bridges the transport / hostel modules with the fee module so a facility
// allocation isn't entered twice. Allocating a bus route or hostel room
// auto-attaches the matching fee add-on (by Kind) to the student's current
// course year; removing/vacating it auto-detaches the unpaid years.
//
// These are best-effort: if no add-on of that kind is configured, or the
// student has no fee record yet, they no-op so the operational action
// (allocation) still succeeds.

import (
	"context"
	"log"
	"strings"

	"collegeerp/models"

	"gorm.io/gorm"
)

// safely runs fn but never lets a panic or failure escape — facility fee sync
// is a convenience layered on top of the operational allocation, so it must
// never block or roll back the allocation itself.
func safely(what string, fn func()) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("fee facility sync (%s) recovered from panic: %v", what, r)
		}
	}()
	fn()
}

// normalizeAddOnKind validates an add-on kind, defaulting blank to "other".
func normalizeAddOnKind(v string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "", models.FeeAddOnOther:
		return models.FeeAddOnOther, nil
	case models.FeeAddOnTransport:
		return models.FeeAddOnTransport, nil
	case models.FeeAddOnHostel:
		return models.FeeAddOnHostel, nil
	}
	return "", GQLErr("kind must be other, transport, or hostel")
}

// currentCourseYear derives the student's 1-based course year from their
// semester and the course's structure (semesters-per-year). Defaults to 1.
func currentCourseYear(student models.Student, course models.Course) int {
	semPerYear := 2
	if course.DurationYears > 0 && course.TotalSemesters > 0 {
		if s := course.TotalSemesters / course.DurationYears; s > 0 {
			semPerYear = s
		}
	}
	if student.Semester <= 0 {
		return 1
	}
	year := (student.Semester + semPerYear - 1) / semPerYear
	if course.DurationYears > 0 && year > course.DurationYears {
		year = course.DurationYears
	}
	if year < 1 {
		year = 1
	}
	return year
}

// activeFacilityAddOn returns the active add-on of the given kind for the
// tenant, or ok=false when none is configured (then auto-attach no-ops).
func (r *Resolver) activeFacilityAddOn(db *gorm.DB, tenantID, kind string) (models.FeeAddOn, bool) {
	var addOn models.FeeAddOn
	if err := db.Where("tenant_id = ? AND kind = ? AND is_active = ?", tenantID, kind, true).
		Order("created_at").First(&addOn).Error; err != nil {
		return addOn, false
	}
	return addOn, true
}

// roomAnnualRate resolves a hostel room's annual charge from its own override,
// its room class, or the legacy monthly fee.
func (r *Resolver) roomAnnualRate(db *gorm.DB, tenantID string, rm models.HostelRoom) float64 {
	n := currentAYSemesterCount(db, tenantID)
	rateType, amount := rm.RateType, rm.RateAmount
	if rateType == "" && rm.RoomClassID != nil {
		var rc models.RoomClass
		if err := db.Where("id = ?", *rm.RoomClassID).First(&rc).Error; err == nil {
			rateType, amount = rc.RateType, rc.RateAmount
		}
	}
	if rateType == "" && amount == 0 {
		rateType, amount = "monthly", rm.MonthlyFee
	}
	_, annual, _ := deriveRates(rateType, amount, n)
	return annual
}

// studentCurrentFees loads the student (with course) and their materialized
// fee records, plus the resolved current course year. Returns ok=false when
// the student has no fee record yet.
func (r *Resolver) studentCurrentFees(db *gorm.DB, tenantID, studentID string) ([]models.StudentFee, int, bool) {
	var student models.Student
	if err := db.Where("id = ? AND tenant_id = ?", studentID, tenantID).
		Preload("Course").First(&student).Error; err != nil {
		return nil, 0, false
	}
	var fees []models.StudentFee
	if err := db.Where("tenant_id = ? AND student_id = ?", tenantID, studentID).Find(&fees).Error; err != nil {
		return nil, 0, false
	}
	if len(fees) == 0 {
		return nil, 0, false
	}
	return fees, currentCourseYear(student, student.Course), true
}

// attachFacilityAddOn attaches the active add-on of `kind` to the student's
// current course year on each of their fee records. amountOverride > 0 wins
// (used for hostel room pricing); otherwise the add-on's per-year amount is
// used. Idempotent: skips years already attached. Best-effort — returns nil
// when nothing is configured so the caller's allocation still succeeds.
// attachFacilityAddOn attaches and returns how many add-on rows it created
// (0 when nothing was configured, already attached, or it failed).
func (r *Resolver) attachFacilityAddOn(tenantID, studentID, kind string, amountOverride float64, createdBy string) int {
	created := 0
	safely("attach "+kind, func() {
		created = r.attachFacilityAddOnInner(tenantID, studentID, kind, amountOverride, createdBy)
	})
	return created
}

func (r *Resolver) attachFacilityAddOnInner(tenantID, studentID, kind string, amountOverride float64, createdBy string) int {
	addOn, ok := r.activeFacilityAddOn(r.DB, tenantID, kind)
	if !ok {
		log.Printf("facility fee sync: no active %q add-on configured — skipping (tenant %s)", kind, tenantID)
		return 0
	}
	fees, year, ok := r.studentCurrentFees(r.DB, tenantID, studentID)
	if !ok {
		log.Printf("facility fee sync: student %s has no fee record yet — skipping %q", studentID, kind)
		return 0
	}
	amount := addOn.AmountPerYear
	if amountOverride > 0 {
		amount = round2(amountOverride)
	}
	created := 0
	for i := range fees {
		sf := fees[i]
		var existing int64
		r.DB.Model(&models.StudentFeeAddOn{}).
			Where("student_fee_id = ? AND fee_add_on_id = ? AND year_number = ?", sf.ID, addOn.ID, year).
			Count(&existing)
		if existing > 0 {
			continue
		}
		err := r.DB.Transaction(func(tx *gorm.DB) error {
			row := models.StudentFeeAddOn{
				TenantID:     tenantID,
				StudentFeeID: sf.ID,
				FeeAddOnID:   addOn.ID,
				YearNumber:   year,
				Amount:       amount,
				CreatedBy:    createdBy,
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
			if err := r.recomputeStudentFee(tx, &sf); err != nil {
				return err
			}
			return r.rebuildPaymentApplication(tx, sf.ID)
		})
		if err != nil {
			log.Printf("facility fee sync: failed attaching %q to student fee %s: %v", kind, sf.ID, err)
			continue
		}
		created++
	}
	return created
}

// detachFacilityAddOn removes the active add-on of `kind` from the student's
// current course year, but only when removing it keeps the net at or above
// what's already been paid (paid years stay billed). Best-effort.
func (r *Resolver) detachFacilityAddOn(tenantID, studentID, kind string) {
	safely("detach "+kind, func() {
		r.detachFacilityAddOnInner(tenantID, studentID, kind)
	})
}

func (r *Resolver) detachFacilityAddOnInner(tenantID, studentID, kind string) {
	addOn, ok := r.activeFacilityAddOn(r.DB, tenantID, kind)
	if !ok {
		return
	}
	fees, year, ok := r.studentCurrentFees(r.DB, tenantID, studentID)
	if !ok {
		return
	}
	for i := range fees {
		sf := fees[i]
		var row models.StudentFeeAddOn
		if err := r.DB.Where("student_fee_id = ? AND fee_add_on_id = ? AND year_number = ?", sf.ID, addOn.ID, year).
			First(&row).Error; err != nil {
			continue
		}
		if round2(sf.NetAmount-row.Amount) < sf.PaidAmount-0.005 {
			continue // already paid into this charge; leave it billed
		}
		_ = r.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Delete(&row).Error; err != nil {
				return err
			}
			if err := r.recomputeStudentFee(tx, &sf); err != nil {
				return err
			}
			return r.rebuildPaymentApplication(tx, sf.ID)
		})
	}
}

// ResyncFacilityFees backfills the transport/hostel add-on onto every student
// who currently holds an active route/room allocation but is missing the fee.
// Use it after defining a transport/hostel add-on, or after allocations made
// before the add-on existed. Returns the number of add-on rows created.
func (r *mutationResolver) ResyncFacilityFees(ctx context.Context) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	total := 0

	var hostelAllocs []models.HostelAllocation
	r.DB.WithContext(ctx).Where("tenant_id = ? AND status = 'active'", auth.TenantID).
		Preload("Room").Preload("Room.Block").Find(&hostelAllocs)
	for _, a := range hostelAllocs {
		if a.StudentID == "" {
			continue
		}
		total += r.attachFacilityAddOn(auth.TenantID, a.StudentID, models.FeeAddOnHostel,
			r.roomAnnualRate(r.DB, auth.TenantID, a.Room), auth.UserID)
	}

	var transportAllocs []models.TransportAllocation
	r.DB.WithContext(ctx).
		Where("tenant_id = ? AND status = 'active' AND alloc_type = 'student'", auth.TenantID).
		Find(&transportAllocs)
	for _, a := range transportAllocs {
		if a.StudentID == "" {
			continue
		}
		total += r.attachFacilityAddOn(auth.TenantID, a.StudentID, models.FeeAddOnTransport, 0, auth.UserID)
	}

	return total, nil
}
