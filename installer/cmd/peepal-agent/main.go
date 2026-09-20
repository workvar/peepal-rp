// Command peepal-agent is the background service installed on the client
// machine. It supervises PostgreSQL, the Go backend and the Next.js frontend,
// serves them all through one port, and installs new releases on its own.
package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/peepal/installer/internal/agentctl"
	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/appstack"
	"github.com/peepal/installer/internal/buildinfo"
	"github.com/peepal/installer/internal/ghrelease"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/proxy"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/updater"
)

func main() {
	configPath := flag.String("config", "", "path to config.json (defaults to the platform location)")
	checkNow := flag.Bool("check-updates", false, "check for updates once and exit")
	showVersion := flag.Bool("version", false, "print the agent version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println(buildinfo.Version)
		return
	}

	cfgPath := *configPath
	if cfgPath == "" {
		cfgPath = paths.Default().ConfigFile()
	}
	cfg, err := appconfig.Load(cfgPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "cannot read %s: %v\n", cfgPath, err)
		os.Exit(1)
	}
	layout := paths.New(cfg.InstallRoot)
	if err := logx.ToFile(filepath.Join(layout.Logs(), "agent.log")); err != nil {
		fmt.Fprintf(os.Stderr, "warning: file logging disabled: %v\n", err)
	}
	logx.Infof("peepal-agent %s starting from %s", buildinfo.Version, layout.Root)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stack, up := build(ctx, cfg, layout)

	if *checkNow {
		applied, err := up.CheckAndApply(ctx)
		if err != nil {
			logx.Errorf("%v", err)
			os.Exit(1)
		}
		logx.Infof("update applied: %t", applied)
		return
	}

	run(ctx, cancel, cfg, stack, up)
}

// build assembles the supervised stack and its updater.
func build(ctx context.Context, cfg appconfig.Config, layout paths.Layout) (*appstack.Stack, *updater.Updater) {
	install, ok := pgsql.Locate(layout.PgRoot())
	if !ok {
		logx.Errorf("PostgreSQL is missing; re-run the installer")
		os.Exit(1)
	}
	cluster := pgsql.Cluster{
		Install:  install,
		DataDir:  layout.PgData(),
		Port:     cfg.PostgresPort,
		SuperPwd: cfg.DBPassword,
		RunAs:    serviceUser(),
	}
	stack := appstack.New(cfg, layout, cluster)

	status := runstate.New(buildinfo.Version)
	state := updater.LoadState(layout.StateFile())
	status.SetVersions(state.BackendTag, state.FrontendTag)

	up := &updater.Updater{
		Cfg:    cfg,
		Layout: layout,
		Client: ghrelease.Client{Token: buildinfo.Token, AllowPrerelease: cfg.Updates.Channel != "stable"},
		Status: status,
		Hooks: updater.Hooks{
			StopApp:  func() { stack.Group.StopApp(appstack.AppProcesses, 30*time.Second) },
			StartApp: func() { stack.Group.StartApp(appstack.AppProcesses) },
			Migrate:  stack.Migrate,
			Healthy:  stack.Healthy,
		},
	}
	statusRef = status
	return stack, up
}

// statusRef is the shared state the proxy reads; kept package-level so both
// build and run can reach it without threading it through every signature.
var statusRef *runstate.State

// run starts everything and blocks until the service is asked to stop.
func run(ctx context.Context, cancel context.CancelFunc, cfg appconfig.Config, stack *appstack.Stack, up *updater.Updater) {
	stack.Group.Start(ctx)

	srv := proxy.New(proxy.Options{
		Listen:       ":" + strconv.Itoa(cfg.HTTPPort),
		BackendPort:  cfg.BackendPort,
		FrontendPort: cfg.FrontendPort,
		State:        statusRef,
	})
	go func() {
		logx.Infof("listening on http://localhost:%d", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logx.Errorf("front-door server failed: %v", err)
			cancel()
		}
	}()

	ctl := agentctl.New(agentctl.Options{
		Token:     cfg.AgentToken,
		Addr:      agentctl.DefaultAddr,
		Updater:   up,
		Status:    statusRef,
		Cfg:       cfg,
		StatePath: up.Layout.StateFile(),
	})
	go func() {
		logx.Infof("control API listening on http://%s", ctl.Addr)
		if err := ctl.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logx.Errorf("control API failed: %v", err)
		}
	}()

	go func() {
		if stack.Healthy(ctx, 5*time.Minute) {
			statusRef.Set(runstate.Running, "Up to date")
			logx.Infof("application is healthy")
			return
		}
		statusRef.Fail("The application did not start", nil)
		logx.Errorf("application did not become healthy within 5 minutes")
	}()

	go up.Run(ctx)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	select {
	case s := <-sig:
		logx.Infof("received %s; shutting down", s)
	case <-ctx.Done():
	}

	shutdown, done := context.WithTimeout(context.Background(), 30*time.Second)
	defer done()
	ctl.Shutdown(shutdown)
	srv.Shutdown(shutdown)
	stack.Group.StopAll(30 * time.Second)
	logx.Infof("stopped")
}
