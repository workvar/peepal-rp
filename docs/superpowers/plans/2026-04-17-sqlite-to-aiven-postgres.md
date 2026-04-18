# SQLite → Aiven PostgreSQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local SQLite database with an Aiven-managed PostgreSQL instance, with AutoMigrate gated behind a `--migrate` CLI flag.

**Architecture:** Swap the GORM driver from `sqlite` to `postgres` in `database.go`, remove the `migrate()` call from `Connect()`, expose a new `Migrate()` function, and add a `--migrate` flag check in `main.go` that runs migrations and exits before the server starts.

**Tech Stack:** Go 1.21, GORM v2, `gorm.io/driver/postgres`, Aiven PostgreSQL (SSL required), GoFiber v2

---

### Task 1: Scan model files for PostgreSQL incompatibilities

**Files:**
- Read: `backend/models/*.go` (all model files)

- [ ] **Step 1: Search for any SQLite-specific type usages**

Run from `backend/`:
```bash
grep -rn "sqlite\|AUTOINCREMENT\|INTEGER PRIMARY KEY\|TEXT NOT NULL DEFAULT ''" models/
```
Expected: no matches (GORM uses portable types). If matches found, note them — they will need `gorm:"type:..."` tag fixes before Step 3.

- [ ] **Step 2: Search for raw SQL strings that may be SQLite-specific**

```bash
grep -rn "\.Raw\|\.Exec" handlers/ models/
```
Expected: zero or very few. Review any matches for SQLite syntax (`LIMIT ? OFFSET ?` is fine; `PRAGMA`, `REPLACE INTO` are not).

- [ ] **Step 3: Confirm no issues found or note fixes needed**

If either search returns hits that are SQLite-specific, fix those model tags before proceeding to Task 2. If clean, continue.

- [ ] **Step 4: Commit scan result (note in commit if clean or what was fixed)**

```bash
git add -A
git commit -m "chore: confirm models are postgres-compatible"
```

---

### Task 2: Swap the GORM driver in go.mod

**Files:**
- Modify: `backend/go.mod`
- Modify: `backend/go.sum` (auto-updated)

- [ ] **Step 1: Verify current sqlite dependency**

Run from `backend/`:
```bash
grep sqlite go.mod
```
Expected output:
```
gorm.io/driver/sqlite v1.5.5
```

- [ ] **Step 2: Remove sqlite driver, add postgres driver**

```bash
go get gorm.io/driver/postgres@latest
go get -u gorm.io/gorm
```

- [ ] **Step 3: Drop the sqlite packages**

```bash
go mod edit -droprequire gorm.io/driver/sqlite
go mod edit -droprequire github.com/mattn/go-sqlite3
go mod tidy
```

- [ ] **Step 4: Verify go.mod no longer references sqlite**

```bash
grep -i sqlite go.mod
```
Expected: no output.

- [ ] **Step 5: Verify postgres driver is present**

```bash
grep postgres go.mod
```
Expected:
```
gorm.io/driver/postgres v1.x.x
```

- [ ] **Step 6: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: swap gorm sqlite driver for postgres"
```

---

### Task 3: Rewrite database/database.go

**Files:**
- Modify: `backend/database/database.go`

- [ ] **Step 1: Replace the file contents**

Open `backend/database/database.go` and replace its entire contents with:

```go
package database

import (
	"collegeerp/config"
	"collegeerp/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	var err error
	DB, err = gorm.Open(postgres.Open(config.App.DBPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected.")
}

func Migrate() {
	err := DB.AutoMigrate(
		&models.Tenant{},
		&models.User{},
		&models.Department{},
		&models.Employee{},
		&models.Course{},
		&models.Student{},
		&models.Attendance{},
		&models.AttendanceSettings{},
		&models.Holiday{},
		&models.Mark{},
		&models.Leave{},
		&models.LeaveTypeConfig{},
		&models.LeaveBalance{},
		&models.AcademicYear{},
		&models.Semester{},
		&models.Subject{},
		&models.ExamSchedule{},
		&models.OrgProfile{},
		&models.CustomRole{},
		&models.SalaryStructure{},
		&models.Payroll{},
		&models.PayrollDeduction{},
		&models.FeeCategory{},
		&models.FeeStructure{},
		&models.FeePayment{},
		&models.Announcement{},
		&models.Notification{},
		&models.SubscriptionPlan{},
		&models.TenantSubscription{},
		&models.TimetableSlot{},
		&models.Event{},
		&models.HostelBlock{},
		&models.HostelRoom{},
		&models.HostelAllocation{},
		&models.TransportRoute{},
		&models.TransportVehicle{},
		&models.TransportAllocation{},
		&models.LibraryBook{},
		&models.LibraryIssue{},
	)
	if err != nil {
		log.Fatal("AutoMigrate failed:", err)
	}
	log.Println("Database migrated.")
}
```

- [ ] **Step 2: Verify it compiles (DB_PATH not yet set to postgres — that's fine for a build check)**

```bash
go build ./...
```
Expected: compilation error about `sqlite` import gone — that's correct. If the error is about `postgres` package not found, re-run `go mod tidy` from Task 2.

Expected successful output: no output (Go only prints on error).

- [ ] **Step 3: Commit**

```bash
git add database/database.go
git commit -m "feat: swap database driver to postgres, gate migrate behind Migrate()"
```

---

### Task 4: Add `--migrate` flag to main.go

**Files:**
- Modify: `backend/main.go`

- [ ] **Step 1: Add `os` to the import block**

In `backend/main.go`, the current import block is:
```go
import (
    "collegeerp/config"
    "collegeerp/database"
    "collegeerp/models"
    "collegeerp/routes"
    "collegeerp/utils"
    "log"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
)
```

Replace with:
```go
import (
    "collegeerp/config"
    "collegeerp/database"
    "collegeerp/models"
    "collegeerp/routes"
    "collegeerp/utils"
    "log"
    "os"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
)
```

- [ ] **Step 2: Insert the `--migrate` gate in main() after Connect()**

The current start of `main()` is:
```go
func main() {
    // 1. Load config from .env
    config.Load()

    // 2. Connect to DB and run migrations
    database.Connect()

    // 3. Seed default admin user
    seedAdmin()
```

Replace with:
```go
func main() {
    // 1. Load config from .env
    config.Load()

    // 2. Connect to DB
    database.Connect()

    // 3. Run migrations and exit if --migrate flag is passed
    if len(os.Args) > 1 && os.Args[1] == "--migrate" {
        database.Migrate()
        log.Println("Migration complete. Exiting.")
        return
    }

    // 4. Seed default admin user
    seedAdmin()
```

- [ ] **Step 3: Verify the full file still compiles**

```bash
go build ./...
```
Expected: no output (clean build).

- [ ] **Step 4: Commit**

```bash
git add main.go
git commit -m "feat: add --migrate CLI flag to run schema migrations on demand"
```

---

### Task 5: Update environment files

**Files:**
- Modify: `backend/.env`
- Modify: `backend/.env.example`

- [ ] **Step 1: Update .env with your Aiven connection string**

In `backend/.env`, replace:
```
DB_PATH=./collegeerp.db
```
With your Aiven PostgreSQL URI (must include `sslmode=require`):
```
DB_PATH=postgres://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=require
```

- [ ] **Step 2: Update .env.example**

In `backend/.env.example`, replace the `DB_PATH` line with:
```
DB_PATH=postgres://user:password@host:port/dbname?sslmode=require
```

- [ ] **Step 3: Commit .env.example only — never commit .env**

```bash
git add .env.example
git commit -m "chore: update DB_PATH example for postgres DSN format"
```

---

### Task 6: Run migration and verify

**Files:** none modified

- [ ] **Step 1: Build the server binary**

Run from `backend/`:
```bash
go build -o server .
```
Expected: `server` binary created, no errors.

- [ ] **Step 2: Run the migration against Aiven**

```bash
./server --migrate
```
Expected output:
```
Database connected.
AutoMigrate running...
Database migrated.
Migration complete. Exiting.
```
If `log.Fatal` fires, check: (a) connection string is correct, (b) `sslmode=require` is present, (c) Aiven firewall allows your IP.

- [ ] **Step 3: Start the server normally to verify it boots without migrating**

```bash
./server
```
Expected: server starts, logs `Database connected.` (no migration log), listens on port 3001.

- [ ] **Step 4: Hit the health endpoint**

```bash
curl http://localhost:3001/health
```
Expected:
```json
{"status":"ok"}
```

- [ ] **Step 5: Clean up local binary**

```bash
rm server
```

- [ ] **Step 6: Final commit**

```bash
git add .env.example
git commit -m "chore: remove local sqlite db file from tracking" 
```

Then optionally add `collegeerp.db` to `.gitignore` if not already present:
```bash
echo "collegeerp.db" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore local sqlite db file"
```
