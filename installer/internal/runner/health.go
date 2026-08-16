package runner

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	"strconv"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/builder"
	"github.com/peepal/installer/internal/cmdline"
	"github.com/peepal/installer/internal/sysuser"
)

// Health is one service's answer to "are you up".
type Health struct {
	Service string `json:"service"`
	Port    int    `json:"port"`
	Running bool   `json:"running"`
	Healthy bool   `json:"healthy"`
	Detail  string `json:"detail"`
}

// Check probes every service once.
func (r *Runner) Check(ctx context.Context) []Health {
	client := &http.Client{Timeout: 4 * time.Second}
	out := make([]Health, 0, len(r.Spec.Services))
	for _, sv := range r.Spec.Services {
		h := Health{Service: sv.Name, Port: sv.Port}
		if p := r.Group.Get(sv.Name); p != nil {
			h.Running = p.Running()
		}
		switch {
		case sv.Health != "":
			h.Healthy = httpOK(ctx, client, sv.Port, sv.Health)
			h.Detail = fmt.Sprintf("GET :%d%s", sv.Port, sv.Health)
		case sv.Port > 0:
			h.Healthy = portOpen(sv.Port)
			h.Detail = fmt.Sprintf("TCP :%d", sv.Port)
		default:
			h.Healthy = h.Running
			h.Detail = "process"
		}
		out = append(out, h)
	}
	return out
}

// Healthy waits for every non-optional service to answer.
func (r *Runner) Healthy(ctx context.Context, within time.Duration) bool {
	deadline := time.Now().Add(within)
	for time.Now().Before(deadline) {
		if r.allUp(ctx) {
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

func (r *Runner) allUp(ctx context.Context) bool {
	checks := r.Check(ctx)
	for i, sv := range r.Spec.Services {
		if sv.Optional {
			continue
		}
		if !checks[i].Healthy {
			return false
		}
	}
	return true
}

// Migrate runs each service's migrate command in order. It is called after
// every update, before the services come back up.
func (r *Runner) Migrate(ctx context.Context) error {
	for _, sv := range r.Spec.Services {
		if sv.Migrate == "" {
			continue
		}
		line, err := appdef.Expand(sv.Migrate, r.Vars)
		if err != nil {
			return err
		}
		argv, err := cmdline.Split(line)
		if err != nil {
			argv = cmdline.Shell(line)
		}
		cmd := exec.CommandContext(ctx, resolve(argv[0], r.PathEntries), argv[1:]...)
		cmd.Dir = r.workDir(sv)
		cmd.Env = builder.Environment(r.PathEntries, r.environment(sv))
		sysuser.Apply(cmd, r.Spec.App.ServiceUser)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("%s migration failed: %w\n%s", sv.Name, err, out)
		}
	}
	return nil
}

func httpOK(ctx context.Context, c *http.Client, port int, path string) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"http://127.0.0.1:"+strconv.Itoa(port)+path, nil)
	if err != nil {
		return false
	}
	resp, err := c.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}

func portOpen(port int) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+strconv.Itoa(port), 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}
