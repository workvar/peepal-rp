package main

import (
	"context"
	"path/filepath"
	"time"

	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/ui"
)

// setupDatabase provisions PostgreSQL, initialises the cluster and creates
// the application role and database. It returns a label for the summary.
func setupDatabase(ctx context.Context, l paths.Layout, a *answers) string {
	ui.Step(3, "Setting up the database")

	cache := filepath.Join(l.Staging(), "cache")
	install, err := pgsql.Ensure(ctx, l.PgRoot(), l.PgData(), cache,
		a.Config.DBPassword, a.Config.PostgresPort, ui.Info)
	if err != nil {
		ui.Fail("PostgreSQL could not be installed: %v", err)
	}
	ui.OK("PostgreSQL ready (%s)", install.Source)

	cluster := pgsql.Cluster{
		Install:  install,
		DataDir:  l.PgData(),
		Port:     a.Config.PostgresPort,
		SuperPwd: a.Config.DBPassword,
		RunAs:    sysuser.Account(),
	}

	if !install.Managed {
		ui.Info("Using the PostgreSQL already installed on this computer")
		if err := pgsql.EnsureSystemRunning(ctx, install, ui.Info); err != nil {
			ui.Fail("%v", err)
		}
		port, ok := pgsql.ListeningPort(install, 5432, a.Config.PostgresPort, 5433)
		if !ok {
			ui.Fail("PostgreSQL is installed but not accepting connections.")
		}
		a.Config.PostgresPort = port
		cluster.Port = port
		cluster.RunAs = pgsql.DistroOSUser
		cluster.Peer = true
		ui.OK("Reusing PostgreSQL on port %d (not creating a second cluster)", port)
	} else {
		// Portable / Homebrew: we own the data directory and start the server.
		if err := cluster.Init(ctx, ui.Info); err != nil {
			ui.Fail("Could not initialise the database: %v", err)
		}
		if err := startTemporaryServer(ctx, cluster); err != nil {
			ui.Fail("Could not start the database: %v", err)
		}
		defer stopTemporaryServer()
	}

	if !cluster.Ready(ctx, 90*time.Second) {
		ui.Fail("The database did not accept connections on port %d.", a.Config.PostgresPort)
	}
	if err := cluster.EnsureRoleAndDB(ctx, a.Config.DBUser, a.Config.DBPassword, a.Config.DBName); err != nil {
		ui.Fail("Could not create the application database: %v", err)
	}
	ui.OK("Database %q and role %q ready", a.Config.DBName, a.Config.DBUser)
	return install.Source
}
