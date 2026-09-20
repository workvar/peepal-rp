package graph

import "collegeerp/graph/model"

// Directory privacy.
//
// The employee directory is readable by any authenticated user (see the
// Employees resolver), so a receptionist can look up a clinician. What a
// directory should NOT expose is the HR record behind it: bank account, PAN,
// PF, home address, date of birth, salary grade.
//
// redactEmployee strips those fields for everyone except an admin and the
// person themselves. What survives is the directory card: name, employee id,
// designation, department, work phone, photo, join date, gender, blood group
// and emergency contact — the columns the Employees page actually renders.

func redactEmployee(e *model.Employee, auth AuthContext, ownerUserID string) *model.Employee {
	if e == nil {
		return nil
	}
	if auth.IsSuperAdmin || auth.Role == roleAdmin || auth.UserID == ownerUserID {
		return e
	}
	e.PaymentDetails = nil
	e.DateOfBirth = nil
	e.PersonalEmail = nil
	e.Address = nil
	e.City = nil
	e.State = nil
	e.Pincode = nil
	e.Nationality = nil
	e.GradeLevel = nil
	e.ProbationEndDate = nil
	e.EmploymentType = nil
	return e
}
