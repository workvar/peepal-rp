package graph

import (
	"collegeerp/models"

	"gorm.io/gorm"
)

// hodUserIDForCourse looks up the HOD's user_id for the department that owns
// the given course. Returns empty string if no HOD is set.
func hodUserIDForCourse(db *gorm.DB, tenantID, courseID string) string {
	if courseID == "" {
		return ""
	}
	var course models.Course
	if err := db.Preload("Department").
		Where("id = ? AND tenant_id = ?", courseID, tenantID).
		First(&course).Error; err != nil {
		return ""
	}
	if course.Department.HeadEmployeeID == nil {
		return ""
	}
	var emp models.Employee
	if err := db.Preload("User").
		Where("id = ? AND tenant_id = ?", *course.Department.HeadEmployeeID, tenantID).
		First(&emp).Error; err != nil {
		return ""
	}
	return emp.UserID
}

// assignHODAsManager sets student's user.manager_id to the HOD's user_id.
// If hodUserID is empty, the manager is cleared.
func assignHODAsManager(db *gorm.DB, studentUserID, hodUserID string) {
	updates := map[string]interface{}{}
	if hodUserID != "" {
		updates["manager_id"] = hodUserID
	} else {
		updates["manager_id"] = nil
	}
	db.Model(&models.User{}).Where("id = ?", studentUserID).Updates(updates)
}

// cascadeHODToStudents updates manager_id for all students enrolled in any
// course belonging to the given department. headEmployeeID may be nil to clear.
func cascadeHODToStudents(db *gorm.DB, tenantID, departmentID string, headEmployeeID *string) {
	// Resolve the HOD's user_id (empty string = clear).
	hodUserID := ""
	if headEmployeeID != nil && *headEmployeeID != "" {
		var emp models.Employee
		if err := db.Preload("User").
			Where("id = ? AND tenant_id = ?", *headEmployeeID, tenantID).
			First(&emp).Error; err == nil {
			hodUserID = emp.UserID
		}
	}

	// Find all course IDs in this department.
	var courseIDs []string
	db.Model(&models.Course{}).
		Where("department_id = ? AND tenant_id = ?", departmentID, tenantID).
		Pluck("id", &courseIDs)
	if len(courseIDs) == 0 {
		return
	}

	// Find all student user_ids enrolled in those courses.
	var userIDs []string
	db.Model(&models.Student{}).
		Where("course_id IN ? AND tenant_id = ?", courseIDs, tenantID).
		Pluck("user_id", &userIDs)
	if len(userIDs) == 0 {
		return
	}

	updates := map[string]interface{}{}
	if hodUserID != "" {
		updates["manager_id"] = hodUserID
	} else {
		updates["manager_id"] = nil
	}
	db.Model(&models.User{}).Where("id IN ?", userIDs).Updates(updates)
}
