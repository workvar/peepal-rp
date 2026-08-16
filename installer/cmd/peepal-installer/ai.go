package main

import (
	"context"

	"github.com/peepal/installer/internal/appconfig"
	"path/filepath"
	"time"

	"github.com/peepal/installer/internal/llm"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/ui"
)

// setupAI installs Ollama and pulls the chosen model. Every failure here is a
// warning, never fatal: the ERP works perfectly well without the assistant.
func setupAI(ctx context.Context, l paths.Layout, a *answers) {
	ui.Step(7, "Local AI assistant")
	if a.Model == "" {
		ui.Info("Skipped. You can enable it later by re-running the installer.")
		return
	}

	managed, err := llm.Install(ctx, filepath.Join(l.Staging(), "cache"), ui.Info)
	if err != nil {
		ui.Warn("Ollama could not be installed: %v", err)
		ui.Warn("Continuing without the AI assistant.")
		return
	}

	if !llm.WaitReady(ctx, llm.DefaultURL, 90*time.Second) {
		ui.Warn("The Ollama service did not start; the AI assistant stays off.")
		return
	}

	if llm.HasModel(ctx, llm.DefaultURL, a.Model) {
		ui.OK("%s is already downloaded", a.Model)
	} else if err := llm.Pull(ctx, a.Model, ui.Info); err != nil {
		ui.Warn("Could not download %s: %v", a.Model, err)
		ui.Warn("Continuing without the AI assistant.")
		return
	}

	a.Config.AI = appconfig.AIConfig{Enabled: true, URL: llm.DefaultURL, Model: a.Model, Managed: managed}
	ui.OK("Ask PeepalAI is ready with %s", a.Model)
}
