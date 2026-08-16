package pgsql

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// SuperUser is the bootstrap role every cluster is created with. The
// application connects as its own unprivileged role instead.
const SuperUser = "postgres"

// Cluster is one initialised data directory this installation owns.
type Cluster struct {
	Install  Install
	DataDir  string
	Port     int
	SuperPwd string
	// RunAs is the OS account the server runs under. PostgreSQL refuses to
	// start as root, so on Unix this is a dedicated service user.
	RunAs string
}

// Initialised reports whether DataDir already holds a cluster.
func (c Cluster) Initialised() bool {
	_, err := os.Stat(filepath.Join(c.DataDir, "PG_VERSION"))
	return err == nil
}

// Init runs initdb, writes a locked-down configuration and leaves the server
// stopped. It is a no-op on an already-initialised directory.
func (c Cluster) Init(ctx context.Context, log Logf) error {
	if c.Initialised() {
		log("Reusing the existing database at %s", c.DataDir)
		return c.writeConf()
	}
	if err := os.MkdirAll(filepath.Dir(c.DataDir), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(c.DataDir, 0o700); err != nil {
		return err
	}
	pwFile := filepath.Join(filepath.Dir(c.DataDir), ".pgpw")
	if err := os.WriteFile(pwFile, []byte(c.SuperPwd), 0o600); err != nil {
		return err
	}
	defer os.Remove(pwFile)

	if c.RunAs != "" {
		if err := chownTree(c.DataDir, c.RunAs); err != nil {
			return err
		}
		if err := chownTree(pwFile, c.RunAs); err != nil {
			return err
		}
	}

	log("Initialising the database cluster...")
	cmd := c.command(ctx, c.Install.Bin("initdb"),
		"-D", c.DataDir,
		"-U", SuperUser,
		"--pwfile="+pwFile,
		"--auth-local=trust",
		"--auth-host=scram-sha-256",
		"-E", "UTF8",
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("initdb: %w\n%s", err, out)
	}
	return c.writeConf()
}

// writeConf appends our overrides. Keeping them in a separate include file
// means a customer's manual edits to postgresql.conf are never clobbered.
func (c Cluster) writeConf() error {
	conf := filepath.Join(c.DataDir, "peepal.conf")
	body := strings.Join([]string{
		"# Managed by Peepal. Edit postgresql.conf for local overrides.",
		"listen_addresses = '127.0.0.1'",
		"port = " + strconv.Itoa(c.Port),
		"max_connections = 100",
		"shared_buffers = 256MB",
		"log_destination = 'stderr'",
		"logging_collector = off",
		"",
	}, "\n")
	if err := os.WriteFile(conf, []byte(body), 0o600); err != nil {
		return err
	}
	main := filepath.Join(c.DataDir, "postgresql.conf")
	existing, err := os.ReadFile(main)
	if err != nil {
		return err
	}
	if !strings.Contains(string(existing), "peepal.conf") {
		f, err := os.OpenFile(main, os.O_APPEND|os.O_WRONLY, 0o600)
		if err != nil {
			return err
		}
		defer f.Close()
		if _, err := f.WriteString("\ninclude 'peepal.conf'\n"); err != nil {
			return err
		}
	}
	if c.RunAs != "" {
		return chownTree(conf, c.RunAs)
	}
	return nil
}

// ServerCommand builds the long-running postgres process for the supervisor.
func (c Cluster) ServerCommand(ctx context.Context) *exec.Cmd {
	return c.command(ctx, c.Install.Bin("postgres"), "-D", c.DataDir, "-p", strconv.Itoa(c.Port))
}

// Ready polls pg_isready until the server accepts connections.
func (c Cluster) Ready(ctx context.Context, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		cmd := exec.CommandContext(ctx, c.Install.Bin("pg_isready"),
			"-h", "127.0.0.1", "-p", strconv.Itoa(c.Port))
		if cmd.Run() == nil {
			return true
		}
		time.Sleep(time.Second)
	}
	return false
}

// EnsureRoleAndDB creates the application role and database if missing. It is
// idempotent, so re-running the installer over an existing cluster is safe.
func (c Cluster) EnsureRoleAndDB(ctx context.Context, user, password, dbName string) error {
	quotedPwd := "'" + strings.ReplaceAll(password, "'", "''") + "'"
	stmts := []string{
		fmt.Sprintf(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '%s') THEN CREATE ROLE %s LOGIN PASSWORD %s; ELSE ALTER ROLE %s LOGIN PASSWORD %s; END IF; END $$;`,
			user, user, quotedPwd, user, quotedPwd),
	}
	for _, s := range stmts {
		if err := c.psql(ctx, "postgres", s); err != nil {
			return err
		}
	}
	exists, err := c.queryBool(ctx, fmt.Sprintf("SELECT 1 FROM pg_database WHERE datname = '%s'", dbName))
	if err != nil {
		return err
	}
	if !exists {
		if err := c.psql(ctx, "postgres", fmt.Sprintf("CREATE DATABASE %s OWNER %s", dbName, user)); err != nil {
			return err
		}
	}
	return c.psql(ctx, dbName, fmt.Sprintf("GRANT ALL ON SCHEMA public TO %s", user))
}

func (c Cluster) psql(ctx context.Context, db, sql string) error {
	cmd := exec.CommandContext(ctx, c.Install.Bin("psql"),
		"-h", "127.0.0.1", "-p", strconv.Itoa(c.Port), "-U", SuperUser, "-d", db,
		"-v", "ON_ERROR_STOP=1", "-q", "-c", sql)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+c.SuperPwd)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("psql: %w\n%s", err, out)
	}
	return nil
}

func (c Cluster) queryBool(ctx context.Context, sql string) (bool, error) {
	cmd := exec.CommandContext(ctx, c.Install.Bin("psql"),
		"-h", "127.0.0.1", "-p", strconv.Itoa(c.Port), "-U", SuperUser, "-d", "postgres",
		"-tAc", sql)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+c.SuperPwd)
	out, err := cmd.Output()
	if err != nil {
		return false, fmt.Errorf("psql query: %w", err)
	}
	return strings.TrimSpace(string(out)) == "1", nil
}

// command builds a child process, dropping privileges on Unix.
func (c Cluster) command(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Env = append(os.Environ(), "PGDATA="+c.DataDir)
	applyCredential(cmd, c.RunAs)
	return cmd
}
