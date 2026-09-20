package bulk

import (
	"errors"
	"time"

	"collegeerp/database"
	"collegeerp/models"
)

var libraryIssuesSchema = &Schema{
	Resource:    "library_issues",
	Title:       "Library Issues (Issued Books)",
	Description: "Record issued (lent-out) books in bulk. Each row lends one book to one student until a due date. The book is matched by ISBN or title and the borrower by Student ID (roll number). A row is rejected if the book has no free copies or the student already holds that same book unreturned. Each successful row reduces the book's available copies by one.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "book", Label: "Book (ISBN or Title)", Type: FieldString, Required: true,
			Description: "ISBN (preferred) or the exact title of the book being issued.",
			Example:     "9780262033848",
		},
		{
			Name: "student", Label: "Student (Roll No.)", Type: FieldString, Required: true,
			Description: "Student ID / roll number of the borrower, for example CS2021001.",
			Example:     "CS2021001",
		},
		{
			Name: "due_date", Label: "Due Date", Type: FieldDate, Required: true,
			Description: "Date the book must be returned, formatted YYYY-MM-DD.",
			Example:     "2026-06-30",
		},
		{
			Name: "issue_date", Label: "Issue Date", Type: FieldDate,
			Description: "Optional. Date the book was issued, formatted YYYY-MM-DD. Defaults to today.",
			Example:     "2026-06-09",
		},
	},
	Create: createLibraryIssueRow,
}

func createLibraryIssueRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	book, err := resolveLibraryBook(ctx.TenantID, row["book"])
	if err != nil {
		return "", err
	}
	if book.AvailableCopies <= 0 {
		return "", errors.New("no available copies of: " + book.Title)
	}

	userID, err := resolveStudentUserID(ctx.TenantID, row["student"])
	if err != nil {
		return "", err
	}

	dueDate := ParseDate(row["due_date"])
	if dueDate.IsZero() {
		return "", errors.New("due_date is required (YYYY-MM-DD)")
	}
	issueDate := ParseDate(row["issue_date"])
	if issueDate.IsZero() {
		issueDate = time.Now()
	}

	// Don't issue the same title twice to a borrower who hasn't returned it.
	var dup models.LibraryIssue
	if err := database.DB.
		Where("tenant_id = ? AND book_id = ? AND user_id = ? AND status = 'issued'", ctx.TenantID, book.ID, userID).
		First(&dup).Error; err == nil {
		return "", errors.New("this borrower already has '" + book.Title + "' issued and unreturned")
	}

	issue := models.LibraryIssue{
		TenantID:  ctx.TenantID,
		BookID:    book.ID,
		UserID:    userID,
		IssueDate: issueDate,
		DueDate:   dueDate,
		Status:    "issued",
	}
	if err := database.DB.Create(&issue).Error; err != nil {
		return "", err
	}

	// Reduce stock by one, mirroring the IssueLibraryBook GraphQL resolver.
	book.AvailableCopies--
	if err := database.DB.Save(book).Error; err != nil {
		return "", err
	}

	return issue.ID, nil
}

func init() { Register(libraryIssuesSchema) }
