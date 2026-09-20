package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
)

var libraryBooksSchema = &Schema{
	Resource:    "library_books",
	Title:       "Library Books",
	Description: "Add books to the library catalogue in bulk. Each row is one title with its copy count and optional shelf location (rack + shelf). Rows that repeat an ISBN already in the catalogue are rejected, so re-running an upload will not create duplicates.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "title", Label: "Title", Type: FieldString, Required: true,
			Description: "Book title.",
			Example:     "Introduction to Algorithms",
		},
		{
			Name: "author", Label: "Author", Type: FieldString, Required: true,
			Description: "Author name(s).",
			Example:     "Cormen, Leiserson, Rivest, Stein",
		},
		{
			Name: "isbn", Label: "ISBN", Type: FieldString,
			Description: "Optional. ISBN-10 or ISBN-13. When provided it must be unique within your institute — duplicate ISBNs are rejected.",
			Example:     "9780262033848",
		},
		{
			Name: "publisher", Label: "Publisher", Type: FieldString,
			Description: "Optional. Publisher name.",
			Example:     "MIT Press",
		},
		{
			Name: "publish_year", Label: "Publish Year", Type: FieldInt,
			Description: "Optional. Year of publication.",
			Min:         floatPtr(0), Max: floatPtr(3000),
			Example: "2009",
		},
		{
			Name: "category", Label: "Category", Type: FieldString,
			Description: "Optional. Subject or genre.",
			Example:     "Computer Science",
		},
		{
			Name: "total_copies", Label: "Total Copies", Type: FieldInt, Required: true,
			Description: "How many physical copies the library owns.",
			Min:         floatPtr(1),
			Example:     "5",
		},
		{
			Name: "available_copies", Label: "Available Copies", Type: FieldInt,
			Description: "Optional. Copies currently free to issue. Defaults to total copies when left blank.",
			Min:         floatPtr(0),
			Example:     "5",
		},
		{
			Name: "rack", Label: "Rack", Type: FieldString,
			Description: "Optional. Physical rack or aisle label where the book is shelved, for example A3.",
			Example:     "A3",
		},
		{
			Name: "shelf", Label: "Shelf", Type: FieldString,
			Description: "Optional. Shelf within the rack, for example 2.",
			Example:     "2",
		},
	},
	Create: createLibraryBookRow,
}

func createLibraryBookRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	title := strings.TrimSpace(row["title"])
	author := strings.TrimSpace(row["author"])
	if title == "" || author == "" {
		return "", errors.New("title and author are required")
	}

	total := ParseInt(row["total_copies"])
	if total < 1 {
		return "", errors.New("total_copies must be at least 1")
	}

	// Available copies defaults to the full stock unless the row overrides it,
	// and is clamped into the sensible 0..total range.
	available := total
	if raw := strings.TrimSpace(row["available_copies"]); raw != "" {
		available = ParseInt(raw)
		if available < 0 {
			available = 0
		}
		if available > total {
			available = total
		}
	}

	isbn := strings.TrimSpace(row["isbn"])
	if isbn != "" {
		// Reject duplicate ISBNs so re-running an upload does not create copies.
		// Backed by the partial unique index on (tenant_id, isbn) WHERE isbn<>''.
		var existing models.LibraryBook
		if err := database.DB.
			Where("tenant_id = ? AND LOWER(isbn) = LOWER(?)", ctx.TenantID, isbn).
			First(&existing).Error; err == nil {
			return "", errors.New("a book with this ISBN already exists: " + isbn)
		}
	}

	book := models.LibraryBook{
		TenantID:        ctx.TenantID,
		Title:           title,
		Author:          author,
		ISBN:            isbn,
		Publisher:       strings.TrimSpace(row["publisher"]),
		PublishYear:     ParseInt(row["publish_year"]),
		Category:        strings.TrimSpace(row["category"]),
		TotalCopies:     total,
		AvailableCopies: available,
		Rack:            strings.TrimSpace(row["rack"]),
		Shelf:           strings.TrimSpace(row["shelf"]),
	}
	if err := database.DB.Create(&book).Error; err != nil {
		return "", errors.New("could not create book — ISBN may already exist")
	}
	return book.ID, nil
}

func init() { Register(libraryBooksSchema) }
