package database

import (
	"collegeerp/config"
	"collegeerp/models"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	var err error
	DB, err = gorm.Open(postgres.Open(config.App.DBPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected.")
}

func Migrate() {
	// Open a separate connection with DisableForeignKeyConstraintWhenMigrating
	// to avoid circular FK errors (Employee ↔ SalaryStructure/Payroll).
	migrateDB, err := gorm.Open(postgres.Open(config.App.DBPath), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Info),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to open migration DB connection:", err)
	}
	if sqlDB, err := migrateDB.DB(); err == nil {
		defer sqlDB.Close()
	}

	// One-shot: drop legacy per-employee salary structures table. The system
	// has moved to named SalaryTemplate + SalaryAssignment. Safe to run on
	// every boot — DROP IF EXISTS is a no-op once the table is gone.
	if err := migrateDB.Exec("DROP TABLE IF EXISTS salary_structures").Error; err != nil {
		log.Println("warn: failed to drop legacy salary_structures table:", err)
	}

	// Self-heal: if an earlier run created salary_templates / salary_assignments
	// with an incomplete schema (missing columns), AutoMigrate will *add* new
	// columns but won't rewrite existing ones. That can leave INSERTs failing
	// with NOT NULL violations on columns that were never filled. As a safety
	// net, if a core column is missing on either table, drop it so AutoMigrate
	// below can create it fresh. These tables are new — nothing is lost.
	dropIfMissingColumn(migrateDB, "salary_templates", "name")
	dropIfMissingColumn(migrateDB, "salary_templates", "basic_salary")
	dropIfMissingColumn(migrateDB, "salary_assignments", "template_id")
	dropIfMissingColumn(migrateDB, "salary_assignments", "effective_from")

	// One-shot fee module rebuild (June 2026): the fee model moved from
	// academic-year structures + plans to course-scoped structure variations
	// + frequency-based allocations. The old shapes are incompatible
	// (structures lost academic_year_id and gained a required course_id with
	// per-year items; plans were replaced by allocations; student fees now
	// reference allocations). Drop every fee table except fee_categories so
	// AutoMigrate below recreates them cleanly. DROP IF EXISTS is a no-op on
	// later runs.
	legacyFees := tableExists(migrateDB, "fee_plans") ||
		tableHasColumn(migrateDB, "fee_structures", "academic_year_id") ||
		tableHasColumn(migrateDB, "student_fees", "fee_plan_id")
	if legacyFees {
		for _, t := range []string{
			"fee_payments", "student_fee_installments", "student_fee_discounts",
			"student_fee_add_ons", "student_fees", "fee_plan_assignments",
			"fee_plan_installments", "fee_plan_items", "fee_plans",
			"fee_allocation_installments", "fee_allocations", "fee_add_ons",
			"fee_structure_items", "fee_structures",
		} {
			if err := migrateDB.Exec("DROP TABLE IF EXISTS " + t).Error; err != nil {
				log.Println("warn: failed to drop legacy fee table "+t+":", err)
			}
		}
	}

	err = migrateDB.AutoMigrate(
		&models.Tenant{},
		&models.User{},
		&models.UserRole{},
		&models.RefreshToken{},
		&models.WebAuthnCredential{},
		&models.WebAuthnSession{},
		&models.LoginPIN{},
		&models.PendingLogin{},
		&models.DeviceToken{},
		&models.BrochureContent{},
		&models.Department{},
		&models.Employee{},
		&models.EmployeePaymentDetails{},
		&models.Course{},
		&models.CourseBatch{},
		&models.Student{},
		&models.Patient{},
		&models.Appointment{},
		&models.OPDSlipConfig{},
		&models.Encounter{},
		&models.BillableService{},
		&models.Invoice{},
		&models.InvoiceItem{},
		&models.InvoicePayment{},
		&models.Drug{},
		&models.Dispense{},
		&models.DispenseItem{},
		&models.ClinicianSchedule{},
		&models.DutyRoster{},
		// Diagnostics & inpatient (Phase 3)
		&models.LabTest{},
		&models.LabOrder{},
		&models.LabOrderItem{},
		&models.RadiologyStudy{},
		&models.RadiologyOrder{},
		&models.Ward{},
		&models.Bed{},
		&models.Admission{},
		&models.BedTransfer{},
		// Operations around the core (Phase 4)
		&models.VitalsRecord{},
		&models.MedicationOrder{},
		&models.MedicationAdministration{},
		&models.InsurancePayer{},
		&models.InsuranceClaim{},
		&models.InventoryItem{},
		&models.StockTransaction{},
		// Procurement & pharmacy batches (Phase 2)
		&models.Vendor{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.PurchaseInvoice{},
		&models.DrugBatch{},
		&models.OperationTheatre{},
		&models.SurgerySchedule{},
		&models.TriageCase{},
		// Extended (Phase 5)
		&models.BloodUnit{},
		&models.BloodRequest{},
		&models.Ambulance{},
		&models.AmbulanceTrip{},
		&models.DietPlan{},
		&models.MealServing{},
		&models.TeleConsult{},
		&models.Referral{},
		&models.AuditLog{},
		&models.Attendance{},
		&models.AttendanceSettings{},
		&models.Holiday{},
		&models.CalendarSettings{},
		&models.Mark{},
		&models.Leave{},
		&models.LeaveTypeConfig{},
		&models.LeaveBalance{},
		&models.AcademicYear{},
		&models.Semester{},
		&models.Subject{},
		&models.CurriculumSubject{},
		&models.ExamSchedule{},
		&models.ExamType{},
		&models.QuestionBankItem{},
		&models.QuestionPaper{},
		&models.QuestionPaperItem{},
		&models.HallTicket{},
		&models.GradingScheme{},
		&models.GradeBand{},
		&models.OrgProfile{},
		&models.CustomRole{},
		&models.SystemRole{},
		&models.AccessRule{},
		&models.EmailSettings{},
		&models.EmailTemplate{},
		&models.Invite{},
		&models.SalaryTemplate{},
		&models.SalaryAssignment{},
		&models.Payroll{},
		&models.PayrollDeduction{},
		&models.FeeCategory{},
		&models.FeeStructure{},
		&models.FeeStructureItem{},
		&models.FeeAddOn{},
		&models.FeeAllocation{},
		&models.FeeAllocationInstallment{},
		&models.StudentFee{},
		&models.StudentFeeAddOn{},
		&models.StudentFeeDiscount{},
		&models.StudentFeeInstallment{},
		&models.FeePayment{},
		&models.Announcement{},
		&models.Notification{},
		&models.SubscriptionPlan{},
		&models.TenantSubscription{},
		&models.ModuleCatalog{},
		&models.ModulePageMap{},
		&models.TimetableSlot{},
		&models.Event{},
		&models.EventCategory{},
		&models.RoomClass{},
		// Student life & campus ops (Phase 6)
		&models.StudentAssignment{},
		&models.AssignmentSubmission{},
		&models.MessMenu{},
		&models.MessAttendance{},
		&models.MessExpense{},
		&models.HostelBlock{},
		&models.HostelRoom{},
		&models.HostelAllocation{},
		&models.TransportRoute{},
		&models.TransportVehicle{},
		&models.TransportAllocation{},
		&models.DriverAttendance{},
		&models.LibraryBook{},
		&models.LibraryIssue{},
		// Learning Matrix
		&models.LearningGoal{},
		&models.LearningSection{},
		&models.LearningUnit{},
		&models.LearningAssignment{},
		&models.LearningQuestion{},
		&models.GoalAssignment{},
		&models.EmployeeGoalProgress{},
		&models.UnitProgress{},
		&models.AssignmentProgress{},
		// Approval engine
		&models.ApprovalProcessType{},
		&models.ApprovalFlow{},
		&models.ApprovalStep{},
		&models.ApprovalRequest{},
		&models.ApprovalAction{},
		// Financial accounting (Phase 3): chart of accounts + double-entry ledger
		&models.Account{},
		&models.LedgerBatch{},
		&models.LedgerEntry{},
	)
	if err != nil {
		log.Fatal("AutoMigrate failed:", err)
	}

	// Enforce "one active transport allocation per person" at the DB level.
	// An allocation belongs to either a student or a staff member, so there are
	// two partial unique indexes — one per id column — each scoped to active
	// rows and to non-empty ids (the unused id is stored as ''). Partial
	// indexes let a person be re-allocated once an earlier allocation ends
	// (status flips to 'inactive'). Mirrors the in-resolver guards.
	//
	// Drop the older single-column index from before staff allocations existed;
	// it lacked the '' guard and would collide on the empty student_id that
	// staff allocations carry.
	migrateDB.Exec(`DROP INDEX IF EXISTS idx_transport_alloc_active`)
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_alloc_student_active ` +
			`ON transport_allocations (tenant_id, student_id) WHERE status = 'active' AND student_id <> ''`,
	).Error; err != nil {
		log.Println("warn: could not create transport student allocation index:", err)
	}
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_alloc_employee_active ` +
			`ON transport_allocations (tenant_id, employee_id) WHERE status = 'active' AND employee_id <> ''`,
	).Error; err != nil {
		log.Println("warn: could not create transport employee allocation index:", err)
	}

	// Enforce one catalogue row per ISBN within a tenant, but only when an ISBN
	// is actually provided. Books without an ISBN (older titles, local material)
	// stay unconstrained. Mirrors the partial-index approach used for transport
	// allocations and the dedupe guard in the books bulk uploader.
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_library_book_tenant_isbn ` +
			`ON library_books (tenant_id, isbn) WHERE isbn <> ''`,
	).Error; err != nil {
		log.Println("warn: could not create library book ISBN index:", err)
	}

	// FEFO pick index: dispensing orders a drug's batches by earliest expiry.
	if err := migrateDB.Exec(
		`CREATE INDEX IF NOT EXISTS idx_drugbatch_fefo ` +
			`ON drug_batches (tenant_id, drug_id, expiry_date)`,
	).Error; err != nil {
		log.Println("warn: could not create drug batch FEFO index:", err)
	}

	// Ledger reporting index: account-ledger and trial-balance queries scan
	// entries by tenant + account.
	if err := migrateDB.Exec(
		`CREATE INDEX IF NOT EXISTS idx_ledger_acct_date ` +
			`ON ledger_entries (tenant_id, account_id)`,
	).Error; err != nil {
		log.Println("warn: could not create ledger entry index:", err)
	}
	// Idempotency lookup: the posting helper finds an existing batch by its
	// (tenant, source_type, source_id) provenance before writing.
	if err := migrateDB.Exec(
		`CREATE INDEX IF NOT EXISTS idx_ledger_batch_source ` +
			`ON ledger_batches (tenant_id, source_type, source_id)`,
	).Error; err != nil {
		log.Println("warn: could not create ledger batch source index:", err)
	}

	// Identity modes: some tenants run on Employee ID / Roll Number and only the
	// admin has an email, so a user's email may be blank. Relax the old strict
	// constraints — drop NOT NULL and the full unique index — then enforce
	// uniqueness only for real (non-blank) emails via a partial index. Blank
	// emails are allowed and never collide with each other. Mirrors the
	// partial-index approach used for transport allocations and library ISBNs.
	migrateDB.Exec(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`)
	migrateDB.Exec(`DROP INDEX IF EXISTS idx_user_tenant_email`)
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenant_email ` +
			`ON users (tenant_id, email) WHERE email <> '' AND email IS NOT NULL`,
	).Error; err != nil {
		log.Println("warn: could not create partial user email index:", err)
	}

	// Clean up a stray "uh_id" column: before the Patient.UHID field was pinned
	// to column:uhid, GORM's default naming created "uh_id" on any DB migrated
	// in that window. It was never written to (every insert referenced "uhid"
	// and failed), so dropping it is safe and keeps the table tidy.
	migrateDB.Exec(`ALTER TABLE patients DROP COLUMN IF EXISTS uh_id`)

	// Phase 4: UHID (patients) and CR number (encounters) are unique per
	// tenant when set, but pre-migration rows have a blank value — a plain
	// gorm uniqueIndex would collide across all of them. Partial indexes
	// mirror the transport-allocation / library-ISBN approach above.
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_tenant_uhid ` +
			`ON patients (tenant_id, uhid) WHERE uhid <> ''`,
	).Error; err != nil {
		log.Println("warn: could not create patient UHID index:", err)
	}
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_encounter_tenant_cr ` +
			`ON encounters (tenant_id, cr_number) WHERE cr_number <> ''`,
	).Error; err != nil {
		log.Println("warn: could not create encounter CR number index:", err)
	}

	// Duty roster: prevent double-booking the same person on the same date +
	// start time slot (an employee can't be scheduled for two shifts that
	// start at once). Mirrors the transport allocation partial-index pattern.
	if err := migrateDB.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_emp_slot ` +
			`ON duty_rosters (tenant_id, employee_id, date, start_time)`,
	).Error; err != nil {
		log.Println("warn: could not create duty roster slot index:", err)
	}

	log.Println("Database migrated.")

	// Backfill: assign HOD as manager for all existing students.
	// Runs on every boot but is idempotent — only updates rows where the
	// manager would actually change.
	backfillStudentHODManagers(migrateDB)
}

// backfillStudentHODManagers sets user.manager_id = HOD's user_id for every
// student whose course's department has a head_employee_id set.
// Students in departments without an HOD are left untouched.
func backfillStudentHODManagers(db *gorm.DB) {
	sql := `
UPDATE users u
SET manager_id = e.user_id
FROM students s
JOIN courses c   ON c.id = s.course_id
JOIN departments d ON d.id = c.department_id
JOIN employees e  ON e.id = d.head_employee_id
WHERE u.id = s.user_id
  AND d.head_employee_id IS NOT NULL
  AND (u.manager_id IS DISTINCT FROM e.user_id)
`
	if err := db.Exec(sql).Error; err != nil {
		log.Println("warn: backfillStudentHODManagers:", err)
	} else {
		log.Println("backfillStudentHODManagers: done")
	}
}

// dropIfMissingColumn drops the given table if it exists but is missing the
// expected column. Used as a self-heal step for fresh tables that may have
// been created in an earlier incomplete schema state.
func dropIfMissingColumn(db *gorm.DB, table, column string) {
	// Does the table exist?
	var tableCount int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?`, table,
	).Scan(&tableCount).Error; err != nil {
		return
	}
	if tableCount == 0 {
		return // table doesn't exist — AutoMigrate will create it fresh
	}
	// Does the column exist on that table?
	var colCount int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
		table, column,
	).Scan(&colCount).Error; err != nil {
		return
	}
	if colCount == 0 {
		log.Printf("self-heal: table %q is missing column %q; dropping so AutoMigrate can recreate it", table, column)
		// Table names come from hardcoded call sites, but quote the identifier
		// anyway so this can never become an injection vector.
		if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %q CASCADE", table)).Error; err != nil {
			log.Printf("warn: failed to drop stale %q: %v", table, err)
		}
	}
}

// dropIfHasColumn drops the given table if it exists AND still carries a column
// that the current model no longer defines — the fingerprint of a table left
// over from an older schema. Dropping lets AutoMigrate recreate it cleanly.
func dropIfHasColumn(db *gorm.DB, table, column string) {
	var tableCount int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?`, table,
	).Scan(&tableCount).Error; err != nil {
		return
	}
	if tableCount == 0 {
		return // table doesn't exist — AutoMigrate will create it fresh
	}
	var colCount int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
		table, column,
	).Scan(&colCount).Error; err != nil {
		return
	}
	if colCount > 0 {
		log.Printf("self-heal: table %q has stale column %q; dropping so AutoMigrate can recreate it", table, column)
		if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %q CASCADE", table)).Error; err != nil {
			log.Printf("warn: failed to drop stale %q: %v", table, err)
		}
	}
}

// tableExists reports whether a table is present in the database.
func tableExists(db *gorm.DB, table string) bool {
	var count int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?`, table,
	).Scan(&count).Error; err != nil {
		return false
	}
	return count > 0
}

// tableHasColumn reports whether a table exists and carries the given column.
func tableHasColumn(db *gorm.DB, table, column string) bool {
	if !tableExists(db, table) {
		return false
	}
	var count int64
	if err := db.Raw(
		`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
		table, column,
	).Scan(&count).Error; err != nil {
		return false
	}
	return count > 0
}
