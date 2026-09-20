package main

import (
	"strings"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/llm"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/ui"
)

// answers collects everything the rest of the install needs from the operator.
type answers struct {
	Config        appconfig.Config
	AdminEmail    string
	AdminPassword string
	Model         string // empty when the AI assistant is off
	Unattended    bool
}

// ask runs the interactive part. In unattended mode every value comes from
// flags and defaults instead.
func ask(o Options, m sysinfo.Machine) answers {
	ui.Step(2, "Settings")

	cfg := appconfig.Default(o.Dir)
	cfg.HTTPPort = o.HTTPPort
	cfg.DBPassword = envfile.Secret(24)
	cfg.Updates.BackendRepo = repoBackend()
	cfg.Updates.FrontendRepo = repoFrontend()
	cfg.Updates.Channel = channel()

	// Loopback ports only matter when something else already owns them.
	cfg.BackendPort = sysinfo.FirstFreePort(cfg.BackendPort)
	cfg.FrontendPort = sysinfo.FirstFreePort(cfg.FrontendPort)
	cfg.PostgresPort = sysinfo.FirstFreePort(cfg.PostgresPort)

	a := answers{Config: cfg, AdminEmail: o.AdminEmail, AdminPassword: o.AdminPassword, Unattended: o.Unattended}

	if o.Unattended {
		if a.AdminEmail == "" || a.AdminPassword == "" {
			ui.Fail("--unattended needs both --admin-email and --admin-password.")
		}
		a.Model = unattendedModel(o, m)
		ensureAgentToken(&a.Config)
		ui.Info("Unattended install into %s on port %d", cfg.InstallRoot, cfg.HTTPPort)
		return a
	}

	if a.AdminEmail == "" {
		a.AdminEmail = ui.AskRequired("Email address for the first administrator")
	}
	for a.AdminPassword == "" {
		p := ui.AskRequired("Password for that administrator (min 8 characters)")
		if len(p) < 8 {
			ui.Warn("Too short.")
			continue
		}
		a.AdminPassword = p
	}

	ui.Info("")
	ui.Info("Ask PeepalAI answers questions in plain English by running a Llama")
	ui.Info("model on this computer. Nothing is sent to the internet.")
	ui.Info("%s", llm.Explain(m))
	tier, ok := llm.Recommend(m)
	switch {
	case !ok:
		ui.Warn("Skipping the AI assistant on this hardware.")
	case ui.Confirm("Install the local AI assistant ("+tier.Model+", about "+fmtGB(tier.DiskBytes)+" download)?", true):
		a.Model = tier.Model
	}

	a.Config.Updates.Enabled = ui.Confirm("Install new versions automatically when they are released?", true)
	if a.Config.Updates.Enabled {
		if ui.Confirm("Only install updates overnight (02:00-05:00)?", true) {
			a.Config.Updates.WindowStartHour, a.Config.Updates.WindowEndHour = 2, 5
		}
	}
	ensureAgentToken(&a.Config)
	return a
}

func ensureAgentToken(cfg *appconfig.Config) {
	if cfg.AgentToken == "" {
		cfg.AgentToken = envfile.Secret(32)
	}
}

// unattendedModel applies the --ai flag without asking anything.
func unattendedModel(o Options, m sysinfo.Machine) string {
	switch strings.ToLower(o.AI) {
	case "no", "false", "off":
		return ""
	case "yes", "true", "on", "auto", "":
		tier, ok := llm.Recommend(m)
		if !ok {
			if strings.EqualFold(o.AI, "yes") {
				ui.Warn("This machine cannot run a local model; continuing without the AI assistant.")
			}
			return ""
		}
		return tier.Model
	}
	ui.Fail("--ai must be auto, yes or no")
	return ""
}
