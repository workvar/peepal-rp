package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strconv"
	"strings"
)

var hostelBlocksSchema = &Schema{
	Resource:    "hostel_blocks",
	Title:       "Hostel Blocks",
	Description: "Create hostel blocks in bulk. Each row defines one block with a name, gender type, and number of floors.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name:        "name",
			Label:       "Block Name",
			Type:        FieldString,
			Required:    true,
			Description: "Display name for the block, e.g. Block A or Boys Hostel.",
			Example:     "Block A",
		},
		{
			Name:          "type",
			Label:         "Type",
			Type:          FieldEnum,
			Required:      true,
			AllowedValues: []string{"boys", "girls", "mixed"},
			Description:   "Gender designation for the block.",
			Example:       "boys",
		},
		{
			Name:        "floors",
			Label:       "Floors",
			Type:        FieldInt,
			Required:    true,
			Description: "Number of floors in the block. Must be a positive integer.",
			Example:     "4",
		},
	},
	Create: createHostelBlockRow,
}

func createHostelBlockRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	blockType := strings.ToLower(strings.TrimSpace(row["type"]))
	if blockType == "" {
		return "", errors.New("type is required")
	}

	floorsStr := strings.TrimSpace(row["floors"])
	floors, err := strconv.Atoi(floorsStr)
	if err != nil || floors <= 0 {
		return "", errors.New("floors must be a positive integer")
	}

	// Check for duplicate name within tenant.
	var existing models.HostelBlock
	if err := database.DB.Where("tenant_id = ? AND LOWER(name) = LOWER(?)", ctx.TenantID, name).First(&existing).Error; err == nil {
		return "", errors.New("a block with this name already exists: " + name)
	}

	block := models.HostelBlock{
		TenantID: ctx.TenantID,
		Name:     name,
		Type:     blockType,
		Floors:   floors,
	}

	if err := database.DB.Create(&block).Error; err != nil {
		return "", err
	}
	return block.ID, nil
}

func init() { Register(hostelBlocksSchema) }
