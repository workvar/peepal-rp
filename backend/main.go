package main

import (
	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/routes"
	"collegeerp/utils"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 1. Load config from .env
	config.Load()

	// 2. Connect to DB
	database.Connect()

	// 3. Run migrations only when explicitly requested via `--migrate`
	// (e.g. `go run main.go --migrate`), then seed and exit. Migrations no
	// longer run on normal startup, so a regular `go run main.go` boots the
	// server without touching the schema.
	if len(os.Args) > 1 && os.Args[1] == "--migrate" {
		database.Migrate()
		seedAdmin()
		// Push any changed SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD onto the
		// existing super admin. Gated to --migrate so a normal restart never
		// rewrites a password that was changed from the UI.
		reconcileSuperAdmin()
		// Seed the editable module catalog + page→module mapping from defaults.
		models.SeedModuleConfig(database.DB)
		// Seed the built-in "Education" / "Hospital" plans.
		models.SeedDefaultPlans(database.DB)
		// Backfill per-industry system roles for every existing tenant that has
		// none yet (additive; skips already-seeded tenants).
		if err := models.SeedSystemRolesAll(database.DB); err != nil {
			log.Printf("system role backfill failed: %v", err)
		}
		// Backfill each industry's ready-made custom roles (healthcare gets
		// Receptionist / Doctor / Pharmacist). Additive; never touches a role
		// name the tenant already has.
		if err := models.SeedDefaultRolesAll(database.DB); err != nil {
			log.Printf("default role backfill failed: %v", err)
		}
		// Keep the DB Visualizer's schema.ts in sync with the models that were
		// just migrated. Best-effort: never blocks or fails the migration.
		regenerateDBVisualizerSchema()
		log.Println("Migration complete. Exiting.")
		return
	}

	// One-off normalisation: blank every tenant's module override so orgs fall
	// back to their plan's modules. Earlier builds auto-seeded the override from
	// the tenant vertical; with module gating now enforced that would silently
	// restrict existing orgs. Run once with `go run main.go --clear-seeded-modules`.
	// Kept separate from --migrate so routine migrations never wipe an override a
	// super-admin set on purpose.
	if len(os.Args) > 1 && os.Args[1] == "--clear-seeded-modules" {
		res := database.DB.Model(&models.TenantSubscription{}).
			Where("modules_override <> ?", "").
			Update("modules_override", "")
		if res.Error != nil {
			log.Fatalf("clear-seeded-modules failed: %v", res.Error)
		}
		log.Printf("Cleared module override on %d subscription(s). Exiting.", res.RowsAffected)
		return
	}

	// One-off backfill: assign a UHID to every patient registered before Phase
	// 4 (they were created with a blank UHID). Additive and re-runnable — only
	// touches rows where uhid = ''. Run with `go run main.go --backfill-uhid`.
	if len(os.Args) > 1 && os.Args[1] == "--backfill-uhid" {
		backfillPatientUHIDs()
		log.Println("UHID backfill complete. Exiting.")
		return
	}

	// 4. Seed default admin user
	seedAdmin()

	// Load the super-admin-editable module config into memory (seeds defaults on
	// first run). Gating reads this cache; it falls back to compiled-in defaults
	// if the tables don't exist yet.
	models.InitModuleConfig(database.DB)
	// Seed the built-in "Education" / "Hospital" plans (no-op once they exist).
	models.SeedDefaultPlans(database.DB)

	// 5. Create Fiber app.
	// BodyLimit is sized to comfortably fit the largest bulk-upload chunk
	// the client might send. The CSV itself is gated on the client by
	// bulk.MaxUploadBytes; we leave extra headroom here so a 100-row JSON
	// chunk of a near-max CSV has breathing room.
	app := fiber.New(fiber.Config{
		BodyLimit: 16 * 1024 * 1024, // 16 MiB
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return utils.InternalError(c, err.Error())
		},
	})

	// 6. Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	// CORS: strict origin allowlist from config (CORS_ORIGINS env, comma-separated).
	// AllowCredentials is required for the httpOnly auth cookie; it is incompatible
	// with a wildcard origin, which is another reason "*" must never be used here.
	corsCfg := cors.Config{
		AllowOrigins:     config.App.CORSOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Tenant-ID",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}
	if config.App.RPILocal {
		allowed := config.App.CORSOrigins
		corsCfg.AllowOrigins = ""
		corsCfg.AllowOriginsFunc = func(origin string) bool {
			return config.CORSOriginAllowed(allowed, origin)
		}
	}
	app.Use(cors.New(corsCfg))

	// 7. Register routes
	routes.Register(app)

	// 8. Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	log.Printf("Server starting on port %s", config.App.Port)
	log.Fatal(app.Listen(":" + config.App.Port))
}

// regenerateDBVisualizerSchema re-runs the frontend generator that turns the Go
// models into the DB Visualizer's schema.ts, so it stays in sync after a
// migration. Best-effort: a missing Node or frontend tree only logs a warning
// and never fails the migration. The script resolves its own paths from its
// location, so the working directory does not matter.
func regenerateDBVisualizerSchema() {
	script := findSchemaScript()
	if script == "" {
		log.Println("schema gen: frontend generator not found, skipping schema.ts regen")
		return
	}
	if _, err := exec.LookPath("node"); err != nil {
		log.Println("schema gen: node not on PATH, skipping schema.ts regen")
		return
	}

	out, err := exec.Command("node", script).CombinedOutput()
	if len(out) > 0 {
		log.Printf("schema gen: %s", out)
	}
	if err != nil {
		log.Printf("schema gen: regen failed (non-fatal): %v", err)
		return
	}
	log.Println("schema gen: DB Visualizer schema.ts regenerated.")
}

// findSchemaScript locates the generator relative to common working dirs so it
// works whether the backend is run from backend/ or the repo root.
func findSchemaScript() string {
	rel := filepath.Join("frontend", "scripts", "gen-db-schema.mjs")
	for _, c := range []string{filepath.Join("..", rel), rel} {
		if _, err := os.Stat(c); err == nil {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return ""
}
