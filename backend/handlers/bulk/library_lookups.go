package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

// resolveLibraryBook finds a catalogue book within the tenant from a "book"
// cell. Accepts the book UUID, its ISBN, or its exact title (both
// case-insensitive). Returns the full record so callers can check/decrement
// available copies. Mirrors the natural-key lookups in transport_lookups.go.
func resolveLibraryBook(tenantID, value string) (*models.LibraryBook, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("book is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ?", value)
	} else {
		q = q.Where("LOWER(isbn) = LOWER(?) OR LOWER(title) = LOWER(?)", value, value)
	}
	var book models.LibraryBook
	if err := q.First(&book).Error; err != nil {
		return nil, errors.New("library book not found: " + value)
	}
	return &book, nil
}

// resolveStudentUserID maps a "student" cell to the student's linked login user
// ID within the tenant. A library issue is stored against a User, so the bulk
// issuer turns a roll number (or student/user UUID) into that User ID. Accepts
// the student UUID, the student's user UUID, or the roll number.
func resolveStudentUserID(tenantID, value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("student is required")
	}
	q := database.DB.Where("tenant_id = ?", tenantID)
	if isUUID(value) {
		q = q.Where("id = ? OR user_id = ?", value, value)
	} else {
		q = q.Where("LOWER(roll_number) = LOWER(?)", value)
	}
	var student models.Student
	if err := q.First(&student).Error; err != nil {
		return "", errors.New("student not found: " + value)
	}
	return student.UserID, nil
}
