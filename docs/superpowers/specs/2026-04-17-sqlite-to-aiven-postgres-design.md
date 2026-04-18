# Design: SQLite → Aiven PostgreSQL Migration

**Date:** 2026-04-17  
**Status:** Approved  
**Approach:** Option A — GORM driver swap with manual migration gate

---

## Problem

The CollERP backend uses a local SQLite file (`backend/collegeerp.db`) via GORM. This needs to be replaced with an Aiven-managed PostgreSQL instance for cloud persistence.

---

## Constraints

- Keep `DB_PATH` as the env var name (no rename)
- Manual migration control — AutoMigrate must NOT run on every startup
- No new tooling or ORM changes — stay within GORM

---

## Section 1: Dependencies & Config

**`go.mod` changes:**
- Remove: `gorm.io/driver/sqlite`, `github.com/mattn/go-sqlite3`
- Add: `gorm.io/driver/postgres`

**`backend/.env` changes:**
- `DB_PATH=./collegeerp.db` → `DB_PATH=<aiven-postgres-uri>`

**`backend/.env.example` changes:**
- Update to: `DB_PATH=postgres://user:pass@host:port/db?sslmode=require`

**`config/config.go`:** No changes — already reads `DB_PATH` as a string.

---

## Section 2: `database/database.go` changes

- Replace `sqlite.Open(config.App.DBPath)` with `postgres.Open(config.App.DBPath)`
- Remove the `migrate()` call from `Connect()` — no auto-migrate on startup
- Add an exported `Migrate()` function that runs `db.AutoMigrate(...)` on all 40+ models
- Add CLI gate in `main.go`: if `--migrate` flag is present, call `database.Migrate()` then exit; otherwise start the server normally

**Migration workflow:**
- Schema change / first deploy: `./server --migrate`
- Normal startup: `./server`

---

## Section 3: PostgreSQL Compatibility

- GORM's AutoMigrate works across both drivers; no model file changes expected
- Aiven requires `sslmode=require` in the DSN — must be included in the connection string
- Scan all 40+ model files before running `--migrate` to catch any SQLite-isms (implicit bool stored as int, etc.)
- `DATETIME` vs `TIMESTAMP` differences are handled automatically by the GORM Postgres driver

---

## Files Changed

| File | Change |
|------|--------|
| `backend/go.mod` | Swap sqlite → postgres driver |
| `backend/go.sum` | Updated by `go mod tidy` |
| `backend/database/database.go` | New driver, remove auto-migrate from Connect(), add Migrate() |
| `backend/main.go` | Add `--migrate` CLI flag gate |
| `backend/.env` | Update DB_PATH value |
| `backend/.env.example` | Update DB_PATH example |

---

## Out of Scope

- Versioned migration files (golang-migrate) — future work once schema stabilises
- Data migration from existing SQLite file
- ORM replacement (sqlc, pgx)
