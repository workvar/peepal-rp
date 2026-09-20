package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/rpilocal"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/ui"
)

// install is the whole happy path, top to bottom.
func install(ctx context.Context, o Options) {
	banner()
	if rpilocal.Detected() {
		o.RPILocal = true
		ui.Info("Raspberry Pi detected; sign-in will work at http://raspberrypi.local")
	}
	machine := preflight(o)
	a := ask(o, machine)

	layout := paths.New(a.Config.InstallRoot)
	if err := makeDirs(layout); err != nil {
		ui.Fail("Could not create %s: %v", layout.Root, err)
	}
	account, err := sysuser.Ensure(layout.Data)
	if err != nil {
		ui.Warn("Could not create the service account: %v", err)
	} else if account != "" {
		ui.OK("Service account %q ready", account)
		if err := sysuser.Chown(layout.Data, account); err != nil {
			ui.Warn("Could not set ownership of %s: %v", layout.Data, err)
		}
	}

	dbSource := setupDatabase(ctx, layout, &a)
	setupRuntime(ctx, layout)
	installedTags := setupApp(ctx, layout, o)
	if a.Config.AgentToken == "" {
		a.Config.AgentToken = envfile.Secret(32)
	}
	writeEnvironment(layout, &a, machine)
	migrate(ctx, layout)
	setupAI(ctx, layout, &a)

	if err := appconfig.Save(layout.ConfigFile(), a.Config); err != nil {
		ui.Fail("Could not write the configuration: %v", err)
	}
	installedTags.Seeded = true
	saveTags(layout, installedTags)

	installService(layout, a.Config)
	waitForApp(ctx, a.Config)
	summary(layout, a, dbSource)
}

// makeDirs creates the whole tree up front so later steps can assume it.
func makeDirs(l paths.Layout) error {
	for _, d := range []string{l.Root, l.Bin(), l.Apps(), l.Data, l.Logs(), l.Uploads(), l.Staging()} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return err
		}
	}
	// The data directory holds secrets and the database.
	return os.Chmod(l.Data, 0o750)
}

// waitForApp blocks until the agent reports the stack is serving, so the
// installer never claims success before the app answers.
func waitForApp(ctx context.Context, cfg appconfig.Config) {
	ui.Step(8, "Starting Peepal")
	ui.Info("Waiting for the application to answer on port %d...", cfg.HTTPPort)
	deadline := time.Now().Add(5 * time.Minute)
	for time.Now().Before(deadline) {
		if ctx.Err() != nil {
			return
		}
		if serving(cfg.HTTPPort) {
			ui.OK("Peepal is running")
			return
		}
		time.Sleep(3 * time.Second)
	}
	ui.Warn("The application has not answered yet. It may still be starting;")
	ui.Warn("check the log at the path shown below in a few minutes.")
}

// summary prints the handover notes the technician leaves with the customer.
func summary(l paths.Layout, a answers, dbSource string) {
	mgr, _ := serviceManager()
	addr := fmt.Sprintf("http://localhost:%d", a.Config.HTTPPort)
	if a.Config.HTTPPort == 80 {
		addr = "http://localhost"
	}
	lan := ""
	if a.RPILocal {
		lan = fmt.Sprintf("  LAN address    %s\n", rpilocal.PublicURL(a.Config.HTTPPort))
	}
	fmt.Printf(`
%s
  Peepal is installed.

  Address        %s
%s  Sign in as     %s
  Files          %s
  Logs           %s
  Database       PostgreSQL on port %d (%s)
  AI assistant   %s
  Updates        %s
`, divider(), addr, lan, a.AdminEmail, l.Root, l.Logs(),
		a.Config.PostgresPort, dbSource, aiSummary(a), updateSummary(a.Config))
	if mgr != nil {
		fmt.Printf("  Service        %s\n", mgr.Describe())
	}
	fmt.Println(divider())
}

func divider() string { return "  ------------------------------------------------------------" }

func aiSummary(a answers) string {
	if a.Config.AI.Enabled {
		return a.Config.AI.Model + " running locally"
	}
	return "not installed"
}

func updateSummary(c appconfig.Config) string {
	if !c.Updates.Enabled {
		return "manual"
	}
	if c.Updates.WindowStartHour != c.Updates.WindowEndHour {
		return fmt.Sprintf("automatic, between %02d:00 and %02d:00",
			c.Updates.WindowStartHour, c.Updates.WindowEndHour)
	}
	return fmt.Sprintf("automatic, checked every %d minutes", c.Updates.CheckEveryMinutes)
}
