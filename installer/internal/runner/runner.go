// Package runner turns the services a definition lists into supervised
// processes. It is the generic replacement for appstack: instead of knowing
// about a Go backend and a Next.js frontend, it knows about "a command, a
// directory, a port and a health path".
package runner

import (
	"context"
	"os/exec"
	"strconv"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/builder"
	"github.com/peepal/installer/internal/cmdline"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/supervisor"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/workspace"
)

// DatabaseProcess is the reserved name of the supervised PostgreSQL server.
const DatabaseProcess = "database"

// Runner owns the process group for one installation.
type Runner struct {
	Spec   appdef.Spec
	Layout workspace.Layout
	Vars   appdef.Vars
	// Cluster is set when the panel provisioned a local database it must run.
	Cluster *pgsql.Cluster
	// PathEntries put the private Go and Node ahead of the system ones.
	PathEntries []string

	Group *supervisor.Group
}

// New wires the group. The database goes in first so it starts first and
// stops last; the services follow in definition order.
func New(r *Runner) *Runner {
	r.Group = supervisor.NewGroup()
	if r.Cluster != nil {
		c := *r.Cluster
		r.Group.Add(&supervisor.Process{
			Name:  DatabaseProcess,
			Build: func(ctx context.Context) *exec.Cmd { return c.ServerCommand(ctx) },
		})
	}
	for _, sv := range r.Spec.Services {
		svc := sv
		r.Group.Add(&supervisor.Process{
			Name:     svc.Name,
			Optional: svc.Optional,
			Build:    func(ctx context.Context) *exec.Cmd { return r.command(ctx, svc, svc.Run) },
		})
	}
	return r
}

// AppProcesses are the names an update restarts; the database stays up.
func (r *Runner) AppProcesses() []string {
	out := make([]string, 0, len(r.Spec.Services))
	for _, sv := range r.Spec.Services {
		out = append(out, sv.Name)
	}
	return out
}

// command builds one child process: the service's own directory, its
// environment file, its port and the panel's PATH.
func (r *Runner) command(ctx context.Context, sv appdef.Service, line string) *exec.Cmd {
	expanded, err := appdef.Expand(line, r.Vars)
	if err != nil {
		expanded = line
	}
	argv, err := cmdline.Split(expanded)
	if err != nil || len(argv) == 0 {
		argv = cmdline.Shell(expanded)
	}
	cmd := exec.CommandContext(ctx, resolve(argv[0], r.PathEntries), argv[1:]...)
	cmd.Dir = r.workDir(sv)
	cmd.Env = builder.Environment(r.PathEntries, r.environment(sv))
	sysuser.Apply(cmd, r.Spec.App.ServiceUser)
	return cmd
}

func (r *Runner) workDir(sv appdef.Service) string {
	repo, ok := r.Spec.Repo(sv.Repo)
	if !ok {
		return r.Layout.Src()
	}
	return r.Layout.WorkDir(repo, sv.Dir)
}

// environment merges the persisted env file with the service's own additions
// and its port.
func (r *Runner) environment(sv appdef.Service) map[string]string {
	out := map[string]string{}
	if vars, err := envfile.Read(r.Layout.EnvFile(sv.Name)); err == nil {
		for k, v := range vars {
			out[k] = v
		}
	}
	if extra, err := appdef.ExpandMap(sv.Env, r.Vars); err == nil {
		for k, v := range extra {
			out[k] = v
		}
	}
	if sv.Port > 0 {
		key := sv.PortVar
		if key == "" {
			key = "PORT"
		}
		out[key] = strconv.Itoa(sv.Port)
		out["HOST"] = "127.0.0.1"
		out["HOSTNAME"] = "127.0.0.1"
	}
	return out
}
