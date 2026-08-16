// Package dbsetup resolves the one question every install has to answer:
// where does the data live. Either the panel provisions a local PostgreSQL
// cluster it owns, or the operator supplies a connection URI for a cloud
// instance and the panel supervises nothing.
package dbsetup

import (
	"context"
	"fmt"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/workspace"
)

// Mode is the operator's choice.
type Mode string

const (
	// Local means the panel installs, initialises and supervises PostgreSQL.
	Local Mode = "local"
	// Cloud means an external server; the panel only stores the URI.
	Cloud Mode = "cloud"
	// None is for definitions that need no database at all.
	None Mode = "none"
)

// Choice is what the wizard collects.
type Choice struct {
	Mode Mode `json:"mode"`
	// URI is required for Cloud.
	URI string `json:"uri"`
	// Name, User and Password apply to Local. An empty password is generated.
	Name     string `json:"name"`
	User     string `json:"user"`
	Password string `json:"password"`
	Port     int    `json:"port"`
}

// Result is the resolved database, ready to be written into the environment.
type Result struct {
	Mode Mode   `json:"mode"`
	URL  string `json:"url"`
	// Cluster is set for Local installs so the agent can supervise the server.
	Cluster pgsql.Cluster `json:"-"`
	// Managed is true when the agent must start and stop the server itself.
	Managed bool   `json:"managed"`
	Source  string `json:"source"`
}

// Logf reports progress.
type Logf func(string, ...any)

// Prepare applies a choice, provisioning PostgreSQL when asked to.
func Prepare(ctx context.Context, spec appdef.Spec, l workspace.Layout, c Choice, serviceUser string, log Logf) (Result, error) {
	if !spec.NeedsDatabase() || c.Mode == None {
		return Result{Mode: None}, nil
	}
	if c.Mode == Cloud {
		if err := ValidateURI(c.URI); err != nil {
			return Result{}, err
		}
		log("Using the external database at %s", Redact(c.URI))
		return Result{Mode: Cloud, URL: c.URI, Source: "cloud"}, nil
	}
	return prepareLocal(ctx, spec, l, c, serviceUser, log)
}

func prepareLocal(ctx context.Context, spec appdef.Spec, l workspace.Layout, c Choice, serviceUser string, log Logf) (Result, error) {
	if c.Name == "" {
		c.Name = spec.Database.Name
	}
	if c.User == "" {
		c.User = spec.Database.User
	}
	if c.Port == 0 {
		c.Port = spec.Database.Port
	}
	if c.Password == "" {
		c.Password = envfile.Secret(18)
	}

	install, err := pgsql.Ensure(ctx, l.PgRoot(), l.PgData(), l.Cache(), c.Password, c.Port,
		pgsql.Logf(log))
	if err != nil {
		return Result{}, fmt.Errorf("PostgreSQL could not be installed: %w", err)
	}
	cluster := pgsql.Cluster{
		Install:  install,
		DataDir:  l.PgData(),
		Port:     c.Port,
		SuperPwd: c.Password,
		RunAs:    serviceUser,
	}
	if install.Managed {
		if err := cluster.Init(ctx, pgsql.Logf(log)); err != nil {
			return Result{}, err
		}
		if err := startTemporarily(ctx, cluster, log); err != nil {
			return Result{}, err
		}
	}
	if !cluster.Ready(ctx, 60*time.Second) {
		return Result{}, fmt.Errorf("the database did not accept connections within a minute")
	}
	log("Creating the %s role and database...", c.User)
	if err := cluster.EnsureRoleAndDB(ctx, c.User, c.Password, c.Name); err != nil {
		return Result{}, err
	}
	return Result{
		Mode:    Local,
		URL:     DSN(c.User, c.Password, "127.0.0.1", c.Port, c.Name),
		Cluster: cluster,
		Managed: install.Managed,
		Source:  install.Source,
	}, nil
}

// DSN renders a PostgreSQL connection string in the form the backend reads.
func DSN(user, password, host string, port int, name string) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable",
		user, password, host, port, name)
}
