package main

import (
	"context"
	"path/filepath"
	"strings"
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
	if err := resolveExistingDatabase(ctx, cluster, a); err != nil {
		ui.Fail("Could not prepare the application database: %v", err)
	}
	ui.OK("Database %q and role %q ready", a.Config.DBName, a.Config.DBUser)
	return install.Source
}

const (
	dbKeep = iota
	dbReplace
	dbNew
)

func resolveExistingDatabase(ctx context.Context, cluster pgsql.Cluster, a *answers) error {
	n, err := cluster.UserTableCount(ctx, a.Config.DBName)
	if err != nil {
		return err
	}
	if n == 0 {
		return nil
	}

	ui.Info("Database %q already has %d table(s) from a previous install.", a.Config.DBName, n)
	choice := dbKeep
	if a.Unattended {
		ui.Info("Keeping the existing data (--unattended).")
	} else {
		ui.Info("A leftover schema is the usual reason a retry dies during migration.")
		choice = ui.Choose("What should we do with the existing database?", []string{
			"Use it as it is (keep the data, upgrade the schema)",
			"Delete and replace it (wipe tables, then install a fresh schema)",
			"Leave it as it is and create a new empty database",
		}, dbReplace)
	}

	switch choice {
	case dbReplace:
		if err := cluster.ResetPublicSchema(ctx, a.Config.DBName, a.Config.DBUser); err != nil {
			return err
		}
		ui.OK("Database %q was emptied", a.Config.DBName)
		return nil
	case dbNew:
		return createSiblingDatabase(ctx, cluster, a)
	default:
		if err := cluster.GrantAppOwnership(ctx, a.Config.DBName, a.Config.DBUser); err != nil {
			return err
		}
		ui.OK("Keeping existing database %q", a.Config.DBName)
		return nil
	}
}

func createSiblingDatabase(ctx context.Context, cluster pgsql.Cluster, a *answers) error {
	old := a.Config.DBName
	for {
		name := strings.ToLower(ui.Ask("Name for the new database", pgsql.SuggestNextDBName(old)))
		if !pgsql.ValidDBName(name) {
			ui.Warn("Use lowercase letters, digits and underscores, starting with a letter.")
			continue
		}
		if name == old {
			ui.Warn("That is the existing database. Pick a different name.")
			continue
		}
		if err := cluster.CreateAppDatabase(ctx, name, a.Config.DBUser); err != nil {
			return err
		}
		n, err := cluster.UserTableCount(ctx, name)
		if err != nil {
			return err
		}
		if n > 0 {
			ui.Warn("Database %q already has %d table(s). Pick a different name.", name, n)
			continue
		}
		a.Config.DBName = name
		ui.OK("New database %q created; %q was left untouched", name, old)
		return nil
	}
}
