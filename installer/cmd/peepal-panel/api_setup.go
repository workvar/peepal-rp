package main

import (
	"context"
	"fmt"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/dbsetup"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/routing"
	"github.com/peepal/installer/internal/setup"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/toolchain"
	"github.com/peepal/installer/internal/workspace"
	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// SetupContext is everything the wizard needs to draw its first screen.
type SetupContext struct {
	Installed   bool               `json:"installed"`
	Error       string             `json:"error"`
	App         appdef.App         `json:"app"`
	Repos       []appdef.Repo      `json:"repos"`
	Database    appdef.Database    `json:"database"`
	Routing     appdef.Routing     `json:"routing"`
	Monitoring  appdef.Monitoring  `json:"monitoring"`
	Prompts     []appdef.EnvVar    `json:"prompts"`
	Tools       []toolchain.Status `json:"tools"`
	Machine     string             `json:"machine"`
	IsAdmin     bool               `json:"is_admin"`
	Elevate     string             `json:"elevate_hint"`
	DefaultRoot string             `json:"default_root"`
	SpecPath    string             `json:"spec_path"`
	PostgresOK  bool               `json:"postgres_present"`
	Phases      []string           `json:"phases"`
	// NeedsToken is true when the repository is private and nothing has
	// supplied a credential yet, so the wizard must ask for one.
	NeedsToken bool   `json:"needs_token"`
	RepoURL    string `json:"repo_url"`
	AuthMethod string `json:"auth_method"`
	Track      string `json:"track"`
}

// GetSetupContext is the wizard's first call.
func (a *App) GetSetupContext() SetupContext {
	a.mu.RLock()
	spec, layout, loadErr := a.spec, a.layout, a.loadErr
	a.mu.RUnlock()

	c := SetupContext{
		Installed: a.installed(), Error: loadErr,
		App: spec.App, Repos: spec.Repos, Database: spec.Database,
		Routing: spec.Routing, Monitoring: spec.Monitoring,
		Tools:       toolchain.Check(spec.Toolchain),
		Machine:     sysinfo.Detect().String(),
		IsAdmin:     sysinfo.IsAdmin(),
		Elevate:     sysinfo.ElevationHint(),
		DefaultRoot: layout.Root,
		SpecPath:    a.SpecPath(),
	}
	_, c.PostgresOK = pgsql.Locate(layout.PgRoot())
	c.NeedsToken = setup.NeedsToken(spec)
	c.RepoURL = spec.Primary().URL
	c.AuthMethod = spec.Auth.Method
	c.Track = spec.Updates.Track
	for _, ev := range spec.Env {
		if ev.Prompt != "" {
			c.Prompts = append(c.Prompts, ev)
		}
	}
	for _, p := range setup.Phases {
		c.Phases = append(c.Phases, p.Title())
	}
	return c
}

// CheckDatabaseURI validates and probes a cloud connection string before the
// operator commits to it.
func (a *App) CheckDatabaseURI(uri string) string {
	if err := dbsetup.ValidateURI(uri); err != nil {
		return err.Error()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := dbsetup.Reachable(ctx, uri, 5*time.Second); err != nil {
		return err.Error()
	}
	return ""
}

// CheckRepoToken tells the operator whether a token works before the install
// spends ten minutes on prerequisites and then fails at the clone.
func (a *App) CheckRepoToken(token string) string {
	a.mu.RLock()
	url := a.spec.Primary().URL
	a.mu.RUnlock()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	return setup.CheckToken(ctx, url, token)
}

// CheckDomain validates a hostname before it is written into the environment.
func (a *App) CheckDomain(domain string) string {
	if err := routing.ValidateDomain(domain); err != nil {
		return err.Error()
	}
	return ""
}

// SuggestPort finds a free front-door port when the preferred one is taken.
func (a *App) SuggestPort(preferred int) int {
	if preferred > 0 && sysinfo.PortFree(preferred) {
		return preferred
	}
	return sysinfo.FirstFreePort(8080)
}

// LocalAddress is shown on the finished screen so an operator can reach the
// app from another machine.
func (a *App) LocalAddress() string { return routing.LocalAddress() }

// RunSetup performs the installation. Progress is pushed to the interface as
// "setup:progress" events; the call returns when the install finishes.
func (a *App) RunSetup(ans setup.Answers) string {
	a.mu.Lock()
	if a.busy != "" {
		busy := a.busy
		a.mu.Unlock()
		return "busy: " + busy
	}
	a.busy = "install"
	spec := a.spec
	a.mu.Unlock()
	defer func() {
		a.mu.Lock()
		a.busy = ""
		a.mu.Unlock()
	}()

	res, err := setup.Run(a.ctx, spec, ans, func(u setup.Update) {
		if u.Line != "" {
			logx.Infof("[setup] %s", u.Line)
		}
		a.emit("setup:progress", u)
	})
	if err != nil {
		return err.Error()
	}

	a.mu.Lock()
	a.spec, a.layout = res.Spec, res.Layout
	a.mu.Unlock()

	a.attach()
	if err := a.ctl.Start(a.ctx); err != nil {
		return fmt.Sprintf("installed, but the application did not start: %v", err)
	}
	return ""
}

// cluster rebuilds the database handle for an existing install, so the panel
// can supervise a local PostgreSQL after a restart.
func (a *App) cluster() *pgsql.Cluster {
	if !a.spec.NeedsDatabase() {
		return nil
	}
	install, ok := pgsql.Locate(a.layout.PgRoot())
	if !ok || !install.Managed {
		return nil
	}
	return &pgsql.Cluster{
		Install: install,
		DataDir: a.layout.PgData(),
		Port:    a.spec.Database.Port,
		RunAs:   a.spec.App.ServiceUser,
	}
}

// emit sends an event to the interface, tolerating a not-yet-ready window.
func (a *App) emit(name string, data any) {
	if a.ctx == nil {
		return
	}
	wruntime.EventsEmit(a.ctx, name, data)
}

// layoutFor is used by the tests and by the headless path.
func layoutFor(spec appdef.Spec) workspace.Layout { return workspace.For(spec) }
