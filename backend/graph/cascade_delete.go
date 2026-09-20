package graph

// Centralised "delete a person and everything attached to them" logic.
// Removing an employee or a student must leave no dangling rows behind: their
// login account, org-hierarchy links (manager + reportees) and every per-person
// record (salary, payroll, fees, marks, hostel, transport, attendance, leaves,
// learning progress, …) are removed together inside one transaction.
//
// Each helper takes an already-open transaction so the caller controls the
// commit/rollback boundary.

import (
	"collegeerp/models"

	"gorm.io/gorm"
)

// deleteEmployeeCascade removes an employee profile and every record that
// references it, then removes the backing login account via deleteUserCascade.
func deleteEmployeeCascade(tx *gorm.DB, tenantID string, emp models.Employee) error {
	// Compensation: payment details, salary assignment, payroll history.
	if err := tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.EmployeePaymentDetails{}).Error; err != nil {
		return err
	}
	if err := tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.SalaryAssignment{}).Error; err != nil {
		return err
	}
	if err := deleteEmployeePayroll(tx, tenantID, emp.ID); err != nil {
		return err
	}

	// Learning-goal progress (+ its per-unit / per-assignment children).
	if err := deleteEmployeeGoalProgress(tx, tenantID, emp.ID); err != nil {
		return err
	}

	// Operational links: transport seat + attendance rows.
	if err := tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.TransportAllocation{}).Error; err != nil {
		return err
	}
	if err := tx.Where("entity_id = ? AND entity_type = ? AND tenant_id = ?", emp.ID, "employee", tenantID).
		Delete(&models.Attendance{}).Error; err != nil {
		return err
	}

	// Detach (don't delete) the things that merely point at this employee: a
	// timetable class loses its teacher; a department loses its HOD.
	if err := tx.Model(&models.TimetableSlot{}).
		Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("employee_id", "").Error; err != nil {
		return err
	}
	if err := tx.Model(&models.Department{}).
		Where("head_employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("head_employee_id", nil).Error; err != nil {
		return err
	}
	// Clinical records survive the clinician leaving — blank the reference so
	// patient history is never destroyed by an HR action.
	if err := tx.Model(&models.Appointment{}).
		Where("clinician_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("clinician_id", "").Error; err != nil {
		return err
	}
	if err := tx.Model(&models.Encounter{}).
		Where("clinician_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("clinician_id", "").Error; err != nil {
		return err
	}
	if err := tx.Where("clinician_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.ClinicianSchedule{}).Error; err != nil {
		return err
	}
	if err := tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.DutyRoster{}).Error; err != nil {
		return err
	}
	// Transport (Phase 6): the driver's day sheets go with them, but the
	// vehicle stays — just unlink the driver so the row keeps its history.
	if err := tx.Where("employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.DriverAttendance{}).Error; err != nil {
		return err
	}
	if err := tx.Model(&models.TransportVehicle{}).
		Where("driver_employee_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("driver_employee_id", "").Error; err != nil {
		return err
	}
	// Coursework (Phase 6): an unpublished draft is the teacher's own working
	// note and goes with them; a published assignment is student-facing and
	// must be reassigned or closed first, so deletion is refused rather than
	// orphaning submissions to a blank teacher.
	if err := guardTeacherAssignments(tx, tenantID, emp.ID); err != nil {
		return err
	}
	// Authored questions outlive their author — a departing teacher must not
	// take the department's question bank with them. Blank the attribution.
	if err := tx.Model(&models.QuestionBankItem{}).
		Where("created_by_id = ? AND tenant_id = ?", emp.ID, tenantID).
		Update("created_by_id", "").Error; err != nil {
		return err
	}

	// The employee profile itself.
	if err := tx.Where("id = ? AND tenant_id = ?", emp.ID, tenantID).
		Delete(&models.Employee{}).Error; err != nil {
		return err
	}

	// The login account + everything keyed by user id (manager link, reportees,
	// leaves, balances, notifications, library issues, invites).
	return deleteUserCascade(tx, tenantID, emp.UserID)
}

// deleteStudentCascade removes a student profile and every record that
// references it, then removes the backing login account via deleteUserCascade.
func deleteStudentCascade(tx *gorm.DB, tenantID string, s models.Student) error {
	// Academic records.
	if err := tx.Where("student_id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.Mark{}).Error; err != nil {
		return err
	}

	// Fees: payments first, then each student-fee with its children.
	if err := deleteStudentFees(tx, tenantID, s.ID); err != nil {
		return err
	}

	// Facilities: free any hostel bed, drop the transport seat.
	if err := freeStudentHostelBeds(tx, tenantID, s.ID); err != nil {
		return err
	}
	if err := tx.Where("student_id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.TransportAllocation{}).Error; err != nil {
		return err
	}

	// Attendance rows.
	if err := tx.Where("entity_id = ? AND entity_type = ? AND tenant_id = ?", s.ID, "student", tenantID).
		Delete(&models.Attendance{}).Error; err != nil {
		return err
	}

	// Exam-cell: hall tickets are per-student admit cards, nothing survives.
	if err := tx.Where("student_id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.HallTicket{}).Error; err != nil {
		return err
	}

	// Student life (Phase 6): own coursework submissions and mess meal marks.
	if err := tx.Where("student_id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.AssignmentSubmission{}).Error; err != nil {
		return err
	}
	if err := tx.Where("student_id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.MessAttendance{}).Error; err != nil {
		return err
	}

	// The student profile itself.
	if err := tx.Where("id = ? AND tenant_id = ?", s.ID, tenantID).
		Delete(&models.Student{}).Error; err != nil {
		return err
	}

	// The login account + everything keyed by user id.
	return deleteUserCascade(tx, tenantID, s.UserID)
}

// deleteEmployeePayroll removes an employee's payroll rows plus the ad-hoc
// deductions attached to each payroll.
func deleteEmployeePayroll(tx *gorm.DB, tenantID, employeeID string) error {
	var payrollIDs []string
	if err := tx.Model(&models.Payroll{}).
		Where("employee_id = ? AND tenant_id = ?", employeeID, tenantID).
		Pluck("id", &payrollIDs).Error; err != nil {
		return err
	}
	if len(payrollIDs) > 0 {
		if err := tx.Where("payroll_id IN ? AND tenant_id = ?", payrollIDs, tenantID).
			Delete(&models.PayrollDeduction{}).Error; err != nil {
			return err
		}
	}
	return tx.Where("employee_id = ? AND tenant_id = ?", employeeID, tenantID).
		Delete(&models.Payroll{}).Error
}

// deleteEmployeeGoalProgress removes an employee's learning-goal progress and
// the per-unit / per-assignment progress rows that hang off it.
func deleteEmployeeGoalProgress(tx *gorm.DB, tenantID, employeeID string) error {
	var progressIDs []string
	if err := tx.Model(&models.EmployeeGoalProgress{}).
		Where("employee_id = ? AND tenant_id = ?", employeeID, tenantID).
		Pluck("id", &progressIDs).Error; err != nil {
		return err
	}
	if len(progressIDs) > 0 {
		if err := tx.Where("employee_goal_progress_id IN ?", progressIDs).
			Delete(&models.UnitProgress{}).Error; err != nil {
			return err
		}
		if err := tx.Where("employee_goal_progress_id IN ?", progressIDs).
			Delete(&models.AssignmentProgress{}).Error; err != nil {
			return err
		}
	}
	return tx.Where("employee_id = ? AND tenant_id = ?", employeeID, tenantID).
		Delete(&models.EmployeeGoalProgress{}).Error
}

// deleteStudentFees removes a student's payments and fee records, including the
// installment / discount / add-on children of each fee.
func deleteStudentFees(tx *gorm.DB, tenantID, studentID string) error {
	// Reverse the GL posting each fee payment created so the books stay
	// consistent when the underlying payment rows are deleted with the person.
	var payIDs []string
	if err := tx.Model(&models.FeePayment{}).
		Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Pluck("id", &payIDs).Error; err != nil {
		return err
	}
	for _, pid := range payIDs {
		if err := reverseBatch(tx, tenantID, models.LedgerSourceFeePayment, pid); err != nil {
			return err
		}
	}
	if err := tx.Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Delete(&models.FeePayment{}).Error; err != nil {
		return err
	}
	var feeIDs []string
	if err := tx.Model(&models.StudentFee{}).
		Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Pluck("id", &feeIDs).Error; err != nil {
		return err
	}
	if len(feeIDs) > 0 {
		if err := tx.Where("student_fee_id IN ?", feeIDs).
			Delete(&models.StudentFeeInstallment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("student_fee_id IN ?", feeIDs).
			Delete(&models.StudentFeeDiscount{}).Error; err != nil {
			return err
		}
		if err := tx.Where("student_fee_id IN ?", feeIDs).
			Delete(&models.StudentFeeAddOn{}).Error; err != nil {
			return err
		}
	}
	return tx.Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Delete(&models.StudentFee{}).Error
}

// freeStudentHostelBeds deletes a student's hostel allocations, decrementing the
// room occupancy counter (and reopening the room) for each active bed, mirroring
// the manual deallocation flow.
func freeStudentHostelBeds(tx *gorm.DB, tenantID, studentID string) error {
	var allocs []models.HostelAllocation
	if err := tx.Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Find(&allocs).Error; err != nil {
		return err
	}
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
	return tx.Where("student_id = ? AND tenant_id = ?", studentID, tenantID).
		Delete(&models.HostelAllocation{}).Error
}

// guardTeacherAssignments handles a departing teacher's coursework (Phase 6).
// Draft assignments are private working notes and are deleted with their
// author; a published or closed assignment is student-facing (and may already
// carry submissions), so deleting the teacher is refused until it is
// reassigned. This mirrors the in-code referential guards used elsewhere,
// since the DB has no foreign keys to lean on.
func guardTeacherAssignments(tx *gorm.DB, tenantID, employeeID string) error {
	var live int64
	if err := tx.Model(&models.StudentAssignment{}).
		Where("teacher_id = ? AND tenant_id = ? AND status <> ?",
			employeeID, tenantID, models.AssignmentDraft).
		Count(&live).Error; err != nil {
		return err
	}
	if live > 0 {
		return GQLErr("this teacher has published assignments; reassign them before deleting")
	}
	return tx.Where("teacher_id = ? AND tenant_id = ?", employeeID, tenantID).
		Delete(&models.StudentAssignment{}).Error
}
