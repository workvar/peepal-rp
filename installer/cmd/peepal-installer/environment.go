package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"github.com/peepal/installer/internal/envexample"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/llm"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/rpilocal"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/ui"
	"github.com/peepal/installer/internal/updater"
)

// writeEnvironment produces the backend's configuration. It lives in the data
// directory, which updates never touch, and is copied into the backend
// directory where the server reads it.
func writeEnvironment(l paths.Layout, a *answers, m sysinfo.Machine) {
	ui.Step(6, "Writing configuration")

	ensureAgentToken(&a.Config)

	var existing envfile.Vars
	if envfile.Exists(l.EnvFile()) {
		var err error
		existing, err = envfile.Read(l.EnvFile())
		if err != nil {
			ui.Fail("Could not read %s: %v", l.EnvFile(), err)
		}
		ui.Info("Updating configuration at %s (existing values kept)", l.EnvFile())
	}

	vars := buildEnvironment(l, a, m, existing)

	if err := envfile.Write(l.EnvFile(), vars); err != nil {
		ui.Fail("Could not write %s: %v", l.EnvFile(), err)
	}
	if err := updater.CopyFile(l.EnvFile(), l.BackendEnv()); err != nil {
		ui.Fail("Could not write %s: %v", l.BackendEnv(), err)
	}
	sysuser.Chown(l.EnvFile(), sysuser.Account())
	ui.OK("Configuration written (the administrator password is stored only as a hash in the database)")
}

// buildEnvironment walks .env.example when present, otherwise uses the
// hardcoded production defaults. Installer-owned keys are always injected.
func buildEnvironment(l paths.Layout, a *answers, m sysinfo.Machine, existing envfile.Vars) envfile.Vars {
	origin := "http://localhost"
	if a.Config.HTTPPort != 80 {
		origin += ":" + strconv.Itoa(a.Config.HTTPPort)
	}

	examplePath := filepath.Join(l.Backend(), ".env.example")
	vars, walked := walkExample(examplePath, existing, a)
	if !walked {
		vars = hardcodedEnvironment(a, origin)
		// Preserve any existing keys the hardcoded set does not cover.
		for k, v := range existing {
			if _, ok := vars[k]; !ok {
				vars[k] = v
			}
		}
	}

	injectInstallerVars(vars, a, origin)
	return vars
}

func walkExample(examplePath string, existing envfile.Vars, a *answers) (envfile.Vars, bool) {
	f, err := os.Open(examplePath)
	if err != nil {
		return nil, false
	}
	defer f.Close()

	parsed, err := envexample.Parse(f)
	if err != nil || len(parsed) == 0 {
		ui.Warn("Could not parse %s; using built-in defaults", examplePath)
		return nil, false
	}

	ui.Info("Walking %s", examplePath)
	out, err := envexample.Walk(parsed, existing, envAsk(a))
	if err != nil {
		ui.Fail("Configuration walkthrough failed: %v", err)
	}
	return out, true
}

// envAsk prompts for one .env.example variable. Secrets offer generate vs paste.
// When answers already hold SUPER_ADMIN_* from the earlier Settings step, those
// are returned without re-prompting. Unattended mode uses defaults / generates
// secrets without asking.
func envAsk(a *answers) envexample.AskFunc {
	return func(v envexample.Var) (string, error) {
		switch v.Key {
		case "SUPER_ADMIN_EMAIL":
			if a.AdminEmail != "" {
				return a.AdminEmail, nil
			}
		case "SUPER_ADMIN_PASSWORD":
			if a.AdminPassword != "" {
				return a.AdminPassword, nil
			}
		case "RPI_LOCAL_ENABLE":
			if a.RPILocal {
				return "true", nil
			}
			if a.Unattended {
				if v.Default != "" {
					return v.Default, nil
				}
				return "false", nil
			}
			if v.Comment != "" {
				ui.Info("%s", v.Comment)
			}
			if ui.Confirm("Allow sign-in at http://raspberrypi.local (Raspberry Pi / LAN mDNS)?", false) {
				a.RPILocal = true
				return "true", nil
			}
			return "false", nil
		}

		if a.Unattended {
			if v.Secret {
				return "", nil // Walk generates
			}
			return v.Default, nil
		}

		label := v.Key
		kind := "optional"
		if v.Required {
			kind = "required"
		}
		if v.Comment != "" {
			ui.Info("%s", v.Comment)
		}

		if v.Secret {
			if ui.Confirm(fmt.Sprintf("Generate a random value for %s (%s)?", label, kind), true) {
				return "", nil // Walk generates via envfile.Secret
			}
			if v.Required {
				return ui.AskRequired(fmt.Sprintf("Paste value for %s", label)), nil
			}
			return ui.Ask(fmt.Sprintf("Paste value for %s (leave blank to skip)", label), ""), nil
		}

		if v.Required {
			def := v.Default
			if def != "" {
				got := ui.Ask(fmt.Sprintf("%s (%s)", label, kind), def)
				if got == "" {
					return def, nil
				}
				return got, nil
			}
			return ui.AskRequired(fmt.Sprintf("%s (%s)", label, kind)), nil
		}
		return ui.Ask(fmt.Sprintf("%s (%s)", label, kind), v.Default), nil
	}
}

func hardcodedEnvironment(a *answers, origin string) envfile.Vars {
	vars := envfile.Vars{
		"APP_ENV":              "production",
		"PORT":                 strconv.Itoa(a.Config.BackendPort),
		"JWT_SECRET":           envfile.Secret(48),
		"DB_PATH":              a.Config.DSN(),
		"SUPER_ADMIN_EMAIL":    a.AdminEmail,
		"SUPER_ADMIN_PASSWORD": a.AdminPassword,
		"CORS_ORIGINS":         origin,
		"COOKIE_DOMAIN":        "",
		"RPI_LOCAL_ENABLE":     "false",
	}
	if a.RPILocal {
		vars["RPI_LOCAL_ENABLE"] = "true"
	}
	if a.Model != "" {
		vars["OLLAMA_URL"] = llm.DefaultURL
		vars["OLLAMA_MODEL"] = a.Model
	}
	return vars
}

func injectInstallerVars(vars envfile.Vars, a *answers, origin string) {
	vars["APP_ENV"] = "production"
	vars["PORT"] = strconv.Itoa(a.Config.BackendPort)
	vars["DB_PATH"] = a.Config.DSN()
	vars["SUPER_ADMIN_EMAIL"] = a.AdminEmail
	vars["SUPER_ADMIN_PASSWORD"] = a.AdminPassword
	vars["CORS_ORIGINS"] = origin
	vars["PEEPAL_AGENT_URL"] = "http://127.0.0.1:9080"
	vars["PEEPAL_AGENT_TOKEN"] = a.Config.AgentToken
	if a.RPILocal {
		vars["RPI_LOCAL_ENABLE"] = "true"
	}
	rpilocal.Apply(vars, a.Config.HTTPPort)
	a.RPILocal = rpilocal.Enabled(vars["RPI_LOCAL_ENABLE"])
	if a.Model != "" {
		vars["OLLAMA_URL"] = llm.DefaultURL
		vars["OLLAMA_MODEL"] = a.Model
	}
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
