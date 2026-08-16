package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/service"
	"github.com/peepal/installer/internal/telemetry"
)

// RunHeadless is the service entry point: the same controller as the window
// uses, without the window. It blocks until the service manager stops it.
func (a *App) RunHeadless() error {
	if a.loadErr != "" {
		return fmt.Errorf("%s", a.loadErr)
	}
	if !a.installed() {
		return fmt.Errorf("no completed installation at %s; run the panel first", a.layout.Root)
	}
	logx.ToFile(a.layout.AgentLog())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	a.ctx = ctx
	a.attach()
	if err := a.ctl.Start(ctx); err != nil {
		return err
	}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	select {
	case s := <-sig:
		logx.Infof("received %s; shutting down", s)
	case <-ctx.Done():
	}

	stop, done := context.WithTimeout(context.Background(), 45*time.Second)
	defer done()
	a.ctl.Hub.Send(telemetry.Event{Kind: telemetry.Lifecycle, Message: "service stopping"})
	return a.ctl.Stop(stop)
}

// serviceInstalled reports whether the OS already runs this application, so
// the panel attaches to it rather than starting a competing copy.
func serviceInstalled() bool {
	mgr, err := service.For()
	if err != nil {
		return false
	}
	return mgr.Installed()
}

// InstallService registers the background service from the panel, for an
// operator who skipped it during setup.
func (a *App) InstallService() string {
	mgr, err := service.For()
	if err != nil {
		return err.Error()
	}
	exe, err := os.Executable()
	if err != nil {
		return err.Error()
	}
	a.mu.RLock()
	spec, layout := a.spec, a.layout
	a.mu.RUnlock()

	def := service.Definition{
		DisplayName: spec.App.DisplayName,
		Description: spec.App.Description,
		ExecPath:    exe,
		Args:        []string{"-headless", "-config", layout.SpecFile()},
		WorkingDir:  layout.Root,
	}
	// The panel's own copy has to stand down first, or two processes fight
	// for the front-door port.
	if a.ctl != nil && a.ctl.Running() {
		a.ctl.Stop(context.Background())
	}
	if err := mgr.Install(def); err != nil {
		return err.Error()
	}
	if err := mgr.Start(); err != nil {
		return err.Error()
	}
	return ""
}

// RemoveService unregisters the background service, leaving the files alone.
func (a *App) RemoveService() string {
	mgr, err := service.For()
	if err != nil {
		return err.Error()
	}
	mgr.Stop()
	if err := mgr.Uninstall(); err != nil {
		return err.Error()
	}
	return ""
}

// ServiceStatus is what the panel's service card shows.
func (a *App) ServiceStatus() map[string]any {
	mgr, err := service.For()
	if err != nil {
		return map[string]any{"supported": false, "error": err.Error()}
	}
	return map[string]any{
		"supported": true,
		"installed": mgr.Installed(),
		"commands":  mgr.Describe(),
	}
}
