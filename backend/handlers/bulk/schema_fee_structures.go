package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

// Fee structures are course fee variations: each row is one variation of one
// course (e.g. Regular, NRI Quota) with per-year category amounts covering
// the whole course duration.
var feeStructuresSchema = &Schema{
	Resource: "fee_structures",
	Title:    "Fee Structures",
	Description: "Create course fee structures in bulk. Each row is one fee plan for a course - usually one " +
		"\"Base Plan\" per course, plus extra variations (NRI Quota, Merit Scholarship) if you need them.\n\n" +
		"The items column lists category, course year, and amount separated by a semicolon, e.g. " +
		"\"TUITION:1:55000; TUITION:2:55000; LIBRARY:1:1500; REG:1:5000\". Repeat a category for each year it " +
		"applies to. \"CODE:amount\" without a year means year 1 (use this for one-time charges like " +
		"registration or caution deposit).\n\n" +
		"Do NOT put transport, hostel, or mess here - those are optional Add-ons attached to individual " +
		"students from the Student Fees tab, not part of the course structure. Fee categories and the " +
		"course must already exist - identify them by code or name.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "course", Label: "Course", Type: FieldString, Required: true,
			Description: "Course name, code, or UUID. Structures are grouped under this course.",
			Example:     "BTCSE",
		},
		{
			Name: "name", Label: "Variation Name", Type: FieldString, Required: true,
			Description: "Name of this fee plan. Use \"Base Plan\" for the standard fees; add others like \"NRI Quota\" only if needed.",
			Example:     "Base Plan",
		},
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short unique code, stored uppercase. A per-course suffix keeps it unique, e.g. BTCSE-BASE.",
			Example:     "BTCSE-BASE",
		},
		{
			Name: "items", Label: "Items", Type: FieldString, Required: true,
			Description: "CODE:year:amount entries separated by ; - year omitted means year 1. Repeat a category per year.",
			Example:     "TUITION:1:55000; TUITION:2:55000; LIBRARY:1:1500; REG:1:5000",
		},
		{
			Name: "description", Label: "Description", Type: FieldString,
			Description: "Optional note.",
			Example:     "Base fees for the full course duration",
		},
	},
	ExampleRows: [][]string{
		{"BTCSE", "Base Plan", "BTCSE-BASE", "TUITION:1:55000; TUITION:2:55000; TUITION:3:55000; TUITION:4:55000; LIBRARY:1:1500; REG:1:5000; CAUTION:1:10000", "Base fees, full course duration"},
	},
	Create: createFeeStructureRow,
}

func createFeeStructureRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	code := strings.ToUpper(strings.TrimSpace(row["code"]))
	if name == "" || code == "" {
		return "", errors.New("name and code are required")
	}

	var existing models.FeeStructure
	if err := database.DB.
		Where("tenant_id = ? AND code = ?", ctx.TenantID, code).
		First(&existing).Error; err == nil {
		return "", errors.New("a structure with code " + code + " already exists")
	}

	course, err := resolveFeeCourse(ctx.TenantID, row["course"])
	if err != nil {
		return "", err
	}

	items, err := parseStructureItems(ctx.TenantID, row["items"])
	if err != nil {
		return "", err
	}

	fs := models.FeeStructure{
		TenantID:    ctx.TenantID,
		CourseID:    course.ID,
		Name:        name,
		Code:        code,
		Description: strings.TrimSpace(row["description"]),
		IsActive:    true,
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&fs).Error; err != nil {
			return err
		}
		for _, it := range items {
			item := models.FeeStructureItem{
				TenantID:       ctx.TenantID,
				FeeStructureID: fs.ID,
				FeeCategoryID:  it.categoryID,
				YearNumber:     it.yearNumber,
				Amount:         it.amount,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return fs.ID, nil
}

func init() { Register(feeStructuresSchema) }
