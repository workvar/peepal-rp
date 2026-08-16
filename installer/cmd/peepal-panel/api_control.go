package main

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/buildinfo"
	"github.com/peepal/installer/internal/control"
	"github.com/peepal/installer/internal/runner"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/telemetry"
	"github.com/peepal/installer/internal/vcs"
)

// Dashboard is the whole first screen in one call, so the interface polls one
// endpoint rather than six.
type Dashboard struct {
	App string `json:"app"`
	// Version is the panel's own version; Release is the version of the
	// application it is running, which is what an operator is asked for on
	// a support call.
	Version      string             `json:"version"`
	Release      string             `json:"release"`
	ReleaseDate  string             `json:"release_date"`
	Track        string             `json:"track"`
	Installed    bool               `json:"installed"`
	Running      bool               `json:"running"`
	Busy         string             `json:"busy"`
	State        runstate.Snapshot  `json:"state"`
	PublicURL    string             `json:"public_url"`
	LANURL       string             `json:"lan_url"`
	Root         string             `json:"root"`
	Data         string             `json:"data"`
	Services     []runner.Health    `json:"services"`
	Metrics      *telemetry.Metrics `json:"metrics"`
	Repos        []vcs.Checkout     `json:"repos"`
	Pending      []control.Pending  `json:"pending"`
	Telemetry    telemetry.Stats    `json:"telemetry"`
	LastError    string             `json:"last_error"`
	LastUpdate   time.Time          `json:"last_update"`
	ServiceOwned bool               `json:"service_owned"`
	UptimeText   string             `json:"uptime"`
}

// GetDashboard is polled by the interface every few seconds.
func (a *App) GetDashboard() Dashboard {
	a.mu.RLock()
	spec, layout, ctl, busy := a.spec, a.layout, a.ctl, a.busy
	a.mu.RUnlock()

	st := appstate.Load(layout.StateFile())
	d := Dashboard{
		App: spec.App.DisplayName, Version: buildinfo.Version,
		Installed: a.installed(), Busy: busy,
		PublicURL: a.publicURL(), LANURL: a.LocalAddress(),
		Root: layout.Root, Data: layout.Data,
		LastError: st.LastError, LastUpdate: st.LastUpdate,
		ServiceOwned: a.serviceOwnsStack(),
	}
	if ctl == nil {
		return d
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	d.Running = ctl.Running()
	d.State = ctl.State.Get()
	d.Services = ctl.Runner.Check(ctx)
	d.Metrics = ctl.Metrics(ctx)
	d.Repos = ctl.Checkouts(ctx)
	d.Track = or(spec.Updates.Track, "release")
	if primary := spec.Primary().Name; primary != "" {
		for _, ck := range d.Repos {
			if ck.Dir == layout.RepoDir(spec.Primary()) {
				d.Release, d.ReleaseDate = ck.Version, ck.Date
			}
		}
	}
	d.Telemetry = ctl.Hub.Stats()
	d.UptimeText = humanDuration(ctl.Uptime())
	return d
}

// StartStack brings the application up.
func (a *App) StartStack() string {
	return a.wrap("start", func(ctl *control.Controller) error {
		return ctl.Start(a.ctx)
	})
}

// StopStack takes it down, leaving the panel open.
func (a *App) StopStack() string {
	return a.wrap("stop", func(ctl *control.Controller) error {
		return ctl.Stop(context.Background())
	})
}

// RestartService restarts one service, or all of them when name is empty.
func (a *App) RestartService(name string) string {
	return a.wrap("restart", func(ctl *control.Controller) error {
		return ctl.RestartService(a.ctx, name)
	})
}

// CheckUpdates asks each remote whether there is newer code.
func (a *App) CheckUpdates() []control.Pending {
	ctl := a.controller()
	if ctl == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pending, err := ctl.CheckUpdates(ctx)
	if err != nil {
		a.emit("panel:toast", err.Error())
	}
	return pending
}

// ApplyUpdate pulls, rebuilds and restarts, streaming its log to the panel.
func (a *App) ApplyUpdate() string {
	return a.wrapLong("update", func(ctl *control.Controller) (string, error) {
		return ctl.ApplyUpdate(context.Background())
	})
}

// Rebuild re-runs the build steps against the current checkouts.
func (a *App) Rebuild() string {
	return a.wrapLong("rebuild", func(ctl *control.Controller) (string, error) {
		return ctl.Rebuild(context.Background())
	})
}

// Logs returns the tail of the agent log for the panel's log view.
func (a *App) Logs(lines int) string {
	ctl := a.controller()
	if ctl == nil {
		return "(the application is not configured yet)"
	}
	out, err := ctl.Logs(lines)
	if err != nil {
		return err.Error()
	}
	return out
}

// Environment returns every service's settings with secrets masked.
func (a *App) Environment() string {
	ctl := a.controller()
	if ctl == nil {
		return ""
	}
	out, _ := ctl.RedactedEnv()
	return out
}

// OpenApp launches the operator's browser at the application.
func (a *App) OpenApp() string { return openBrowser(a.publicURL()) }

// OpenFolder shows a directory in the platform's file manager, which is how
// an operator gets to the logs without a terminal.
func (a *App) OpenFolder(which string) string {
	a.mu.RLock()
	l := a.layout
	a.mu.RUnlock()
	switch which {
	case "logs":
		return openPath(l.Logs())
	case "data":
		return openPath(l.Data)
	case "src":
		return openPath(l.Src())
	}
	return openPath(l.Root)
}

func (a *App) controller() *control.Controller {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.ctl
}

// wrap runs a short action, guarding against two at once.
func (a *App) wrap(name string, fn func(*control.Controller) error) string {
	ctl := a.controller()
	if ctl == nil {
		return "the application is not installed yet"
	}
	if err := a.claim(name); err != "" {
		return err
	}
	defer a.release()
	if err := fn(ctl); err != nil {
		return err.Error()
	}
	return ""
}

// wrapLong runs a slow action in the foreground and emits its output.
func (a *App) wrapLong(name string, fn func(*control.Controller) (string, error)) string {
	ctl := a.controller()
	if ctl == nil {
		return "the application is not installed yet"
	}
	if err := a.claim(name); err != "" {
		return err
	}
	defer a.release()
	out, err := fn(ctl)
	a.emit("panel:output", out)
	if err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) claim(name string) string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.busy != "" {
		return "another action (" + a.busy + ") is still running"
	}
	a.busy = name
	return ""
}

func (a *App) release() {
	a.mu.Lock()
	a.busy = ""
	a.mu.Unlock()
}

// openBrowser and openPath use the platform's own opener; there is no
// cross-platform way that is shorter than this switch.
func openBrowser(url string) string { return spawn(openerArgs(url)) }

func openPath(path string) string { return spawn(openerArgs(path)) }

func openerArgs(target string) []string {
	switch runtime.GOOS {
	case "windows":
		return []string{"rundll32", "url.dll,FileProtocolHandler", target}
	case "darwin":
		return []string{"open", target}
	default:
		return []string{"xdg-open", target}
	}
}

func spawn(argv []string) string {
	if err := exec.Command(argv[0], argv[1:]...).Start(); err != nil {
		return err.Error()
	}
	return ""
}

func humanDuration(d time.Duration) string {
	if d <= 0 {
		return "-"
	}
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	case d < 48*time.Hour:
		return fmt.Sprintf("%dh %dm", int(d.Hours()), int(d.Minutes())%60)
	}
	return fmt.Sprintf("%dd %dh", int(d.Hours())/24, int(d.Hours())%24)
}

func hostPlatform() string { return runtime.GOOS }

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
