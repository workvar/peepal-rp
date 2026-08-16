package control

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/remote"
)

// handlers wires the remote executor to this controller. Everything the hub
// can do, the operator can also do from the panel; there is no hidden
// capability.
func (c *Controller) handlers() remote.Handlers {
	return remote.Handlers{
		Restart: c.RestartService,
		Stop:    c.Stop,
		Start:   func(ctx context.Context) error { return c.Start(ctx) },
		Status: func(ctx context.Context) (string, error) {
			b, err := json.MarshalIndent(c.Metrics(ctx), "", "  ")
			return string(b), err
		},
		Logs:    func(lines int) (string, error) { return c.Logs(lines) },
		Update:  c.ApplyUpdate,
		Rebuild: c.Rebuild,
		Env:     c.RedactedEnv,
		Info:    c.Info,
	}
}

// RedactedEnv returns every service's environment with secret values masked,
// which is enough to diagnose "the wrong URL is configured" without shipping
// the customer's JWT signing key to the developer.
func (c *Controller) RedactedEnv() (string, error) {
	var sb strings.Builder
	for _, sv := range c.Spec.Services {
		vars, err := envfile.Read(c.Layout.EnvFile(sv.Name))
		if err != nil {
			continue
		}
		fmt.Fprintf(&sb, "[%s]\n", sv.Name)
		for _, line := range vars.Slice() {
			k, v, _ := strings.Cut(line, "=")
			if secretKey(k) {
				v = mask(v)
			}
			fmt.Fprintf(&sb, "%s=%s\n", k, v)
		}
		sb.WriteString("\n")
	}
	return sb.String(), nil
}

// Info is the one-screen summary a developer asks for first.
func (c *Controller) Info() (string, error) {
	info := map[string]any{
		"app":            c.Spec.App.Name,
		"panel_version":  c.Version,
		"install_root":   c.Layout.Root,
		"data":           c.Layout.Data,
		"routing":        c.Spec.Routing,
		"running":        c.Running(),
		"uptime_seconds": int64(c.Uptime().Seconds()),
		"state":          c.State.Get(),
		"telemetry":      c.Hub.Stats(),
	}
	b, err := json.MarshalIndent(info, "", "  ")
	return string(b), err
}

func secretKey(k string) bool {
	u := strings.ToUpper(k)
	for _, needle := range []string{"SECRET", "PASSWORD", "TOKEN", "KEY", "DSN", "DATABASE_URL", "URI"} {
		if strings.Contains(u, needle) {
			return true
		}
	}
	return false
}

// mask keeps the first two characters so an operator can still tell two
// different values apart.
func mask(v string) string {
	if len(v) <= 2 {
		return "****"
	}
	return v[:2] + strings.Repeat("*", 8)
}
