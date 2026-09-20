package handlers

import (
	"strings"

	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// ─── Module configurator (super-admin) ────────────────────────────────────────
//
// Lets a super-admin manage the coarse subscription modules (the toggles on the
// subscription screen) and map each fine-grained page (access module) onto one
// of them — or to "core" (never gated). Writes refresh the in-memory gating
// cache so changes take effect without a redeploy.

type pageMapping struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Group     string `json:"group"`
	ModuleKey string `json:"module_key"`
}

// GetModuleConfig returns the coarse module catalog, every page with its
// current module assignment, and the vertical quick-fill presets (Education,
// Hospital, ...) offered in the plan creator.
func GetModuleConfig(c *fiber.Ctx) error {
	pages := make([]pageMapping, 0, len(models.AccessModules))
	for _, m := range models.AccessModules {
		pages = append(pages, pageMapping{
			ID:        m.ID,
			Label:     m.Label,
			Group:     m.Group,
			ModuleKey: models.SubscriptionModuleForAccess(m.ID),
		})
	}
	return utils.OK(c, fiber.Map{
		"modules": models.ModuleCatalogList(),
		"pages":   pages,
		"presets": models.ModulePresetList(),
	}, "")
}

// SetModulePageMapping assigns a page to a coarse module (or "" for core).
func SetModulePageMapping(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, ok := models.ModuleByID(id); !ok {
		return utils.BadRequest(c, "Unknown page: "+id)
	}
	var body struct {
		ModuleKey string `json:"module_key"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	key := strings.TrimSpace(body.ModuleKey)
	// Allowed values: "" (core), the unassigned-buffer sentinel, or a real
	// catalog key. The sentinel is intentionally not a catalog key, so gating
	// keeps such pages hidden from tenants until they're mapped.
	if key != "" && key != models.ModuleKeyUnassigned && !models.ModuleCatalogHasKey(key) {
		return utils.BadRequest(c, "Unknown module: "+key)
	}

	db := database.DB.WithContext(c.Context())
	res := db.Model(&models.ModulePageMap{}).
		Where("access_module_id = ?", id).
		Update("module_key", key)
	if res.Error != nil {
		return utils.InternalError(c, "Failed to save mapping")
	}
	if res.RowsAffected == 0 {
		if err := db.Create(&models.ModulePageMap{AccessModuleID: id, ModuleKey: key}).Error; err != nil {
			return utils.InternalError(c, "Failed to save mapping")
		}
	}
	models.RefreshModuleConfig(database.DB)
	return utils.OK(c, fiber.Map{"id": id, "module_key": key}, "Mapping updated")
}

// CreateModuleCatalog adds a new coarse subscription module.
func CreateModuleCatalog(c *fiber.Ctx) error {
	var body struct {
		Label string `json:"label"`
		Key   string `json:"key"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	label := strings.TrimSpace(body.Label)
	if label == "" {
		return utils.BadRequest(c, "Label is required")
	}
	key := slugifyModuleKey(body.Key)
	if key == "" {
		key = slugifyModuleKey(label)
	}
	if key == "" {
		return utils.BadRequest(c, "Could not derive a valid module key from the label")
	}
	if models.ModuleCatalogHasKey(key) {
		return utils.BadRequest(c, "A module with key '"+key+"' already exists")
	}

	var count int64
	database.DB.Model(&models.ModuleCatalog{}).Count(&count)
	m := models.ModuleCatalog{Key: key, Label: label, Sort: int(count)}
	if err := database.DB.WithContext(c.Context()).Create(&m).Error; err != nil {
		return utils.InternalError(c, "Failed to create module")
	}
	models.RefreshModuleConfig(database.DB)
	return utils.Created(c, m, "Module created")
}

// UpdateModuleCatalog renames a module's label (the key is immutable so existing
// plan/subscription module lists stay valid).
func UpdateModuleCatalog(c *fiber.Ctx) error {
	key := c.Params("key")
	var m models.ModuleCatalog
	if err := database.DB.WithContext(c.Context()).First(&m, "key = ?", key).Error; err != nil {
		return utils.NotFound(c, "Module not found")
	}
	var body struct {
		Label string `json:"label"`
		Sort  *int   `json:"sort"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if l := strings.TrimSpace(body.Label); l != "" {
		m.Label = l
	}
	if body.Sort != nil {
		m.Sort = *body.Sort
	}
	if err := database.DB.WithContext(c.Context()).Save(&m).Error; err != nil {
		return utils.InternalError(c, "Failed to save module")
	}
	models.RefreshModuleConfig(database.DB)
	return utils.OK(c, m, "Module updated")
}

// DeleteModuleCatalog removes a coarse module and resets any pages mapped to it
// back to core. Existing plan/subscription CSVs may still list the key; it
// simply stops gating anything once no page maps to it.
func DeleteModuleCatalog(c *fiber.Ctx) error {
	key := c.Params("key")
	db := database.DB.WithContext(c.Context())
	if err := db.Model(&models.ModulePageMap{}).Where("module_key = ?", key).Update("module_key", "").Error; err != nil {
		return utils.InternalError(c, "Failed to update page mappings")
	}
	if err := db.Delete(&models.ModuleCatalog{}, "key = ?", key).Error; err != nil {
		return utils.InternalError(c, "Failed to delete module")
	}
	models.RefreshModuleConfig(database.DB)
	return utils.OK(c, nil, "Module deleted")
}

// slugifyModuleKey lowercases a string and reduces it to [a-z0-9-] for use as a
// stable module key (collapsing runs of separators into single dashes).
func slugifyModuleKey(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevDash = false
		case r == ' ' || r == '-' || r == '_':
			if !prevDash && b.Len() > 0 {
				b.WriteRune('-')
				prevDash = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}
