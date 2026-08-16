// Package appstack turns the installed files plus the config into the three
// long-running processes the product needs, and knows how to check that they
// came up.
package appstack

import (
	"context"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/supervisor"
	"github.com/peepal/installer/internal/sysuser"
)

// Process names, also used to stop and start just the app during an update.
const (
	Postgres = "postgres"
	Backend  = "backend"
	Frontend = "frontend"
)

// AppProcesses are the ones an update restarts; the database stays up.
var AppProcesses = []string{Backend, Frontend}

// Stack bundles everything the agent supervises.
type Stack struct {
	Cfg     appconfig.Config
	Layout  paths.Layout
	Cluster pgsql.Cluster
	Group   *supervisor.Group
}

// New wires the supervisor group. The database is added first so it starts
// first and stops last; on Windows it is a separate OS service and is left
// out entirely.
func New(cfg appconfig.Config, layout paths.Layout, cluster pgsql.Cluster) *Stack {
	s := &Stack{Cfg: cfg, Layout: layout, Cluster: cluster, Group: supervisor.NewGroup()}
	if cluster.Install.Managed {
		s.Group.Add(&supervisor.Process{
			Name:  Postgres,
			Build: func(ctx context.Context) *exec.Cmd { return cluster.ServerCommand(ctx) },
		})
	}
	s.Group.Add(&supervisor.Process{Name: Backend, Build: s.backendCmd})
	s.Group.Add(&supervisor.Process{Name: Frontend, Build: s.frontendCmd})
	return s
}

// backendCmd runs the Go server from its own directory, because it serves
// uploads from a relative path.
func (s *Stack) backendCmd(ctx context.Context) *exec.Cmd {
	cmd := exec.CommandContext(ctx, s.Layout.BackendBin())
	cmd.Dir = s.Layout.Backend()
	cmd.Env = s.backendEnv()
	sysuser.Apply(cmd, sysuser.Account())
	return cmd
}

// frontendCmd runs the Next.js standalone server on loopback only; the proxy
// is the only thing that talks to it.
func (s *Stack) frontendCmd(ctx context.Context) *exec.Cmd {
	cmd := exec.CommandContext(ctx, s.Layout.NodeBin(), s.Layout.FrontendEntry())
	cmd.Dir = s.Layout.Frontend()
	cmd.Env = append(os.Environ(),
		"NODE_ENV=production",
		"HOSTNAME=127.0.0.1",
		"PORT="+strconv.Itoa(s.Cfg.FrontendPort),
		// Server-side rewrites need an absolute backend URL. The browser
		// bundle uses relative /api/v1 paths and reaches the backend through
		// the proxy, so this value never leaks into the client.
		"NEXT_PUBLIC_API_URL=http://127.0.0.1:"+strconv.Itoa(s.Cfg.BackendPort),
	)
	sysuser.Apply(cmd, sysuser.Account())
	return cmd
}

// backendEnv merges the persisted .env with the process environment.
func (s *Stack) backendEnv() []string {
	env := os.Environ()
	vars, err := envfile.Read(s.Layout.EnvFile())
	if err != nil {
		return env
	}
	return append(env, vars.Slice()...)
}

// Migrate runs the backend's schema migration and waits for it to finish.
// A normal start deliberately skips AutoMigrate, so this must run after every
// backend upgrade.
func (s *Stack) Migrate(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, s.Layout.BackendBin(), "--migrate")
	cmd.Dir = s.Layout.Backend()
	cmd.Env = s.backendEnv()
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	sysuser.Apply(cmd, sysuser.Account())
	return cmd.Run()
}

// Healthy waits for the backend health endpoint and the frontend port.
func (s *Stack) Healthy(ctx context.Context, within time.Duration) bool {
	deadline := time.Now().Add(within)
	client := &http.Client{Timeout: 5 * time.Second}
	for time.Now().Before(deadline) {
		if s.backendUp(ctx, client) && portOpen(s.Cfg.FrontendPort) {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(2 * time.Second):
		}
	}
	return false
}

func (s *Stack) backendUp(ctx context.Context, c *http.Client) bool {
	url := "http://127.0.0.1:" + strconv.Itoa(s.Cfg.BackendPort) + "/health"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	resp, err := c.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func portOpen(port int) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+strconv.Itoa(port), 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}
