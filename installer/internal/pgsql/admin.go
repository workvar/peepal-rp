package pgsql

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

var reservedDBNames = map[string]struct{}{
	"postgres":  {},
	"template0": {},
	"template1": {},
}

// ValidDBName reports whether name is a safe unquoted PostgreSQL identifier.
func ValidDBName(name string) bool {
	if name == "" || len(name) > 63 {
		return false
	}
	for i, r := range name {
		switch {
		case r == '_':
		case r >= 'a' && r <= 'z':
		case r >= '0' && r <= '9':
			if i == 0 {
				return false
			}
		default:
			return false
		}
	}
	_, reserved := reservedDBNames[name]
	return !reserved
}

// SuggestNextDBName returns a sibling identifier (peepal → peepal2).
func SuggestNextDBName(existing string) string {
	existing = strings.ToLower(strings.TrimSpace(existing))
	if existing == "" {
		existing = "peepal"
	}
	base := existing
	n := 2
	i := len(existing)
	for i > 0 && existing[i-1] >= '0' && existing[i-1] <= '9' {
		i--
	}
	if i > 0 && i < len(existing) {
		base = existing[:i]
		fmt.Sscanf(existing[i:], "%d", &n)
		n++
	}
	if !identifierChars(base) {
		base = "peepal"
		n = 2
	}
	for {
		cand := fmt.Sprintf("%s%d", base, n)
		if ValidDBName(cand) {
			return cand
		}
		n++
	}
}

func identifierChars(name string) bool {
	if name == "" {
		return false
	}
	for i, r := range name {
		switch {
		case r == '_':
		case r >= 'a' && r <= 'z':
		case r >= '0' && r <= '9':
			if i == 0 {
				return false
			}
		default:
			return false
		}
	}
	return true
}

// UserTableCount is the number of BASE TABLEs in public for dbName.
func (c Cluster) UserTableCount(ctx context.Context, dbName string) (int, error) {
	if !ValidDBName(dbName) {
		return 0, fmt.Errorf("invalid database name %q", dbName)
	}
	s, err := c.queryString(ctx, dbName, `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
	if err != nil {
		return 0, err
	}
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil {
		return 0, fmt.Errorf("table count: %w", err)
	}
	return n, nil
}

// ResetPublicSchema drops every object in public and recreates an empty schema
// owned by owner. The database itself is kept.
func (c Cluster) ResetPublicSchema(ctx context.Context, dbName, owner string) error {
	if !ValidDBName(dbName) || !ValidDBName(owner) {
		return fmt.Errorf("invalid database or role name")
	}
	stmts := []string{
		"DROP SCHEMA public CASCADE",
		"CREATE SCHEMA public",
		fmt.Sprintf("ALTER SCHEMA public OWNER TO %s", owner),
		fmt.Sprintf("GRANT ALL ON SCHEMA public TO %s", owner),
		"GRANT ALL ON SCHEMA public TO public",
	}
	for _, s := range stmts {
		if err := c.psql(ctx, dbName, s); err != nil {
			return err
		}
	}
	return nil
}

// CreateAppDatabase creates dbName owned by owner if it does not exist, then
// grants schema rights.
func (c Cluster) CreateAppDatabase(ctx context.Context, dbName, owner string) error {
	if !ValidDBName(dbName) || !ValidDBName(owner) {
		return fmt.Errorf("invalid database or role name")
	}
	exists, err := c.queryBool(ctx, fmt.Sprintf("SELECT 1 FROM pg_database WHERE datname = '%s'", dbName))
	if err != nil {
		return err
	}
	if !exists {
		if err := c.psql(ctx, "postgres", fmt.Sprintf("CREATE DATABASE %s OWNER %s", dbName, owner)); err != nil {
			return err
		}
	}
	return c.psql(ctx, dbName, fmt.Sprintf("GRANT ALL ON SCHEMA public TO %s", owner))
}

// GrantAppOwnership makes owner the owner of public and every table/sequence
// in it, so a later AutoMigrate can ALTER objects left behind by postgres.
func (c Cluster) GrantAppOwnership(ctx context.Context, dbName, owner string) error {
	if !ValidDBName(dbName) || !ValidDBName(owner) {
		return fmt.Errorf("invalid database or role name")
	}
	sql := fmt.Sprintf(`
DO $$
DECLARE r RECORD;
BEGIN
  EXECUTE 'ALTER SCHEMA public OWNER TO %s';
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO %s';
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
    EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO %s';
  END LOOP;
END $$`, owner, owner, owner)
	if err := c.psql(ctx, dbName, sql); err != nil {
		return err
	}
	return c.psql(ctx, dbName, fmt.Sprintf("GRANT ALL ON SCHEMA public TO %s", owner))
}

func (c Cluster) queryString(ctx context.Context, db, sql string) (string, error) {
	cmd := exec.CommandContext(ctx, c.Install.Bin("psql"),
		append(c.psqlConnArgs(), "-d", db, "-tAc", sql)...)
	c.applyPsqlEnv(cmd)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("psql query: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}
