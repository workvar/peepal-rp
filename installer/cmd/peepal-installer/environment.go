package main

import (
	"context"
	"os"
	"os/exec"
	"strconv"

	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/llm"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/ui"
	"github.com/peepal/installer/internal/updater"
)

// writeEnvironment produces the backend's configuration. It lives in the data
// directory, which updates never touch, and is copied into the backend
// directory where the server reads it.
func writeEnvironment(l paths.Layout, a answers, m sysinfo.Machine) {
	ui.Step(6, "Writing configuration")

	if envfile.Exists(l.EnvFile()) {
		ui.OK("Keeping the existing configuration at %s", l.EnvFile())
		updater.CopyFile(l.EnvFile(), l.BackendEnv())
		return
	}

	origin := "http://localhost"
	if a.Config.HTTPPort != 80 {
		origin += ":" + strconv.Itoa(a.Config.HTTPPort)
	}

	vars := envfile.Vars{
		"APP_ENV":              "production",
		"PORT":                 strconv.Itoa(a.Config.BackendPort),
		"JWT_SECRET":           envfile.Secret(48),
		"DB_PATH":              a.Config.DSN(),
		"SUPER_ADMIN_EMAIL":    a.AdminEmail,
		"SUPER_ADMIN_PASSWORD": a.AdminPassword,
		"CORS_ORIGINS":         origin,
		// Must stay empty: a Domain attribute is rejected on localhost and
		// silently breaks the login cookie.
		"COOKIE_DOMAIN": "",
	}
	if a.Model != "" {
		vars["OLLAMA_URL"] = llm.DefaultURL
		vars["OLLAMA_MODEL"] = a.Model
	}

	if err := envfile.Write(l.EnvFile(), vars); err != nil {
		ui.Fail("Could not write %s: %v", l.EnvFile(), err)
	}
	if err := updater.CopyFile(l.EnvFile(), l.BackendEnv()); err != nil {
		ui.Fail("Could not write %s: %v", l.BackendEnv(), err)
	}
	sysuser.Chown(l.EnvFile(), sysuser.Account())
	ui.OK("Configuration written (the administrator password is stored only as a hash in the database)")
}

// migrate creates or upgrades the schema and seeds the first accounts. The
// server skips migrations on a normal start, so this has to be explicit.
func migrate(ctx context.Context, l paths.Layout) {
	ui.Info("Preparing the database schema...")
	cmd := exec.CommandContext(ctx, l.BackendBin(), "--migrate")
	cmd.Dir = l.Backend()
	env, err := envfile.Read(l.EnvFile())
	if err != nil {
		ui.Fail("Could not read %s: %v", l.EnvFile(), err)
	}
	cmd.Env = append(os.Environ(), env.Slice()...)
	sysuser.Apply(cmd, sysuser.Account())
	out, err := cmd.CombinedOutput()
	if err != nil {
		ui.Fail("Database migration failed: %v\n%s", err, out)
	}
	ui.OK("Database schema ready")
}
