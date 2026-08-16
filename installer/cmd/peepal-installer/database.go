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

	// The Windows vendor installer initialises its own cluster and registers
	// a service; everywhere else we run initdb and start the server ourselves.
	if install.Managed {
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
