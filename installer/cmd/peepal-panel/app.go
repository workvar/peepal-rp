package main

import (
	"context"
	"fmt"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/buildinfo"
	"github.com/peepal/installer/internal/control"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/toolchain"
	"github.com/peepal/installer/internal/workspace"
)

// App is the object Wails binds: every exported method becomes callable from
// the interface. It holds the definition, the resolved layout and, once the
// stack is up, the controller.
type App struct {
	ctx        context.Context
	configPath string

	mu     sync.RWMutex
	spec   appdef.Spec
	layout workspace.Layout
	ctl    *control.Controller
	// loadErr explains why the panel is showing an error screen instead of
	// the dashboard.
	loadErr string
	busy    string
}

// NewApp resolves the definition but starts nothing.
func NewApp(configPath string) *App {
	a := &App{configPath: configPath}
	a.load()
	return a
}

// load finds and parses the app definition. A missing file is not fatal: the
// panel shows the error and offers to open a different one.
func (a *App) load() {
	path, err := appdef.Discover(a.configPath, "")
	if err != nil {
		a.loadErr = err.Error()
		return
	}
	spec, err := appdef.Load(path)
	if err != nil {
		a.loadErr = err.Error()
		return
	}
	layout := workspace.For(spec)

	// A previous install keeps its own copy of the definition, including the
	// operator's answers; prefer that one.
	if installed, err := appdef.Load(layout.SpecFile()); err == nil {
		spec = installed
		layout = workspace.For(spec)
	}
	a.configPath = path
	a.spec, a.layout, a.loadErr = spec, layout, ""
	logx.ToFile(layout.AgentLog())
}

// WindowTitle names the window after the product being managed.
func (a *App) WindowTitle() string {
	if a.spec.App.DisplayName == "" {
		return "Control Panel"
	}
	return a.spec.App.DisplayName + " Control Panel"
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	logx.Infof("panel %s started", buildinfo.Version)
	// An installation that is already set up should be running: attach to it
	// so the dashboard has something to show immediately.
	if a.installed() {
		a.attach()
		if !a.serviceOwnsStack() {
			if err := a.ctl.Start(ctx); err != nil {
				logx.Errorf("could not start the stack: %v", err)
			}
		}
	}
}

func (a *App) shutdown(ctx context.Context) {
	// The stack keeps running when a service owns it; closing the window is
	// not a request to take the ERP down.
	if a.ctl != nil && !a.serviceOwnsStack() {
		a.ctl.Stop(context.Background())
	}
}

// attach builds the controller for the current definition.
func (a *App) attach() {
	a.mu.Lock()
	defer a.mu.Unlock()
	dirs := toolchain.Dirs{Node: a.layout.NodeDir(), Go: a.layout.GoDir(), Cache: a.layout.Cache()}
	a.ctl = control.New(control.Options{
		Spec:        a.spec,
		Layout:      a.layout,
		Vars:        a.vars(),
		Cluster:     a.cluster(),
		PathEntries: toolchain.PathEntries(dirs),
		Version:     buildinfo.Version,
	})
}

// vars rebuilds the template variables from the persisted definition, so an
// action taken months after setup expands paths the same way setup did.
func (a *App) vars() appdef.Vars {
	return appdef.Vars{
		appdef.VarRoot:       a.layout.Root,
		appdef.VarData:       a.layout.Data,
		appdef.VarSrc:        a.layout.Src(),
		appdef.VarUploads:    a.layout.Uploads(),
		appdef.VarAppName:    a.spec.App.Name,
		appdef.VarNodeBin:    a.layout.NodeDir(),
		appdef.VarGoBin:      a.layout.GoDir(),
		appdef.VarServiceUsr: a.spec.App.ServiceUser,
		appdef.VarDomain:     a.spec.Routing.Domain,
		appdef.VarHTTPPort:   fmt.Sprint(a.spec.Routing.HTTPPort),
		appdef.VarPublicURL:  a.publicURL(),
		appdef.VarPlatform:   hostPlatform(),
		appdef.VarExe:        exeSuffix(),
		appdef.VarDatabase:   "", // read from the env file, never re-derived
	}
}

// exeSuffix mirrors the one in setup, so a template expands the same way
// after a restart as it did during installation.
func exeSuffix() string {
	if runtime.GOOS == "windows" {
		return ".exe"
	}
	return ""
}

func (a *App) installed() bool {
	return a.loadErr == "" && appstate.Load(a.layout.StateFile()).Setup
}

// serviceOwnsStack reports whether a registered OS service is already running
// the application, in which case the panel must not start a second copy.
func (a *App) serviceOwnsStack() bool {
	return serviceInstalled()
}

func (a *App) publicURL() string {
	scheme := "http"
	if a.spec.Routing.TLS {
		scheme = "https"
	}
	host := a.spec.Routing.Domain
	if host == "" {
		host = "localhost"
	}
	if a.spec.Routing.HTTPPort == 80 || a.spec.Routing.HTTPPort == 443 {
		return scheme + "://" + host
	}
	return fmt.Sprintf("%s://%s:%d", scheme, host, a.spec.Routing.HTTPPort)
}

// SpecPath is shown in the panel's about card so an operator can find the
// file they need to edit.
func (a *App) SpecPath() string {
	if a.installed() {
		return filepath.Clean(a.layout.SpecFile())
	}
	return a.configPath
}
